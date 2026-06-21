import { platformQuery } from "@/lib/db/platform";
import { countTenantProjects } from "@/lib/db/tenant";
import { isPlatformAdmin } from "@/lib/platform/access";
import { getCompany, getCompanyRole, listMyCompanies } from "@/lib/projects/companies";
import type { CompanyMemberRole, CompanySummary } from "@/lib/projects/types";

/** Super admin Hoa Phong — quyết định mọi thứ trên platform và mọi công ty. */
export const isUltimateAdmin = isPlatformAdmin;

export async function getEffectiveCompanyRole(
  companyId: number,
  userId: number
): Promise<CompanyMemberRole | null> {
  if (await isUltimateAdmin(userId)) {
    const company = await getCompany(companyId);
    return company ? "admin" : null;
  }
  return getCompanyRole(companyId, userId);
}

export async function resolveCompanyAccess(
  companyId: number,
  userId: number
): Promise<{
  allowed: boolean;
  role: CompanyMemberRole | null;
  isUltimate: boolean;
}> {
  const isUltimate = await isUltimateAdmin(userId);
  if (isUltimate) {
    const company = await getCompany(companyId);
    return { allowed: !!company, role: company ? "admin" : null, isUltimate: true };
  }
  const role = await getCompanyRole(companyId, userId);
  return { allowed: role !== null, role, isUltimate: false };
}

/** Admin công ty hoặc Ultimate. */
export async function isCompanyAdmin(
  companyId: number,
  userId: number
): Promise<boolean> {
  const role = await getEffectiveCompanyRole(companyId, userId);
  return role === "admin";
}

async function listAllCompanies(): Promise<CompanySummary[]> {
  const rows = await platformQuery<Record<string, unknown>>(
    `SELECT c.*, 'admin'::text AS my_role,
            (SELECT COUNT(*) FROM company_members cm WHERE cm.company_id = c.id) AS member_count
     FROM companies c
     ORDER BY c.name`
  );
  const mapped: CompanySummary[] = rows.map((r) => ({
    id: r.id as number,
    code: r.code as string,
    subdomain: ((r.subdomain as string) || (r.code as string)).trim(),
    name: r.name as string,
    shortName: (r.short_name as string) ?? "",
    taxCode: (r.tax_code as string) ?? "",
    phone: (r.phone as string) ?? "",
    email: (r.email as string) ?? "",
    address: (r.address as string) ?? "",
    logoUrl: (r.logo_url as string) ?? "",
    websiteUrl: (r.website_url as string) ?? "",
    status: r.status as CompanySummary["status"],
    notes: (r.notes as string) ?? "",
    createdBy: (r.created_by as number | null) ?? null,
    tenantDbName: (r.tenant_db_name as string) ?? "",
    tenantDbUrl: (r.tenant_db_url as string | null) ?? null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    myRole: "admin" as CompanyMemberRole,
    memberCount: Number(r.member_count ?? 0),
    projectCount: 0,
  }));
  const out: CompanySummary[] = [];
  for (const c of mapped) {
    let projectCount = 0;
    if (c.tenantDbName) {
      try {
        projectCount = await countTenantProjects(c.id);
      } catch {
        projectCount = 0;
      }
    }
    out.push({ ...c, projectCount });
  }
  return out;
}

/** Ultimate thấy mọi công ty; user thường chỉ công ty mình tham gia. */
export async function listCompaniesForUser(userId: number): Promise<CompanySummary[]> {
  if (await isUltimateAdmin(userId)) return listAllCompanies();
  return listMyCompanies(userId);
}
