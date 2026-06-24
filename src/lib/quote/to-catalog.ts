import { ensureColumnRoles } from "./calc";
import type { QuoteDocument } from "./types";

export type QuoteCatalogLine = {
  name: string;
  description: string;
  unit: string;
  price: string;
  quantity: string;
};

/** Trích dòng hàng từ báo giá để lưu danh mục sản phẩm ERP. */
export function extractCatalogLinesFromQuote(doc: QuoteDocument): QuoteCatalogLine[] {
  const columns = ensureColumnRoles(doc.columns);
  const descCol = columns.find((c) => c.role === "description");
  const qtyCol = columns.find((c) => c.role === "quantity");
  const unitCol = columns.find((c) => c.role === "unit");
  const priceCol = columns.find((c) => c.role === "unitPrice");

  const lines: QuoteCatalogLine[] = [];
  for (const row of doc.rows) {
    const name = descCol ? String(row.cells[descCol.id] ?? "").trim() : "";
    if (!name || name === "—" || name === "-") continue;
    lines.push({
      name,
      description: "",
      unit: unitCol ? String(row.cells[unitCol.id] ?? "").trim() : "",
      price: priceCol ? String(row.cells[priceCol.id] ?? "").trim() : "",
      quantity: qtyCol ? String(row.cells[qtyCol.id] ?? "1").trim() || "1" : "1",
    });
  }
  return lines;
}
