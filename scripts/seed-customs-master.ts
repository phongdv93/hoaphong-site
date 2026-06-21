import { initDb } from "../src/lib/db";
import { platformQuery } from "../src/lib/db/platform";
import { ensureCompanyHasTenant } from "../src/lib/db/provision";
import { runWithTenantCompany } from "../src/lib/db/tenant-context";
import { reseedCustomsMasterData } from "../src/lib/customs/seed/ensure-seeded";

async function main() {
  await initDb();
  const companies = await platformQuery<{ id: number; code: string }>(
    `SELECT id, code FROM companies ORDER BY id`
  );
  if (!companies.length) {
    console.error("Chưa có công ty. Tạo công ty trước.");
    process.exit(1);
  }
  const force = process.argv.includes("--force");
  for (const c of companies) {
    await ensureCompanyHasTenant(c.id);
    await runWithTenantCompany(c.id, async () => {
      if (force) {
        const r = await reseedCustomsMasterData(c.id);
        console.log(`✓ Công ty #${c.id} (${c.code}) reseed:`, r);
      } else {
        const { ensureCustomsMasterDataSeeded } = await import(
          "../src/lib/customs/seed/ensure-seeded"
        );
        await ensureCustomsMasterDataSeeded(c.id);
        console.log(`✓ Công ty #${c.id} (${c.code}) — đã kiểm tra / nạp danh mục HQ`);
      }
    });
  }
  console.log("\nDanh mục: chi cục HQ, cửa khẩu, PTVT, loại hình.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
