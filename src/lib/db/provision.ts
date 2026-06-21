import { Client } from "pg";
import fs from "fs";
import path from "path";
import {
  buildTenantConnectionString,
  getAdminConnectionString,
  tenantDatabaseName,
} from "./connection";
import { platformExecute, platformQueryOne } from "./platform";

export async function provisionTenantDatabase(
  companyId: number,
  companyCode: string
): Promise<string> {
  const dbName = tenantDatabaseName(companyId, companyCode);

  const admin = new Client({ connectionString: getAdminConnectionString() });
  await admin.connect();
  try {
    const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (exists.rowCount === 0) {
      await admin.query(`CREATE DATABASE ${quoteIdent(dbName)}`);
    }
  } finally {
    await admin.end();
  }

  const tenantUrl = buildTenantConnectionString(companyId, dbName, null);
  const tenantClient = new Client({ connectionString: tenantUrl });
  await tenantClient.connect();
  try {
    const schemaPath = path.join(process.cwd(), "src/lib/db/schema-tenant.sql");
    await tenantClient.query(fs.readFileSync(schemaPath, "utf8"));
  } finally {
    await tenantClient.end();
  }

  await platformExecute(
    `UPDATE companies SET tenant_db_name = $1, updated_at = NOW() WHERE id = $2`,
    [dbName, companyId]
  );

  return dbName;
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export async function ensureCompanyHasTenant(companyId: number): Promise<string> {
  const row = await platformQueryOne<{ tenant_db_name: string; code: string }>(
    `SELECT tenant_db_name, code FROM companies WHERE id = $1`,
    [companyId]
  );
  if (!row) throw new Error("Không tìm thấy công ty");
  if (row.tenant_db_name?.trim()) return row.tenant_db_name;
  return provisionTenantDatabase(companyId, row.code);
}
