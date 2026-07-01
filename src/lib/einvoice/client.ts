import {
  isMobifoneSimulatedMode,
  mobifoneApiMissingMessage,
  normalizeMobifoneBaseUrl,
  resolveMobifoneBaseUrl,
} from "./config";
import type { MobifoneInvoiceRaw, MobifoneLoginResult } from "./types";

export interface MobifoneClientConfig {
  baseUrl: string;
  username: string;
  password: string;
  taxCode: string;
  maDvcs?: string;
  token?: string;
}

export function getMobifoneBaseUrl(
  testMode: boolean,
  taxCode: string,
  profileBaseUrl?: string
): string {
  return resolveMobifoneBaseUrl({ testMode, taxCode, profileBaseUrl });
}

function authHeader(token: string, maDvcs: string): string {
  return `Bear ${token};${maDvcs}`;
}

function apiErrorFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    const err = o.error ?? o.message ?? o.Message;
    if (err != null && String(err).trim()) return String(err).trim();
  }
  return fallback;
}

function extractInvoiceList(body: unknown): MobifoneInvoiceRaw[] {
  if (Array.isArray(body)) return body as MobifoneInvoiceRaw[];
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as MobifoneInvoiceRaw[];
    if (Array.isArray(o.items)) return o.items as MobifoneInvoiceRaw[];
    const err = apiErrorFromBody(body, "");
    if (err) throw new Error(err);
  }
  return [];
}

async function mobifoneFetch(
  url: string,
  init: RequestInit & { taxCode?: string } = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  let finalUrl = url;
  if (init.taxCode && init.method !== "POST") {
    const sep = finalUrl.includes("?") ? "&" : "?";
    finalUrl += `${sep}tax_code=${encodeURIComponent(init.taxCode)}`;
  }
  return fetch(finalUrl, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(60000),
  });
}

export async function mobifoneLogin(
  config: MobifoneClientConfig
): Promise<{ ok: true; data: MobifoneLoginResult } | { ok: false; message: string }> {
  if (!config.username?.trim() || !config.password) {
    return { ok: false, message: "Thiếu tài khoản hoặc mật khẩu MobiFone." };
  }
  if (!config.taxCode?.trim()) {
    return { ok: false, message: "Công ty chưa có mã số thuế — cập nhật hồ sơ công ty trước." };
  }
  if (!config.baseUrl) {
    return { ok: false, message: mobifoneApiMissingMessage() };
  }

  if (isMobifoneSimulatedMode()) {
    return {
      ok: true,
      data: {
        token: "simulated-token",
        maDvcs: config.maDvcs?.trim() || "VP",
        wbUserId: "simulated-user",
      },
    };
  }

  try {
    const res = await mobifoneFetch(
      `${normalizeMobifoneBaseUrl(config.baseUrl)}/api/Account/Login`,
      {
        method: "POST",
        body: JSON.stringify({
          username: config.username.trim(),
          password: config.password,
          tax_code: config.taxCode.trim(),
        }),
        signal: AbortSignal.timeout(30000),
      }
    );
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || body.error) {
      return { ok: false, message: apiErrorFromBody(body, `HTTP ${res.status}`) };
    }
    const token = String(body.token ?? "");
    const maDvcs = String(body.ma_dvcs ?? "");
    if (!token || !maDvcs) {
      return { ok: false, message: "Đăng nhập thành công nhưng thiếu token hoặc mã đơn vị." };
    }
    return {
      ok: true,
      data: {
        token,
        maDvcs,
        wbUserId: body.wb_user_id ? String(body.wb_user_id) : undefined,
      },
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Không kết nối được MobiFone Invoice",
    };
  }
}

export async function mobifoneListInvoices(
  config: MobifoneClientConfig & { token: string; maDvcs: string },
  fromDate: string,
  toDate: string
): Promise<{ ok: true; items: MobifoneInvoiceRaw[] } | { ok: false; message: string }> {
  if (!config.baseUrl) {
    return { ok: false, message: mobifoneApiMissingMessage() };
  }

  if (isMobifoneSimulatedMode()) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      ok: true,
      items: [
        {
          hdon_id: `sim-${Date.now()}`,
          khieu: "1C26TYY",
          shdon: "1",
          tdlap: `${today}T10:00:00`,
          ten: "Khách hàng mô phỏng",
          mst: "0312345678",
          tgtcthue: 10_000_000,
          tgtthue: 1_000_000,
          tgtttbso: 11_000_000,
          dvtte: "VND",
          tthai: "CQT đã nhận",
          mccqthue: "SIM123456",
        },
      ],
    };
  }

  const base = normalizeMobifoneBaseUrl(config.baseUrl);
  const headers = {
    "Content-Type": "application/json",
    Authorization: authHeader(config.token, config.maDvcs),
  };
  const payload = JSON.stringify({ tu_ngay: fromDate, den_ngay: toDate });

  try {
    const byUnit = await mobifoneFetch(`${base}/api/Invoice68/GetInvoiceByTimeAndUnit`, {
      method: "POST",
      headers,
      body: payload,
      taxCode: config.taxCode,
    });
    const unitBody = await byUnit.json().catch(() => null);
    if (byUnit.ok) {
      const items = extractInvoiceList(unitBody);
      if (items.length > 0) return { ok: true, items };
    }

    const res = await mobifoneFetch(`${base}/api/Invoice68/GetInvoiceFromdateTodate`, {
      method: "POST",
      headers,
      body: payload,
      taxCode: config.taxCode,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, message: apiErrorFromBody(body, `HTTP ${res.status}`) };
    }
    return { ok: true, items: extractInvoiceList(body) };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Không lấy được danh sách hóa đơn",
    };
  }
}

export async function mobifoneGetInvoiceById(
  config: MobifoneClientConfig & { token: string; maDvcs: string },
  invoiceId: string
): Promise<{ ok: true; invoice: MobifoneInvoiceRaw } | { ok: false; message: string }> {
  if (!config.baseUrl) return { ok: false, message: mobifoneApiMissingMessage() };

  if (isMobifoneSimulatedMode()) {
    return {
      ok: true,
      invoice: {
        hdon_id: invoiceId,
        khieu: "1C26TYY",
        shdon: "1",
        tdlap: new Date().toISOString(),
        ten: "Khách hàng mô phỏng",
        mst: "0312345678",
        tgtcthue: 10_000_000,
        tgtthue: 1_000_000,
        tgtttbso: 11_000_000,
        dvtte: "VND",
        tthai: "CQT đã nhận",
      },
    };
  }

  try {
    const url = `${normalizeMobifoneBaseUrl(config.baseUrl)}/api/Invoice68/GetById?id=${encodeURIComponent(invoiceId)}`;
    const res = await mobifoneFetch(url, {
      method: "GET",
      headers: { Authorization: authHeader(config.token, config.maDvcs) },
      taxCode: config.taxCode,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, message: apiErrorFromBody(body, `HTTP ${res.status}`) };
    }
    if (!body || typeof body !== "object") {
      return { ok: false, message: "Không có dữ liệu hóa đơn." };
    }
    const invoice = body as MobifoneInvoiceRaw;
    if (!invoice.hdon_id) invoice.hdon_id = invoiceId;
    return { ok: true, invoice };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Không tải được chi tiết hóa đơn",
    };
  }
}

export async function mobifoneDownloadInvoicePdf(
  config: MobifoneClientConfig & { token: string; maDvcs: string },
  invoiceId: string
): Promise<{ ok: true; data: ArrayBuffer; contentType: string } | { ok: false; message: string }> {
  if (!config.baseUrl) return { ok: false, message: mobifoneApiMissingMessage() };

  try {
    const url =
      `${normalizeMobifoneBaseUrl(config.baseUrl)}/api/Invoice68/inHoadon` +
      `?id=${encodeURIComponent(invoiceId)}&type=PDF&inchuyendoi=false` +
      `&tax_code=${encodeURIComponent(config.taxCode)}`;
    const res = await mobifoneFetch(url, {
      method: "GET",
      headers: { Authorization: authHeader(config.token, config.maDvcs) },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, message: text || `HTTP ${res.status}` };
    }
    const contentType = res.headers.get("content-type") || "application/pdf";
    const data = await res.arrayBuffer();
    return { ok: true, data, contentType };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Không tải được PDF",
    };
  }
}

export async function testMobifoneConnection(
  config: MobifoneClientConfig
): Promise<{
  ok: boolean;
  message: string;
  maDvcs?: string;
  simulated?: boolean;
  baseUrl?: string;
}> {
  if (!config.baseUrl && !isMobifoneSimulatedMode()) {
    return { ok: false, message: mobifoneApiMissingMessage() };
  }

  const login = await mobifoneLogin(config);
  if (!login.ok) return { ok: false, message: login.message, baseUrl: config.baseUrl };

  if (isMobifoneSimulatedMode()) {
    return {
      ok: true,
      message: "Chế độ mô phỏng (MOBIFONE_INVOICE_FORCE_SIMULATE=1).",
      maDvcs: login.data.maDvcs,
      simulated: true,
      baseUrl: config.baseUrl,
    };
  }

  return {
    ok: true,
    message: `Kết nối MobiFone thành công — đơn vị ${login.data.maDvcs}.`,
    maDvcs: login.data.maDvcs,
    baseUrl: config.baseUrl,
  };
}
