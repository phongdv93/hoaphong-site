import { loadDotEnvIfNeeded } from "../load-dotenv";

export function getPlatformConnectionString(): string {
  loadDotEnvIfNeeded();
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL chưa cấu hình (PostgreSQL platform).");
  }
  return url;
}

/** URL admin để CREATE DATABASE (mặc định cùng host, database postgres). */
export function getAdminConnectionString(): string {
  loadDotEnvIfNeeded();
  if (process.env.POSTGRES_ADMIN_URL) return process.env.POSTGRES_ADMIN_URL;
  const base = getPlatformConnectionString();
  const u = new URL(base);
  u.pathname = "/postgres";
  return u.toString();
}

export function tenantDatabaseName(companyId: number, companyCode?: string): string {
  const prefix = process.env.TENANT_DB_PREFIX || "erp_t_";
  const safe = (companyCode || String(companyId))
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 32);
  return `${prefix}${companyId}_${safe}`;
}

export function buildTenantConnectionString(
  companyId: number,
  tenantDbName: string,
  tenantDbUrl?: string | null
): string {
  if (tenantDbUrl?.trim()) return tenantDbUrl.trim();
  const base = getPlatformConnectionString();
  const u = new URL(base);
  u.pathname = `/${tenantDbName}`;
  return u.toString();
}
