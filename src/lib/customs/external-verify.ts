import type { ImportDeclaration, ImportDeclarationPreflightCheck } from "./types";

interface VerifyResponse {
  matched?: boolean;
  exists?: boolean;
  message?: string;
}

function getTimeoutMs(): number {
  const n = Number(process.env.CUSTOMS_EXTERNAL_VERIFY_TIMEOUT_MS ?? 12000);
  return Number.isFinite(n) && n > 1000 ? n : 12000;
}

function buildUrl(baseUrl: string, params: Record<string, string>): string {
  const url = new URL(baseUrl);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  return url.toString();
}

function asMatched(payload: unknown): { matched: boolean | null; message: string } {
  if (payload && typeof payload === "object") {
    const p = payload as VerifyResponse;
    if (typeof p.matched === "boolean") {
      return { matched: p.matched, message: p.message || "" };
    }
    if (typeof p.exists === "boolean") {
      return { matched: p.exists, message: p.message || "" };
    }
  }
  return {
    matched: null,
    message: "Nguồn ngoài phản hồi nhưng chưa có field matched/exists chuẩn.",
  };
}

async function callVerifier(
  baseUrl: string,
  params: Record<string, string>
): Promise<{ ok: boolean; status: number; matched: boolean | null; message: string }> {
  const token = process.env.CUSTOMS_EXTERNAL_VERIFY_TOKEN?.trim();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(buildUrl(baseUrl, params), {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(getTimeoutMs()),
    cache: "no-store",
  });
  const text = await res.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  const parsed = asMatched(payload);
  return {
    ok: res.ok,
    status: res.status,
    matched: parsed.matched,
    message: parsed.message || text.slice(0, 220),
  };
}

export async function verifyExternalReferences(
  decl: ImportDeclaration
): Promise<ImportDeclarationPreflightCheck[]> {
  const checks: ImportDeclarationPreflightCheck[] = [];
  const invoiceVerifierUrl = process.env.CUSTOMS_INVOICE_VERIFY_URL?.trim() || "";
  const bolVerifierUrl = process.env.CUSTOMS_BOL_VERIFY_URL?.trim() || "";

  if (!invoiceVerifierUrl) {
    checks.push({
      code: "INVOICE_VERIFY_NOT_CONFIGURED",
      field: "invoiceNo",
      severity: "info",
      message: "Chưa cấu CUSTOMS_INVOICE_VERIFY_URL, bỏ qua đối soát hóa đơn ngoài hệ thống.",
    });
  } else if (!decl.invoiceNo?.trim()) {
    checks.push({
      code: "INVOICE_MISSING_FOR_VERIFY",
      field: "invoiceNo",
      severity: "warning",
      message: "Thiếu số hóa đơn nên chưa đối soát được với nguồn ngoài.",
    });
  } else {
    try {
      const r = await callVerifier(invoiceVerifierUrl, {
        invoiceNo: decl.invoiceNo.trim(),
        importerTaxCode: decl.importerTaxCode.trim(),
        invoiceDate: decl.invoiceDate ?? "",
      });
      if (!r.ok) {
        checks.push({
          code: "INVOICE_VERIFY_HTTP_ERROR",
          field: "invoiceNo",
          severity: "warning",
          message: `Nguồn đối soát hóa đơn trả lỗi HTTP ${r.status}.`,
          detail: r.message || "Không có chi tiết",
        });
      } else if (r.matched === false) {
        checks.push({
          code: "INVOICE_NOT_MATCHED",
          field: "invoiceNo",
          severity: "error",
          message: `Không tìm thấy/không khớp hóa đơn ${decl.invoiceNo} ở nguồn ngoài.`,
          detail: r.message || "Kiểm tra lại số hóa đơn, MST và ngày hóa đơn.",
        });
      } else if (r.matched === true) {
        checks.push({
          code: "INVOICE_MATCHED",
          field: "invoiceNo",
          severity: "info",
          message: `Đã xác minh hóa đơn ${decl.invoiceNo} từ nguồn ngoài.`,
          detail: r.message || "Kết quả khớp.",
        });
      } else {
        checks.push({
          code: "INVOICE_VERIFY_UNKNOWN_SCHEMA",
          field: "invoiceNo",
          severity: "warning",
          message: "Nguồn đối soát hóa đơn chưa trả cấu trúc matched/exists chuẩn.",
          detail: r.message,
        });
      }
    } catch (e) {
      checks.push({
        code: "INVOICE_VERIFY_EXCEPTION",
        field: "invoiceNo",
        severity: "warning",
        message: "Không kết nối được nguồn đối soát hóa đơn.",
        detail: e instanceof Error ? e.message : "Lỗi không xác định",
      });
    }
  }

  if (!bolVerifierUrl) {
    checks.push({
      code: "BOL_VERIFY_NOT_CONFIGURED",
      field: "billOfLadingNo",
      severity: "info",
      message: "Chưa cấu CUSTOMS_BOL_VERIFY_URL, bỏ qua đối soát vận đơn ngoài hệ thống.",
    });
  } else if (!decl.billOfLadingNo?.trim()) {
    checks.push({
      code: "BOL_MISSING_FOR_VERIFY",
      field: "billOfLadingNo",
      severity: "warning",
      message: "Thiếu số vận đơn nên chưa đối soát được với nguồn ngoài.",
    });
  } else {
    try {
      const r = await callVerifier(bolVerifierUrl, {
        billOfLadingNo: decl.billOfLadingNo.trim(),
        importerTaxCode: decl.importerTaxCode.trim(),
      });
      if (!r.ok) {
        checks.push({
          code: "BOL_VERIFY_HTTP_ERROR",
          field: "billOfLadingNo",
          severity: "warning",
          message: `Nguồn đối soát vận đơn trả lỗi HTTP ${r.status}.`,
          detail: r.message || "Không có chi tiết",
        });
      } else if (r.matched === false) {
        checks.push({
          code: "BOL_NOT_MATCHED",
          field: "billOfLadingNo",
          severity: "error",
          message: `Không tìm thấy/không khớp vận đơn ${decl.billOfLadingNo} ở nguồn ngoài.`,
          detail: r.message || "Kiểm tra lại số vận đơn.",
        });
      } else if (r.matched === true) {
        checks.push({
          code: "BOL_MATCHED",
          field: "billOfLadingNo",
          severity: "info",
          message: `Đã xác minh vận đơn ${decl.billOfLadingNo} từ nguồn ngoài.`,
          detail: r.message || "Kết quả khớp.",
        });
      } else {
        checks.push({
          code: "BOL_VERIFY_UNKNOWN_SCHEMA",
          field: "billOfLadingNo",
          severity: "warning",
          message: "Nguồn đối soát vận đơn chưa trả cấu trúc matched/exists chuẩn.",
          detail: r.message,
        });
      }
    } catch (e) {
      checks.push({
        code: "BOL_VERIFY_EXCEPTION",
        field: "billOfLadingNo",
        severity: "warning",
        message: "Không kết nối được nguồn đối soát vận đơn.",
        detail: e instanceof Error ? e.message : "Lỗi không xác định",
      });
    }
  }

  return checks;
}
