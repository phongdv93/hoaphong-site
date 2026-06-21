/**
 * Chuyển DB thống nhất → Platform (DATABASE_URL) + Tenant DB từng công ty.
 * Chạy: npm run db:migrate-tenant-b
 */
import { Client } from "pg";
import { loadDotEnvIfNeeded } from "../src/lib/load-dotenv";
import { initPlatformDb, platformQuery } from "../src/lib/db/platform";
import {
  buildTenantConnectionString,
  getPlatformConnectionString,
} from "../src/lib/db/connection";
import { provisionTenantDatabase } from "../src/lib/db/provision";
import { syncTenantUsers } from "../src/lib/db/sync-tenant-user";

const TENANT_TABLES_NO_COMPANY = [
  "customers",
  "factory_products",
  "factory_parts",
  "factory_product_bom_lines",
  "inventory_items",
  "wood_species",
  "production_orders",
  "wood_bundles",
  "wood_boards",
  "wood_issues",
] as const;

const PROJECT_CHILD_TABLES = [
  "project_phases",
  "project_phase_progress_logs",
  "project_members",
  "project_messages",
  "project_submissions",
  "project_files",
  "project_items",
] as const;

async function tableExists(client: Client, table: string): Promise<boolean> {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return (r.rowCount ?? 0) > 0;
}

async function copyTable(
  src: Client,
  dst: Client,
  table: string,
  where?: string,
  params?: unknown[]
) {
  if (!(await tableExists(src, table))) return;
  const sql = where
    ? `SELECT * FROM ${table} WHERE ${where}`
    : `SELECT * FROM ${table}`;
  const rows = await src.query(sql, params);
  if (rows.rowCount === 0) return;

  const cols = Object.keys(rows.rows[0]);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(",");
  for (const row of rows.rows) {
    const vals = cols.map((c) => row[c]);
    await dst.query(
      `INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeholders})
       ON CONFLICT DO NOTHING`,
      vals
    ).catch(() => {
      /* bỏ qua conflict — có thể chạy lại script */
    });
  }
  console.log(`  ✓ ${table}: ${rows.rowCount} dòng`);
}

async function migrateCompany(
  platform: Client,
  companyId: number,
  code: string,
  tenantDbName: string,
  legacyOnPlatform: boolean,
  isFirstCompany: boolean
) {
  const tenantUrl = buildTenantConnectionString(companyId, tenantDbName, null);
  const tenant = new Client({ connectionString: tenantUrl });
  await tenant.connect();

  try {
    if (legacyOnPlatform && (await tableExists(platform, "projects"))) {
      await copyTable(platform, tenant, "projects", "company_id = $1", [companyId]);

      const proj = await platform.query<{ id: number }>(
        `SELECT id FROM projects WHERE company_id = $1`,
        [companyId]
      );
      const ids = proj.rows.map((r) => r.id);
      if (ids.length) {
        const inList = ids.join(",");
        for (const t of PROJECT_CHILD_TABLES) {
          if (await tableExists(platform, t)) {
            await copyTable(platform, tenant, t, `project_id IN (${inList})`);
          }
        }
      }
    }

    if (legacyOnPlatform && isFirstCompany) {
      for (const t of TENANT_TABLES_NO_COMPANY) {
        await copyTable(platform, tenant, t);
      }
    }

    const members = await platform.query<{ user_id: number }>(
      `SELECT user_id FROM company_members WHERE company_id = $1`,
      [companyId]
    );
    await syncTenantUsers(
      companyId,
      members.rows.map((r) => r.user_id)
    );
  } finally {
    await tenant.end();
  }
}

async function main() {
  loadDotEnvIfNeeded();
  await initPlatformDb();

  const platform = new Client({ connectionString: getPlatformConnectionString() });
  await platform.connect();

  const legacyOnPlatform = await tableExists(platform, "projects");

  const companies = await platform.query<{ id: number; code: string; tenant_db_name: string }>(
    `SELECT id, code, tenant_db_name FROM companies ORDER BY id`
  );

  if (companies.rowCount === 0) {
    console.log("Không có công ty nào trên platform.");
    await platform.end();
    return;
  }

  console.log(
    legacyOnPlatform
      ? "Phát hiện bảng projects trên platform — sẽ copy dữ liệu sang tenant DB."
      : "Không có dữ liệu legacy trên platform — chỉ provision tenant DB trống."
  );

  for (let i = 0; i < companies.rows.length; i++) {
    const c = companies.rows[i];
    let dbName = c.tenant_db_name?.trim();
    if (!dbName) {
      dbName = await provisionTenantDatabase(c.id, c.code);
      console.log(`\nCông ty #${c.id} (${c.code}) → tạo DB ${dbName}`);
    } else {
      console.log(`\nCông ty #${c.id} (${c.code}) → DB ${dbName} (đã có)`);
    }
    await migrateCompany(platform, c.id, c.code, dbName, legacyOnPlatform, i === 0);
  }

  await platform.end();
  console.log("\n✓ Xong. Đăng nhập bằng tài khoản is_platform_admin = true (Hoa Phong Premium).");
  if (legacyOnPlatform) {
    console.log(
      "Gợi ý: sau khi xác nhận app chạy ổn, có thể xóa bảng tenant cũ trên platform DB (projects, customers, wood_*, …)."
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
