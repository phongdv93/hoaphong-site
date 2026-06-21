import { initDb } from "../src/lib/db";
import { platformQueryOne } from "../src/lib/db/platform";
import { ensureCompanyHasTenant } from "../src/lib/db/provision";
import { runWithTenantCompany } from "../src/lib/db/tenant-context";
import { tenantExecute, tenantQueryOne } from "../src/lib/db/tenant";
import { createBundle, createPO } from "../src/lib/wood/repository";
import { BOARD_THICKNESS_INCH_MM, BUNDLE_LENGTH_MM } from "../src/lib/wood/layout";
import { emptyGrid, gridToBoardInputs } from "../src/lib/wood/grid";
import { ERP } from "../src/lib/paths";

async function main() {
  await initDb();

  const company = await platformQueryOne<{ id: number }>(
    `SELECT id FROM companies ORDER BY id LIMIT 1`
  );
  if (!company) {
    console.error("Chưa có công ty. Tạo công ty bằng Hoa Phong Premium rồi chạy db:migrate-tenant-b");
    process.exit(1);
  }
  const companyId = company.id;
  await ensureCompanyHasTenant(companyId);

  await runWithTenantCompany(companyId, async () => {
    const species = [
      { code: "OC", name: "Oak / Sồi", price: 18500000 },
      { code: "ASH", name: "Ash / Tần bì", price: 16200000 },
      { code: "RUB", name: "Rubberwood / Cao su", price: 9800000 },
    ];

    for (const s of species) {
      await tenantExecute(
        `INSERT INTO wood_species (code, name, price_per_m3) VALUES ($1,$2,$3)
         ON CONFLICT (code) DO NOTHING`,
        [s.code, s.name, s.price],
        companyId
      );
    }
    console.log("✓ Loại gỗ (species) — tenant DB");

    const ocRow = await tenantQueryOne<{ id: number }>(
      "SELECT id FROM wood_species WHERE code = 'OC'",
      [],
      companyId
    );
    const ocId = ocRow!.id;

    async function ensurePO(poNumber: string, customerName: string, requiredVolumeM3?: number) {
      const row = await tenantQueryOne<{ id: number }>(
        "SELECT id FROM production_orders WHERE po_number = $1",
        [poNumber],
        companyId
      );
      if (row) {
        console.log(`  · PO ${poNumber} đã có (id=${row.id})`);
        return row.id;
      }
      const id = await createPO(poNumber, customerName, requiredVolumeM3);
      console.log(`  · PO ${poNumber} tạo mới (id=${id})`);
      return id;
    }

    await ensurePO("PO-DEMO-001", "Khách demo kho gỗ", 12.5);

    const grid = emptyGrid(3, 4);
    for (let r = 0; r < grid.rows.length; r++) {
      for (let c = 0; c < grid.columnWidths.length; c++) {
        grid.rows[r][c] = 1;
      }
    }
    const boards = gridToBoardInputs(grid, BOARD_THICKNESS_INCH_MM, BUNDLE_LENGTH_MM);

    const existing = await tenantQueryOne<{ id: number }>(
      "SELECT id FROM wood_bundles WHERE code LIKE 'K-%' LIMIT 1",
      [],
      companyId
    );
    if (!existing || process.env.RECREATE_DEMO === "1") {
      const bundleId = await createBundle({
        speciesId: ocId,
        packingListNo: "PL-DEMO-001",
        supplier: "Demo Supplier",
        thicknessMm: BOARD_THICKNESS_INCH_MM,
        lengthMm: BUNDLE_LENGTH_MM,
        notes: "Kiện demo seed-wood",
        layoutGrid: grid,
        boards,
      });
      console.log(`✓ Kiện demo (id=${bundleId})`);
    } else {
      console.log(`✓ Kiện demo đã có (id=${existing.id}), bỏ qua. RECREATE_DEMO=1 để tạo lại.`);
    }

    console.log(`\n🪵 Wood seed xong (công ty #${companyId}). Mở ${ERP}/kho-go`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
