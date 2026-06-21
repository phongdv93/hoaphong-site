import { randomBytes } from "crypto";
import { slugify } from "@/lib/db";
import { tenantExecute, tenantQuery, tenantQueryOne } from "@/lib/db/tenant";

export type InventoryCategory = "hardware" | "packaging";

export interface InventoryItem {
  id: number;
  code: string;
  name: string;
  category: InventoryCategory;
  unit: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

function mapRow(r: Record<string, unknown>): InventoryItem {
  return {
    id: r.id as number,
    code: r.code as string,
    name: r.name as string,
    category: r.category as InventoryCategory,
    unit: r.unit as string,
    notes: r.notes as string,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export async function searchInventoryItems(
  q: string,
  category?: InventoryCategory,
  limit = 40
): Promise<InventoryItem[]> {
  const term = q.trim();
  const cat = category || "hardware";
  if (!term) {
    const rows = await tenantQuery(
      `SELECT * FROM inventory_items WHERE category = $1 ORDER BY name LIMIT $2`,
      [cat, limit]
    );
    return rows.map(mapRow);
  }
  const like = `%${term.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
  const rows = await tenantQuery(
    `SELECT * FROM inventory_items
     WHERE category = $1 AND (name ILIKE $2 ESCAPE '\\' OR code ILIKE $2 ESCAPE '\\')
     ORDER BY name LIMIT $3`,
    [cat, like, limit]
  );
  return rows.map(mapRow);
}

async function uniqueInventoryCode(base: string): Promise<string> {
  let code = base.slice(0, 48);
  for (let i = 0; i < 8; i++) {
    const row = await tenantQueryOne<{ c: number }>("SELECT COUNT(*)::int AS c FROM inventory_items WHERE code = $1", [code]);
    if ((row?.c ?? 0) === 0) return code;
    code = `${base.slice(0, 36)}-${randomBytes(2).toString("hex")}`.toUpperCase();
  }
  return `${base.slice(0, 32)}-${randomBytes(4).toString("hex")}`.toUpperCase();
}

export async function createInventoryItem(input: {
  name: string;
  category?: InventoryCategory;
  unit?: string;
  code?: string;
  notes?: string;
}): Promise<{ id: number; code: string }> {
  const name = input.name.trim();
  if (!name) throw new Error("Tên vật tư bắt buộc");
  const category = input.category || "hardware";
  let code = input.code?.trim() || "";
  if (!code) {
    const slug = slugify(name).replace(/-/g, "").slice(0, 20) || "ITEM";
    code = await uniqueInventoryCode(`${category === "hardware" ? "HW" : "PK"}-${slug}`.toUpperCase());
  } else {
    code = await uniqueInventoryCode(code.toUpperCase());
  }

  const row = await tenantQueryOne<{ id: number }>(
    `INSERT INTO inventory_items (code, name, category, unit, notes)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [code, name, category, input.unit?.trim() || "cái", input.notes?.trim() || ""]
  );
  return { id: row!.id, code };
}

export async function seedInventoryHardwareDemo(): Promise<void> {
  const demos: { code: string; name: string; unit: string }[] = [
    { code: "VT-DFU-4X15", name: "Vít DFU 4x15", unit: "con" },
    { code: "VT-DFU-4X20", name: "Vít DFU 4x20", unit: "con" },
    { code: "BL-35MM", name: "Bản lề giảm chấn 35mm", unit: "cái" },
    { code: "RAY-350", name: "Ray âm tủ 350mm", unit: "cái" },
    { code: "KEO-A500", name: "Keo A500 / PVA", unit: "chai" },
    { code: "OC-4X40", name: "Ốc vít gỗ 4x40", unit: "con" },
    { code: "KEO-GOC-MB", name: "Keo góc MB! 120x80x50", unit: "cái" },
    { code: "CHOT-NAM-CHAM", name: "Chốt nam châm cửa", unit: "bộ" },
    { code: "NHO-INOX", name: "Nhông lục giác inox M6", unit: "con" },
    { code: "THANG-DAY", name: "Thang dây kéo tủ trên", unit: "bộ" },
  ];
  for (const d of demos) {
    await tenantExecute(
      `INSERT INTO inventory_items (code, name, category, unit) VALUES ($1,$2,'hardware',$3)
       ON CONFLICT (code) DO NOTHING`,
      [d.code, d.name, d.unit]
    );
  }
}
