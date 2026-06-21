import { Pool, type PoolClient, type QueryResultRow } from "pg";
import fs from "fs";
import path from "path";
import { platformQueryOne } from "./platform";
import { buildTenantConnectionString } from "./connection";
import { requireTenantCompanyIdFromContext } from "./tenant-context";
import { repairTenantSerialSequences } from "./repair-sequences";

const tenantPools = new Map<number, Pool>();
const tenantSchemaApplied = new Set<number>();

export interface TenantCompanyRow {
  id: number;
  code: string;
  tenant_db_name: string;
  tenant_db_url: string | null;
}

export async function getTenantCompanyRow(companyId: number): Promise<TenantCompanyRow | null> {
  return platformQueryOne<TenantCompanyRow>(
    `SELECT id, code, tenant_db_name, tenant_db_url FROM companies WHERE id = $1`,
    [companyId]
  );
}

export async function getTenantPool(companyId: number): Promise<Pool> {
  const existing = tenantPools.get(companyId);
  if (existing) return existing;

  const row = await getTenantCompanyRow(companyId);
  if (!row?.tenant_db_name) {
    throw new Error(`Công ty #${companyId} chưa có tenant database. Chạy npm run db:migrate-tenant-b`);
  }

  const url = buildTenantConnectionString(companyId, row.tenant_db_name, row.tenant_db_url);
  const pool = new Pool({ connectionString: url });
  tenantPools.set(companyId, pool);
  return pool;
}

async function ensureTenantSchema(companyId: number): Promise<void> {
  if (tenantSchemaApplied.has(companyId)) return;
  const pool = await getTenantPool(companyId);
  const schemaPath = path.join(process.cwd(), "src/lib/db/schema-tenant.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  await pool.query(sql);
  await repairTenantSerialSequences(pool);
  tenantSchemaApplied.add(companyId);
}

function resolveCompanyId(companyId?: number): number {
  return companyId ?? requireTenantCompanyIdFromContext();
}

export async function tenantQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
  companyId?: number
): Promise<T[]> {
  const cid = resolveCompanyId(companyId);
  await ensureTenantSchema(cid);
  const res = await (await getTenantPool(cid)).query<T>(text, params);
  return res.rows;
}

export async function tenantQueryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
  companyId?: number
): Promise<T | null> {
  const rows = await tenantQuery<T>(text, params, companyId);
  return rows[0] ?? null;
}

export async function tenantExecute(
  text: string,
  params?: unknown[],
  companyId?: number
): Promise<{ insertId?: number; rowCount: number }> {
  const cid = resolveCompanyId(companyId);
  await ensureTenantSchema(cid);
  const res = await (await getTenantPool(cid)).query(text, params);
  const insertId = (res.rows[0] as { id?: number } | undefined)?.id;
  return { insertId, rowCount: res.rowCount ?? 0 };
}

export async function tenantWithTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
  companyId?: number
): Promise<T> {
  const cid = resolveCompanyId(companyId);
  await ensureTenantSchema(cid);
  const client = await (await getTenantPool(cid)).connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function countTenantProjects(companyId: number): Promise<number> {
  const row = await tenantQueryOne<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM projects WHERE company_id = $1`,
    [companyId],
    companyId
  );
  return row?.c ?? 0;
}
