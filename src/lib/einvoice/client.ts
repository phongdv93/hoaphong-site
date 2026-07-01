import type { MobifoneInvoiceRaw, MobifoneLoginResult } from "./types";

export interface MobifoneClientConfig {
  baseUrl: string;
  username: string;
  password: string;
  taxCode: string;
  maDvcs?: string;
  token?: string;
}

export function getMobifoneBaseUrl(testMode: boolean): string {
  if (testMode) {
    return (
      process.env.MOBIFONE_INVOICE_TEST_BASE_URL ||
      process.env.MOBIFONE_INVOICE_BASE_URL ||
      ""
    ).trim();
  }
  return (process.env.MOBIFONE_INVOICE_BASE_URL || "").trim();
}

export function isMobifoneSimulatedMode(config: MobifoneClientConfig): boolean {
  if (process.env.MOBIFONE_INVOICE_FORCE_SIMULATE === "1") return true;
  if (!config.baseUrl) return true;
  return false;
}

function authHeader(token: string, maDvcs: string): string {
  return `Bear ${token};${maDvcs}`;
}

function normalizeBase(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
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
  if (isMobifoneSimulatedMode(config)) {
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
    const res = await fetch(`${normalizeBase(config.baseUrl)}/api/Account/Login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: config.username.trim(),
        password: config.password,
        tax_code: config.taxCode.trim(),
      }),
      signal: AbortSignal.timeout(30000),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const err = String(body.error ?? body.message ?? `HTTP ${res.status}`);
      return { ok: false, message: err };
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
  if (isMobifoneSimulatedMode(config)) {
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

  try {
    const res = await fetch(
      `${normalizeBase(config.baseUrl)}/api/Invoice68/GetInvoiceFromdateTodate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader(config.token, config.maDvcs),
        },
        body: JSON.stringify({ tu_ngay: fromDate, den_ngay: toDate }),
        signal: AbortSignal.timeout(60000),
      }
    );
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const err =
        typeof body === "object" && body && "error" in body
          ? String((body as { error: unknown }).error)
          : `HTTP ${res.status}`;
      return { ok: false, message: err };
    }
    const items = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
    return { ok: true, items: items as MobifoneInvoiceRaw[] };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Không lấy được danh sách hóa đơn",
    };
  }
}

export async function testMobifoneConnection(
  config: MobifoneClientConfig
): Promise<{ ok: boolean; message: string; maDvcs?: string; simulated?: boolean }> {
  const login = await mobifoneLogin(config);
  if (!login.ok) return { ok: false, message: login.message };
  if (isMobifoneSimulatedMode(config)) {
    return {
      ok: true,
      message:
        "Chế độ mô phỏng (chưa cấu MOBIFONE_INVOICE_BASE_URL). Tài khoản sẽ được lưu.",
      maDvcs: login.data.maDvcs,
      simulated: true,
    };
  }
  return {
    ok: true,
    message: `Kết nối MobiFone thành công — đơn vị ${login.data.maDvcs}.`,
    maDvcs: login.data.maDvcs,
  };
}
