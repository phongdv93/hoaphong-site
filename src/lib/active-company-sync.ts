import { getEffectiveCompanyRole, isUltimateAdmin } from "@/lib/access/company-context";
import { getSessionUser } from "@/lib/auth";
import {
  getActiveCompanyId,
  getCompany,
  setActiveCompanyId,
} from "@/lib/projects/companies";
import { resolveTenantCompany } from "@/lib/tenant-context";

async function canUseCompany(
  userId: number,
  companyId: number,
  ultimate: boolean
): Promise<boolean> {
  if (ultimate) return true;
  return Boolean(await getEffectiveCompanyRole(companyId, userId));
}

/** Đặt active company nếu user được phép và khác cookie hiện tại */
export async function ensureActiveCompanyId(
  companyId: number
): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;

  const ultimate = await isUltimateAdmin(user.id);
  const company = await getCompany(companyId);
  if (!company) return;
  if (!(await canUseCompany(user.id, companyId, ultimate))) return;

  const current = await getActiveCompanyId();
  if (current !== companyId) {
    await setActiveCompanyId(companyId);
  }
}

/** Subdomain hoặc route chi tiết công ty → đồng bộ cookie active company */
export async function syncActiveCompanyFromContext(options?: {
  routeCompanyId?: number;
}): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;

  if (options?.routeCompanyId != null) {
    await ensureActiveCompanyId(options.routeCompanyId);
    return;
  }

  const tenant = await resolveTenantCompany();
  if (tenant) {
    await ensureActiveCompanyId(tenant.id);
  }
}
