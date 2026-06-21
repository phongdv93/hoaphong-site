import { platformExecute, platformQuery } from "@/lib/db/platform";
import { getCompanyRole } from "@/lib/projects/companies";
import type { CompanyMemberRole } from "@/lib/projects/types";
import { getActiveModuleIds } from "./access";

export async function listMemberModuleIds(
  companyId: number,
  userId: number
): Promise<string[]> {
  const rows = await platformQuery<{ module_id: string }>(
    `SELECT module_id FROM company_member_modules
     WHERE company_id = $1 AND user_id = $2 AND can_access = TRUE`,
    [companyId, userId]
  );
  return rows.map((r) => r.module_id);
}

export async function setMemberModuleIds(
  companyId: number,
  userId: number,
  moduleIds: string[]
): Promise<void> {
  await platformExecute(
    `DELETE FROM company_member_modules WHERE company_id = $1 AND user_id = $2`,
    [companyId, userId]
  );
  const unique = [...new Set(moduleIds.filter(Boolean))];
  for (const moduleId of unique) {
    await platformExecute(
      `INSERT INTO company_member_modules (company_id, user_id, module_id, can_access)
       VALUES ($1, $2, $3, TRUE)`,
      [companyId, userId, moduleId]
    );
  }
}

/** Admin/manager: mọi module công ty đã bật. Member: chỉ module được gán. */
export async function hasUserModuleAccess(
  companyId: number,
  userId: number,
  moduleId: string,
  role: CompanyMemberRole
): Promise<boolean> {
  const companyModules = await getActiveModuleIds(companyId);
  if (!companyModules.has(moduleId)) return false;

  if (role === "admin" || role === "manager") return true;

  const grants = await listMemberModuleIds(companyId, userId);
  return grants.includes(moduleId);
}

export async function getEffectiveCompanyRoleForUser(
  companyId: number,
  userId: number
): Promise<CompanyMemberRole | null> {
  return getCompanyRole(companyId, userId);
}
