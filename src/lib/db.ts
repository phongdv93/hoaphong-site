/**
 * Platform DB (DATABASE_URL): users, companies, members, modules, CMS.
 * Tenant DB (per company): projects, kho, marketing, ...
 */
export {
  initPlatformDb,
  initPlatformDb as initDb,
  getPlatformPool,
  platformQuery,
  platformQueryOne,
  platformExecute,
  platformWithTransaction,
} from "./db/platform";

export {
  tenantQuery,
  tenantQueryOne,
  tenantExecute,
  tenantWithTransaction,
  getTenantPool,
  countTenantProjects,
} from "./db/tenant";

export { runWithTenantCompany, requireTenantCompanyIdFromContext } from "./db/tenant-context";
export { provisionTenantDatabase, ensureCompanyHasTenant } from "./db/provision";

/** Alias tương thích — chỉ dùng cho bảng platform (website, users, companies). */
export {
  platformQuery as query,
  platformQueryOne as queryOne,
  platformExecute as execute,
  platformWithTransaction as withTransaction,
} from "./db/platform";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
