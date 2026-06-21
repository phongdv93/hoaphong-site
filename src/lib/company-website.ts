import type { Company } from "@/lib/projects/types";

/** Chuẩn hóa URL website công ty (http/https). */
export function normalizeWebsiteUrl(url: string | null | undefined): string | null {
  const raw = url?.trim() ?? "";
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

/** URL website công khai — chỉ khi admin đã liên kết. */
export function resolveCompanyPublicWebsiteUrl(
  company: Pick<Company, "websiteUrl">
): string | null {
  return normalizeWebsiteUrl(company.websiteUrl);
}
