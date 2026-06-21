/**
 * Gán subdomain ERP cho các công ty hiện có + backfill subdomain = code nếu trống.
 * Chạy: npm run db:migrate-subdomains
 */
import { initPlatformDb, platformExecute, platformQuery } from "../src/lib/db/platform";

const SUBDOMAIN_BY_ID: Record<number, string> = {
  1: "hoaphong-test-1",
  2: "test-cty-2",
  3: "hoa-phong",
};

async function main() {
  await initPlatformDb();

  await platformExecute(
    `UPDATE companies SET subdomain = code WHERE subdomain IS NULL OR TRIM(subdomain) = ''`
  );

  for (const [idStr, subdomain] of Object.entries(SUBDOMAIN_BY_ID)) {
    const id = Number(idStr);
    const taken = await platformQuery<{ id: number }>(
      `SELECT id FROM companies WHERE LOWER(subdomain) = $1 AND id <> $2`,
      [subdomain.toLowerCase(), id]
    );
    if (taken.length > 0) {
      console.warn(`⚠ Subdomain "${subdomain}" đã dùng — bỏ qua công ty #${id}`);
      continue;
    }
    await platformExecute(`UPDATE companies SET subdomain = $1 WHERE id = $2`, [subdomain, id]);
    console.log(`✓ Công ty #${id} → ${subdomain}.hoaphong.com.vn`);
  }

  const rows = await platformQuery<{ id: number; code: string; name: string; subdomain: string }>(
    `SELECT id, code, name, COALESCE(NULLIF(TRIM(subdomain), ''), code) AS subdomain FROM companies ORDER BY id`
  );
  console.log("\nDanh sách công ty:");
  for (const r of rows) {
    console.log(`  #${r.id} ${r.name}`);
    console.log(`     ERP: https://${r.subdomain}.hoaphong.com.vn/erp/login`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
