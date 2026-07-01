import { toLocalDateString } from "@/lib/dates";
import { DEFAULT_PRODUCT_ORIGIN } from "@/lib/factory/display";
import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { tenantExecute, tenantQuery, tenantQueryOne, tenantWithTransaction } from "@/lib/db/tenant";
import type {
  BomLineInput,
  BomSection,
  FactoryBomLine,
  FactoryPart,
  FactoryProduct,
  FactoryProductPayload,
} from "@/lib/factory/types";

function mapProduct(row: Record<string, unknown>): FactoryProduct {
  return {
    id: row.id as number,
    name: row.name as string,
    description: (row.description as string) ?? "",
    brand: String(row.brand ?? ""),
    origin: String(row.origin ?? DEFAULT_PRODUCT_ORIGIN),
    rangeCode: row.range_code as string,
    woodCode: row.wood_code as string,
    paintCode: row.paint_code as string,
    customerBranchCode: row.customer_branch_code as string,
    lengthMm: Number(row.length_mm),
    depthMm: Number(row.depth_mm),
    heightMm: Number(row.height_mm),
    price: row.price as string,
    supplier: (row.supplier as string) ?? "",
    orderedAt: row.ordered_at ? toLocalDateString(row.ordered_at) : null,
    sourceProjectId:
      row.source_project_id != null ? Number(row.source_project_id) : null,
    cbmM3: Number(row.cbm_m3),
    weightKg: Number(row.weight_kg),
    imageUrl: (row.image_url as string) ?? "",
    notes: row.notes as string,
    status: row.status as FactoryProduct["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapPart(row: Record<string, unknown>): FactoryPart {
  return {
    id: row.id as number,
    code: row.code as string,
    name: row.name as string,
    description: row.description as string,
    lengthMm: Number(row.length_mm ?? 0),
    depthMm: Number(row.depth_mm ?? 0),
    heightMm: Number(row.height_mm ?? 0),
    defaultQty: Number(row.default_qty),
    unit: row.unit as string,
    materialType: row.material_type as string,
    specNotes: row.spec_notes as string,
    createdFromProductId: row.created_from_product_id != null ? Number(row.created_from_product_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listFactoryProducts(): Promise<FactoryProduct[]> {
  const rows = await tenantQuery("SELECT * FROM factory_products ORDER BY updated_at DESC, id DESC");
  return rows.map(mapProduct);
}

export async function getFactoryProduct(id: number): Promise<FactoryProduct | null> {
  const row = await tenantQueryOne("SELECT * FROM factory_products WHERE id = $1", [id]);
  return row ? mapProduct(row) : null;
}

export async function listFactoryParts(search?: string): Promise<FactoryPart[]> {
  const q = search?.trim();
  if (!q) {
    const rows = await tenantQuery("SELECT * FROM factory_parts ORDER BY code");
    return rows.map(mapPart);
  }
  const like = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
  const rows = await tenantQuery(
    `SELECT * FROM factory_parts
     WHERE name ILIKE $1 ESCAPE '\\' OR code ILIKE $1 ESCAPE '\\'
     ORDER BY code LIMIT 500`,
    [like]
  );
  return rows.map(mapPart);
}

export async function getProductWithBom(productId: number): Promise<{
  product: FactoryProduct;
  lines: FactoryBomLine[];
} | null> {
  const product = await getFactoryProduct(productId);
  if (!product) return null;

  const rows = await tenantQuery(
    `SELECT bl.id AS bl_id, bl.product_id, bl.bom_section, bl.line_no, bl.part_id, bl.qty, bl.unit, bl.remark,
            p.id AS p_id, p.code, p.name, p.description, p.length_mm AS p_len, p.depth_mm AS p_dep, p.height_mm AS p_h,
            p.default_qty, p.unit AS p_unit, p.material_type, p.spec_notes, p.created_from_product_id, p.created_at, p.updated_at
     FROM factory_product_bom_lines bl
     JOIN factory_parts p ON p.id = bl.part_id
     WHERE bl.product_id = $1
     ORDER BY CASE bl.bom_section WHEN 'wood' THEN 1 WHEN 'hardware' THEN 2 WHEN 'packaging' THEN 3 ELSE 9 END, bl.line_no`,
    [productId]
  );

  const lines: FactoryBomLine[] = rows.map((r) => ({
    id: r.bl_id as number,
    productId: r.product_id as number,
    bomSection: r.bom_section as BomSection,
    lineNo: r.line_no as number,
    partId: r.part_id as number,
    qty: Number(r.qty),
    unit: r.unit as string,
    remark: r.remark as string,
    part: mapPart({
      id: r.p_id,
      code: r.code,
      name: r.name,
      description: r.description,
      length_mm: r.p_len,
      depth_mm: r.p_dep,
      height_mm: r.p_h,
      default_qty: r.default_qty,
      unit: r.p_unit,
      material_type: r.material_type,
      spec_notes: r.spec_notes,
      created_from_product_id: r.created_from_product_id,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }),
  }));

  return { product, lines };
}

function isBomRowMeaningful(row: BomLineInput): boolean {
  return Boolean(
    row.name?.trim() ||
      row.partCode?.trim() ||
      (row.lengthMm && row.lengthMm > 0) ||
      (row.depthMm && row.depthMm > 0) ||
      (row.heightMm && row.heightMm > 0)
  );
}

const SECTION_PREFIX: Record<BomSection, string> = {
  wood: "W",
  hardware: "H",
  packaging: "P",
};

async function upsertPart(
  client: PoolClient,
  productId: number,
  section: BomSection,
  lineIndex: number,
  row: BomLineInput
): Promise<number> {
  const prefix = SECTION_PREFIX[section];
  const autoSuffix = randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
  const code =
    row.partCode?.trim() ||
    `SP${productId}-${prefix}${lineIndex + 1}-${autoSuffix}`;
  const name = row.name?.trim() || code;
  const description = row.specNotes?.trim() || "";
  const qty = Number.isFinite(row.qty) && row.qty > 0 ? row.qty : 1;
  const unit = row.unit?.trim() || "cái";
  const materialType = row.materialType?.trim() || "";
  const specNotes = row.specNotes?.trim() || "";
  const isHardware = section === "hardware";
  const len = isHardware ? 0 : Number.isFinite(row.lengthMm) && row.lengthMm >= 0 ? row.lengthMm : 0;
  const dep = isHardware ? 0 : Number.isFinite(row.depthMm) && row.depthMm >= 0 ? row.depthMm : 0;
  const h = isHardware ? 0 : Number.isFinite(row.heightMm) && row.heightMm >= 0 ? row.heightMm : 0;

  const res = await client.query<{ id: number }>(
    `INSERT INTO factory_parts (
       code, name, description, length_mm, depth_mm, height_mm,
       default_qty, unit, material_type, spec_notes, created_from_product_id
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (code) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       length_mm = EXCLUDED.length_mm,
       depth_mm = EXCLUDED.depth_mm,
       height_mm = EXCLUDED.height_mm,
       default_qty = EXCLUDED.default_qty,
       unit = EXCLUDED.unit,
       material_type = EXCLUDED.material_type,
       spec_notes = EXCLUDED.spec_notes,
       created_from_product_id = COALESCE(factory_parts.created_from_product_id, EXCLUDED.created_from_product_id),
       updated_at = NOW()
     RETURNING id`,
    [code, name, description, len, dep, h, qty, unit, materialType, specNotes, productId]
  );
  return res.rows[0]!.id;
}

async function saveBomLines(client: PoolClient, productId: number, payload: FactoryProductPayload): Promise<void> {
  await client.query("DELETE FROM factory_product_bom_lines WHERE product_id = $1", [productId]);

  const wood = payload.bomWood?.length ? payload.bomWood : payload.bom ?? [];
  const sections: [BomSection, BomLineInput[]][] = [
    ["wood", wood],
    ["hardware", payload.bomHardware ?? []],
    ["packaging", payload.bomPackaging ?? []],
  ];

  for (const [section, rows] of sections) {
    const meaningful = rows.filter(isBomRowMeaningful);
    let lineNo = 0;
    for (const row of meaningful) {
      lineNo += 1;
      const partId = await upsertPart(client, productId, section, lineNo - 1, row);
      await client.query(
        `INSERT INTO factory_product_bom_lines (product_id, bom_section, line_no, part_id, qty, unit, remark)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          productId,
          section,
          lineNo,
          partId,
          Number.isFinite(row.qty) && row.qty > 0 ? row.qty : 1,
          row.unit?.trim() || "cái",
          row.remark?.trim() || "",
        ]
      );
    }
  }
}

export async function createCatalogProduct(input: {
  name: string;
  description?: string;
  brand?: string;
  origin?: string;
  supplier?: string;
  orderedAt?: string | null;
  price?: string;
  sourceProjectId?: number;
  sourceQuoteRef?: string;
  notes?: string;
}): Promise<number> {
  if (!input.name?.trim()) throw new Error("Tên sản phẩm bắt buộc");
  const row = await tenantQueryOne<{ id: number }>(
    `INSERT INTO factory_products (
       name, description, brand, origin, supplier, ordered_at, price, notes, status, source_project_id, source_quote_ref
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10) RETURNING id`,
    [
      input.name.trim(),
      input.description?.trim() ?? "",
      input.brand?.trim() ?? "",
      input.origin?.trim() || DEFAULT_PRODUCT_ORIGIN,
      input.supplier?.trim() ?? "",
      input.orderedAt ?? null,
      input.price?.trim() ?? "",
      input.notes?.trim() ?? "",
      input.sourceProjectId ?? null,
      input.sourceQuoteRef?.trim() ?? "",
    ]
  );
  return row!.id;
}

export async function findCatalogProductByName(name: string): Promise<number | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  const row = await tenantQueryOne<{ id: number }>(
    `SELECT id FROM factory_products WHERE LOWER(TRIM(name)) = $1 ORDER BY id DESC LIMIT 1`,
    [key]
  );
  return row?.id ?? null;
}

export async function importQuoteLinesToCatalog(
  quoteRef: string,
  lines: Array<{
    name: string;
    description?: string;
    unit?: string;
    price?: string;
    quantity?: string;
  }>
): Promise<{ created: number; updated: number; ids: number[] }> {
  const ids: number[] = [];
  let created = 0;
  let updated = 0;
  const ref = quoteRef.trim();

  for (const line of lines) {
    if (!line.name?.trim()) continue;
    const name = line.name.trim();
    const description = line.description?.trim() ?? "";
    const price = line.price?.trim() ?? "";
    const noteParts = [
      line.unit?.trim() ? `ĐVT: ${line.unit.trim()}` : "",
      line.quantity?.trim() && line.quantity.trim() !== "1"
        ? `SL: ${line.quantity.trim()}`
        : "",
    ].filter(Boolean);

    const existing = ref
      ? await tenantQueryOne<{ id: number }>(
          `SELECT id FROM factory_products
           WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
             AND source_quote_ref = $2
           ORDER BY id DESC LIMIT 1`,
          [name, ref]
        )
      : await tenantQueryOne<{ id: number }>(
          `SELECT id FROM factory_products
           WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
           ORDER BY id DESC LIMIT 1`,
          [name]
        );

    if (existing) {
      await tenantExecute(
        `UPDATE factory_products SET
           description = $1, price = $2, notes = $3, source_quote_ref = $4, updated_at = NOW()
         WHERE id = $5`,
        [description, price, noteParts.join(" · "), ref, existing.id]
      );
      ids.push(existing.id);
      updated++;
    } else {
      const id = await createCatalogProduct({
        name,
        description,
        price,
        sourceQuoteRef: ref,
        notes: noteParts.join(" · "),
      });
      ids.push(id);
      created++;
    }
  }
  return { created, updated, ids };
}

export async function updateCatalogProductMeta(
  id: number,
  input: Partial<{
    name: string;
    description: string;
    supplier: string;
    orderedAt: string | null;
    price: string;
  }>
): Promise<void> {
  const cur = await tenantQueryOne<Record<string, unknown>>(
    "SELECT * FROM factory_products WHERE id = $1",
    [id]
  );
  if (!cur) throw new Error("Không tìm thấy sản phẩm");
  await tenantExecute(
    `UPDATE factory_products SET
       name = $1, description = $2, supplier = $3, ordered_at = $4, price = $5, updated_at = NOW()
     WHERE id = $6`,
    [
      input.name ?? String(cur.name),
      input.description ?? String(cur.description ?? ""),
      input.supplier ?? String(cur.supplier ?? ""),
      input.orderedAt === undefined
        ? cur.ordered_at
          ? toLocalDateString(cur.ordered_at)
          : null
        : input.orderedAt,
      input.price ?? String(cur.price ?? ""),
      id,
    ]
  );
}

export async function createFactoryProduct(payload: FactoryProductPayload): Promise<number> {
  if (!payload.name?.trim()) throw new Error("Tên sản phẩm bắt buộc");

  return tenantWithTransaction(async (client) => {
    const ins = await client.query<{ id: number }>(
      `INSERT INTO factory_products (
        name, description, brand, origin, supplier, ordered_at, source_project_id,
        range_code, wood_code, paint_code, customer_branch_code,
        length_mm, depth_mm, height_mm, price, cbm_m3, weight_kg, image_url, notes, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id`,
      [
        payload.name.trim(),
        payload.description ?? "",
        payload.brand?.trim() ?? "",
        payload.origin?.trim() || DEFAULT_PRODUCT_ORIGIN,
        payload.supplier ?? "",
        payload.orderedAt ?? null,
        payload.sourceProjectId ?? null,
        payload.rangeCode ?? "",
        payload.woodCode ?? "",
        payload.paintCode ?? "",
        payload.customerBranchCode ?? "",
        payload.lengthMm ?? 0,
        payload.depthMm ?? 0,
        payload.heightMm ?? 0,
        payload.price ?? "",
        payload.cbmM3 ?? 0,
        payload.weightKg ?? 0,
        payload.imageUrl ?? "",
        payload.notes ?? "",
        (payload.status as string) || "draft",
      ]
    );
    const id = ins.rows[0]!.id;
    await saveBomLines(client, id, payload);
    return id;
  });
}

export async function updateFactoryProduct(id: number, payload: FactoryProductPayload): Promise<void> {
  if (!payload.name?.trim()) throw new Error("Tên sản phẩm bắt buộc");

  await tenantWithTransaction(async (client) => {
    const exists = await client.query("SELECT 1 FROM factory_products WHERE id = $1", [id]);
    if (exists.rowCount === 0) throw new Error("Không tìm thấy sản phẩm");

    await client.query(
      `UPDATE factory_products SET
        name=$1, description=$2, brand=$3, origin=$4, supplier=$5, ordered_at=$6, source_project_id=$7,
        range_code=$8, wood_code=$9, paint_code=$10, customer_branch_code=$11,
        length_mm=$12, depth_mm=$13, height_mm=$14, price=$15, cbm_m3=$16, weight_kg=$17, image_url=$18, notes=$19, status=$20, updated_at=NOW()
      WHERE id=$21`,
      [
        payload.name.trim(),
        payload.description ?? "",
        payload.brand?.trim() ?? "",
        payload.origin?.trim() || DEFAULT_PRODUCT_ORIGIN,
        payload.supplier ?? "",
        payload.orderedAt ?? null,
        payload.sourceProjectId ?? null,
        payload.rangeCode ?? "",
        payload.woodCode ?? "",
        payload.paintCode ?? "",
        payload.customerBranchCode ?? "",
        payload.lengthMm ?? 0,
        payload.depthMm ?? 0,
        payload.heightMm ?? 0,
        payload.price ?? "",
        payload.cbmM3 ?? 0,
        payload.weightKg ?? 0,
        payload.imageUrl ?? "",
        payload.notes ?? "",
        (payload.status as string) || "draft",
        id,
      ]
    );
    await saveBomLines(client, id, payload);
  });
}

export async function deleteFactoryProduct(id: number): Promise<void> {
  await tenantExecute("DELETE FROM factory_products WHERE id = $1", [id]);
}
