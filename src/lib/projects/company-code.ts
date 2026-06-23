import { normalizeTaxCode } from "@/lib/company-verify/tax-code";

/** Mã ngắn dùng trong URL — ưu tiên MST (duy nhất), fallback slug cũ. */
export function companyPublicCode(c: { taxCode?: string; code: string }): string {
  const mst = normalizeTaxCode(c.taxCode ?? "");
  if (mst.length >= 10) return mst;
  return c.code;
}

export function companyWorkspacePath(c: { taxCode?: string; code: string }): string {
  return `/erp/c/${companyPublicCode(c)}`;
}
