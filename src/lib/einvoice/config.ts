/** URL mặc định theo tài liệu M-Invoice / MobiFone Invoice (subdomain theo MST). */

export const MOBIFONE_TEST_DEFAULT_BASE = "https://hoadon.minvoice.com.vn";

export function normalizeMobifoneBaseUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

export function mobifoneTaxSubdomain(taxCode: string): string {
  return taxCode.replace(/\D/g, "");
}

export function resolveMobifoneBaseUrl(opts: {
  testMode: boolean;
  taxCode: string;
  profileBaseUrl?: string;
}): string {
  const fromProfile = normalizeMobifoneBaseUrl(opts.profileBaseUrl ?? "");
  if (fromProfile) return fromProfile;

  const fromEnv = normalizeMobifoneBaseUrl(
    opts.testMode
      ? process.env.MOBIFONE_INVOICE_TEST_BASE_URL ||
          process.env.MOBIFONE_INVOICE_BASE_URL ||
          ""
      : process.env.MOBIFONE_INVOICE_BASE_URL || ""
  );
  if (fromEnv) return fromEnv;

  const mst = mobifoneTaxSubdomain(opts.taxCode);
  if (opts.testMode) return MOBIFONE_TEST_DEFAULT_BASE;
  if (mst) return `https://${mst}.minvoice.com.vn`;
  return "";
}

export function isMobifoneSimulatedMode(): boolean {
  return process.env.MOBIFONE_INVOICE_FORCE_SIMULATE === "1";
}

export function mobifoneApiMissingMessage(): string {
  return (
    "Chưa xác định URL API MobiFone. Nhập URL do MobiFone cấp trong Cấu hình, " +
    "hoặc đặt MOBIFONE_INVOICE_BASE_URL trên server (mặc định: https://{MST}.minvoice.com.vn)."
  );
}
