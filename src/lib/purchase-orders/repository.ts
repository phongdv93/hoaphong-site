import { toLocalDateString } from "@/lib/dates";
import { DEFAULT_PRODUCT_ORIGIN, formatProductPrimaryCode } from "@/lib/factory/display";
import { getFactoryProduct } from "@/lib/factory/products";
import { tenantExecute, tenantQuery, tenantQueryOne, tenantWithTransaction } from "@/lib/db/tenant";
import type {
  PurchaseOrder,
  PurchaseOrderInput,
  PurchaseOrderLine,
  PurchaseOrderLineInput,
  PurchaseOrderStatus,
} from "./types";

function mapLine(row: Record<string, unknown>): PurchaseOrderLine {
  return {
    id: row.id as number,
    purchaseOrderId: row.purchase_order_id as number,
    lineNo: Number(row.line_no),
    projectItemId: row.project_item_id != null ? Number(row.project_item_id) : null,
    factoryProductId: row.factory_product_id != null ? Number(row.factory_product_id) : null,
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    productCode: String(row.product_code ?? ""),
    lengthMm: Number(row.length_mm ?? 0),
    depthMm: Number(row.depth_mm ?? 0),
    heightMm: Number(row.height_mm ?? 0),
    quantity: Number(row.quantity ?? 1),
    unit: String(row.unit ?? "cái"),
    unitPrice: String(row.unit_price ?? ""),
    brand: String(row.brand ?? ""),
    origin: String(row.origin ?? ""),
    remark: String(row.remark ?? ""),
  };
}

function mapOrder(row: Record<string, unknown>, lines?: PurchaseOrderLine[]): PurchaseOrder {
  return {
    id: row.id as number,
    companyId: row.company_id as number,
    projectId: row.project_id as number,
    poNumber: String(row.po_number ?? ""),
    supplierName: String(row.supplier_name ?? ""),
    status: row.status as PurchaseOrderStatus,
    orderedAt: toLocalDateString(row.ordered_at),
    expectedAt: toLocalDateString(row.expected_at),
    notes: String(row.notes ?? ""),
    createdBy: row.created_by != null ? Number(row.created_by) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lines,
  };
}

async function nextPoNumber(companyId: number, projectId: number): Promise<string> {
  const row = await tenantQueryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM purchase_orders WHERE company_id = $1 AND project_id = $2`,
    [companyId, projectId],
    companyId
  );
  const seq = (row?.n ?? 0) + 1;
  return `PO-${projectId}-${String(seq).padStart(2, "0")}`;
}

async function loadLines(purchaseOrderId: number, companyId: number): Promise<PurchaseOrderLine[]> {
  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT * FROM purchase_order_lines WHERE purchase_order_id = $1 ORDER BY line_no`,
    [purchaseOrderId],
    companyId
  );
  return rows.map(mapLine);
}

export async function listPurchaseOrders(
  companyId: number,
  projectId: number
): Promise<PurchaseOrder[]> {
  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT po.*,
            (SELECT COUNT(*)::int FROM purchase_order_lines l WHERE l.purchase_order_id = po.id) AS line_count
     FROM purchase_orders po
     WHERE po.company_id = $1 AND po.project_id = $2
     ORDER BY po.updated_at DESC`,
    [companyId, projectId],
    companyId
  );
  return rows.map((r) => mapOrder(r));
}

export async function getPurchaseOrder(
  companyId: number,
  projectId: number,
  id: number
): Promise<PurchaseOrder | null> {
  const row = await tenantQueryOne<Record<string, unknown>>(
    `SELECT * FROM purchase_orders WHERE id = $1 AND company_id = $2 AND project_id = $3`,
    [id, companyId, projectId],
    companyId
  );
  if (!row) return null;
  const lines = await loadLines(id, companyId);
  return mapOrder(row, lines);
}

export async function createPurchaseOrder(
  companyId: number,
  projectId: number,
  input: PurchaseOrderInput,
  createdBy?: number | null
): Promise<PurchaseOrder> {
  if (!input.supplierName?.trim()) throw new Error("Nhập tên nhà cung cấp");
  const poNumber = await nextPoNumber(companyId, projectId);
  const row = await tenantQueryOne<Record<string, unknown>>(
    `INSERT INTO purchase_orders
     (company_id, project_id, po_number, supplier_name, status, ordered_at, expected_at, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      companyId,
      projectId,
      poNumber,
      input.supplierName.trim(),
      input.status ?? "draft",
      input.orderedAt ?? null,
      input.expectedAt ?? null,
      input.notes?.trim() ?? "",
      createdBy ?? null,
    ],
    companyId
  );
  return mapOrder(row!, []);
}

export async function updatePurchaseOrder(
  companyId: number,
  projectId: number,
  id: number,
  input: Partial<PurchaseOrderInput>
): Promise<PurchaseOrder> {
  const cur = await getPurchaseOrder(companyId, projectId, id);
  if (!cur) throw new Error("Không tìm thấy đơn đặt hàng");
  await tenantExecute(
    `UPDATE purchase_orders SET
       supplier_name = $1,
       status = $2,
       ordered_at = $3,
       expected_at = $4,
       notes = $5,
       updated_at = NOW()
     WHERE id = $6 AND company_id = $7 AND project_id = $8`,
    [
      input.supplierName?.trim() ?? cur.supplierName,
      input.status ?? cur.status,
      input.orderedAt === undefined ? cur.orderedAt : input.orderedAt,
      input.expectedAt === undefined ? cur.expectedAt : input.expectedAt,
      input.notes === undefined ? cur.notes : input.notes.trim(),
      id,
      companyId,
      projectId,
    ],
    companyId
  );
  return (await getPurchaseOrder(companyId, projectId, id))!;
}

export async function deletePurchaseOrder(
  companyId: number,
  projectId: number,
  id: number
): Promise<void> {
  await tenantExecute(
    `DELETE FROM purchase_orders WHERE id = $1 AND company_id = $2 AND project_id = $3`,
    [id, companyId, projectId],
    companyId
  );
}

async function lineFromProjectItem(
  companyId: number,
  projectItemId: number
): Promise<PurchaseOrderLineInput> {
  const row = await tenantQueryOne<Record<string, unknown>>(
    `SELECT pi.*, fp.id AS fp_id, fp.name AS fp_name, fp.description AS fp_desc,
            fp.range_code, fp.wood_code, fp.paint_code, fp.customer_branch_code,
            fp.length_mm, fp.depth_mm, fp.height_mm, fp.price AS fp_price, fp.brand, fp.origin
     FROM project_items pi
     LEFT JOIN factory_products fp ON fp.id = pi.factory_product_id
     WHERE pi.id = $1`,
    [projectItemId],
    companyId
  );
  if (!row) throw new Error("Không tìm thấy hạng mục");
  const fp = row.fp_id
    ? {
        rangeCode: String(row.range_code ?? ""),
        woodCode: String(row.wood_code ?? ""),
        paintCode: String(row.paint_code ?? ""),
        customerBranchCode: String(row.customer_branch_code ?? ""),
      }
    : null;
  return {
    projectItemId,
    factoryProductId: row.factory_product_id != null ? Number(row.factory_product_id) : null,
    name: String(row.fp_name ?? row.name ?? ""),
    description: String(row.fp_desc ?? row.description ?? ""),
    productCode: fp ? formatProductPrimaryCode(fp) : "",
    lengthMm: Number(row.length_mm ?? 0),
    depthMm: Number(row.depth_mm ?? 0),
    heightMm: Number(row.height_mm ?? 0),
    quantity: Number(row.quantity ?? 1),
    unit: String(row.unit ?? "cái"),
    unitPrice: String(row.fp_price ?? row.unit_price ?? ""),
    brand: String(row.brand ?? ""),
    origin: String(row.origin ?? DEFAULT_PRODUCT_ORIGIN),
  };
}

async function lineFromCatalog(
  companyId: number,
  factoryProductId: number,
  quantity?: number
): Promise<PurchaseOrderLineInput> {
  const p = await getFactoryProduct(factoryProductId);
  if (!p) throw new Error("Không tìm thấy sản phẩm");
  return {
    factoryProductId,
    name: p.name,
    description: p.description,
    productCode: formatProductPrimaryCode(p),
    lengthMm: p.lengthMm,
    depthMm: p.depthMm,
    heightMm: p.heightMm,
    quantity: quantity ?? 1,
    unit: "cái",
    unitPrice: p.price,
    brand: p.brand,
    origin: p.origin || DEFAULT_PRODUCT_ORIGIN,
  };
}

export async function addPurchaseOrderLines(
  companyId: number,
  projectId: number,
  purchaseOrderId: number,
  lines: Array<
    | { source: "item"; projectItemId: number }
    | { source: "catalog"; factoryProductId: number; quantity?: number }
    | { source: "manual"; line: PurchaseOrderLineInput }
  >
): Promise<PurchaseOrder> {
  const po = await getPurchaseOrder(companyId, projectId, purchaseOrderId);
  if (!po) throw new Error("Không tìm thấy đơn đặt hàng");

  await tenantWithTransaction(async (client) => {
    const maxRow = await client.query<{ max: number }>(
      `SELECT COALESCE(MAX(line_no), 0)::int AS max FROM purchase_order_lines WHERE purchase_order_id = $1`,
      [purchaseOrderId]
    );
    let lineNo = Number(maxRow.rows[0]?.max ?? 0);

    for (const entry of lines) {
      let draft: PurchaseOrderLineInput;
      if (entry.source === "item") {
        draft = await lineFromProjectItem(companyId, entry.projectItemId);
      } else if (entry.source === "catalog") {
        draft = await lineFromCatalog(companyId, entry.factoryProductId, entry.quantity);
      } else {
        draft = entry.line;
      }
      if (!draft.name?.trim()) continue;
      lineNo += 1;
      await client.query(
        `INSERT INTO purchase_order_lines
         (purchase_order_id, line_no, project_item_id, factory_product_id, name, description, product_code,
          length_mm, depth_mm, height_mm, quantity, unit, unit_price, brand, origin, remark)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          purchaseOrderId,
          lineNo,
          draft.projectItemId ?? null,
          draft.factoryProductId ?? null,
          draft.name.trim(),
          draft.description?.trim() ?? "",
          draft.productCode?.trim() ?? "",
          draft.lengthMm ?? 0,
          draft.depthMm ?? 0,
          draft.heightMm ?? 0,
          draft.quantity ?? 1,
          draft.unit?.trim() || "cái",
          draft.unitPrice?.trim() ?? "",
          draft.brand?.trim() ?? "",
          draft.origin?.trim() || DEFAULT_PRODUCT_ORIGIN,
          draft.remark?.trim() ?? "",
        ]
      );
    }
    await client.query(
      `UPDATE purchase_orders SET updated_at = NOW() WHERE id = $1`,
      [purchaseOrderId]
    );
  }, companyId);

  return (await getPurchaseOrder(companyId, projectId, purchaseOrderId))!;
}

export async function removePurchaseOrderLine(
  companyId: number,
  projectId: number,
  purchaseOrderId: number,
  lineId: number
): Promise<void> {
  const po = await getPurchaseOrder(companyId, projectId, purchaseOrderId);
  if (!po) throw new Error("Không tìm thấy đơn đặt hàng");
  await tenantExecute(
    `DELETE FROM purchase_order_lines WHERE id = $1 AND purchase_order_id = $2`,
    [lineId, purchaseOrderId],
    companyId
  );
  await tenantExecute(
    `UPDATE purchase_orders SET updated_at = NOW() WHERE id = $1`,
    [purchaseOrderId],
    companyId
  );
}
