import { tenantExecute, tenantQuery, tenantQueryOne } from "@/lib/db/tenant";
import type { ProductSupplierOffer, ProductSupplierOfferInput, Supplier } from "./types";

function mapSupplier(row: Record<string, unknown>): Supplier {
  return {
    id: row.id as number,
    companyId: row.company_id as number,
    name: String(row.name ?? ""),
    contactName: String(row.contact_name ?? ""),
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    address: String(row.address ?? ""),
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapOffer(row: Record<string, unknown>): ProductSupplierOffer {
  return {
    id: row.id as number,
    productId: row.product_id as number,
    supplierId: row.supplier_id as number,
    supplierName: String(row.supplier_name ?? ""),
    unitPrice: String(row.unit_price ?? ""),
    leadTimeDays: row.lead_time_days != null ? Number(row.lead_time_days) : null,
    currency: String(row.currency ?? "VND"),
    isPreferred: Boolean(row.is_preferred),
    notes: String(row.notes ?? ""),
  };
}

export async function listSuppliers(companyId: number, search?: string): Promise<Supplier[]> {
  const q = search?.trim();
  if (!q) {
    const rows = await tenantQuery<Record<string, unknown>>(
      `SELECT * FROM suppliers WHERE company_id = $1 ORDER BY name`,
      [companyId],
      companyId
    );
    return rows.map(mapSupplier);
  }
  const like = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT * FROM suppliers WHERE company_id = $1 AND name ILIKE $2 ESCAPE '\\' ORDER BY name LIMIT 50`,
    [companyId, like],
    companyId
  );
  return rows.map(mapSupplier);
}

export async function getSupplier(companyId: number, id: number): Promise<Supplier | null> {
  const row = await tenantQueryOne<Record<string, unknown>>(
    `SELECT * FROM suppliers WHERE id = $1 AND company_id = $2`,
    [id, companyId],
    companyId
  );
  return row ? mapSupplier(row) : null;
}

export async function createSupplier(companyId: number, name: string): Promise<Supplier> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Tên nhà cung cấp bắt buộc");
  const existing = await tenantQueryOne<Record<string, unknown>>(
    `SELECT * FROM suppliers WHERE company_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2))`,
    [companyId, trimmed],
    companyId
  );
  if (existing) return mapSupplier(existing);
  const row = await tenantQueryOne<Record<string, unknown>>(
    `INSERT INTO suppliers (company_id, name) VALUES ($1, $2) RETURNING *`,
    [companyId, trimmed],
    companyId
  );
  return mapSupplier(row!);
}

export async function listProductSupplierOffers(
  companyId: number,
  productId: number
): Promise<ProductSupplierOffer[]> {
  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT fps.*, s.name AS supplier_name
     FROM factory_product_suppliers fps
     JOIN suppliers s ON s.id = fps.supplier_id
     WHERE fps.product_id = $1 AND s.company_id = $2
     ORDER BY fps.is_preferred DESC, s.name`,
    [productId, companyId],
    companyId
  );
  return rows.map(mapOffer);
}

export async function saveProductSupplierOffers(
  companyId: number,
  productId: number,
  offers: ProductSupplierOfferInput[]
): Promise<ProductSupplierOffer[]> {
  await tenantExecute(`DELETE FROM factory_product_suppliers WHERE product_id = $1`, [productId], companyId);
  let preferredSet = false;
  for (const offer of offers) {
    if (!offer.supplierId) continue;
    const supplier = await getSupplier(companyId, offer.supplierId);
    if (!supplier) continue;
    const isPreferred = offer.isPreferred && !preferredSet;
    if (isPreferred) preferredSet = true;
    await tenantExecute(
      `INSERT INTO factory_product_suppliers
       (product_id, supplier_id, unit_price, lead_time_days, currency, is_preferred, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        productId,
        offer.supplierId,
        offer.unitPrice?.trim() ?? "",
        offer.leadTimeDays ?? null,
        offer.currency?.trim() || "VND",
        isPreferred,
        offer.notes?.trim() ?? "",
      ],
      companyId
    );
  }
  const saved = await listProductSupplierOffers(companyId, productId);
  const preferred = saved.find((o) => o.isPreferred) ?? saved[0];
  if (preferred) {
    await tenantExecute(
      `UPDATE factory_products SET supplier = $1, price = COALESCE(NULLIF($2, ''), price), updated_at = NOW() WHERE id = $3`,
      [preferred.supplierName, preferred.unitPrice, productId],
      companyId
    );
  }
  return saved;
}

export async function resolveSupplierForProduct(
  companyId: number,
  factoryProductId: number
): Promise<{ supplierId: number | null; supplierName: string; unitPrice: string } | null> {
  const offer = await tenantQueryOne<Record<string, unknown>>(
    `SELECT fps.supplier_id, s.name AS supplier_name, fps.unit_price
     FROM factory_product_suppliers fps
     JOIN suppliers s ON s.id = fps.supplier_id
     WHERE fps.product_id = $1 AND s.company_id = $2
     ORDER BY fps.is_preferred DESC, fps.id
     LIMIT 1`,
    [factoryProductId, companyId],
    companyId
  );
  if (offer) {
    return {
      supplierId: Number(offer.supplier_id),
      supplierName: String(offer.supplier_name ?? ""),
      unitPrice: String(offer.unit_price ?? ""),
    };
  }
  const product = await tenantQueryOne<Record<string, unknown>>(
    `SELECT supplier, price FROM factory_products WHERE id = $1`,
    [factoryProductId],
    companyId
  );
  if (!product) return null;
  const supplierName = String(product.supplier ?? "").trim();
  if (!supplierName) return { supplierId: null, supplierName: "", unitPrice: String(product.price ?? "") };
  const supplier = await tenantQueryOne<{ id: number }>(
    `SELECT id FROM suppliers WHERE company_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2))`,
    [companyId, supplierName],
    companyId
  );
  return {
    supplierId: supplier?.id ?? null,
    supplierName,
    unitPrice: String(product.price ?? ""),
  };
}
