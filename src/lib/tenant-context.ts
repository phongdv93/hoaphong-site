import { cookies, headers } from "next/headers";
import { getCompanyBySubdomain } from "@/lib/projects/companies";
import type { Company } from "@/lib/projects/types";
import { getCompanyCodeFromHost, TENANT_CODE_COOKIE } from "@/lib/tenant-host";

/** Công ty gắn với subdomain hoặc cookie tenant (server component / route handler) */
export async function resolveTenantCompany(): Promise<Company | null> {
  const c = await cookies();
  const codeFromCookie = c.get(TENANT_CODE_COOKIE)?.value?.trim().toLowerCase();
  if (codeFromCookie) {
    return getCompanyBySubdomain(codeFromCookie);
  }

  const h = await headers();
  const codeFromHost = getCompanyCodeFromHost(h.get("host"));
  if (codeFromHost) {
    return getCompanyBySubdomain(codeFromHost);
  }

  return null;
}

export async function getTenantCompanyCode(): Promise<string | null> {
  const company = await resolveTenantCompany();
  return company?.code ?? null;
}
