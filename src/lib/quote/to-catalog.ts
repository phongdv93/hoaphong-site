import { ensureColumnRoles } from "./calc";
import type { QuoteColumn, QuoteDocument, QuoteRow } from "./types";

export type QuoteCatalogLine = {
  name: string;
  description: string;
  unit: string;
  price: string;
  quantity: string;
};

function normLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function pickColumn(
  columns: QuoteColumn[],
  roles: string[],
  labelPatterns: RegExp[]
): QuoteColumn | undefined {
  return columns.find(
    (c) =>
      (c.role && roles.includes(c.role)) ||
      labelPatterns.some((p) => p.test(normLabel(c.label)))
  );
}

function cellText(row: QuoteRow, col?: QuoteColumn): string {
  if (!col) return "";
  return String(row.cells[col.id] ?? "").trim();
}

/** Trích dòng hàng từ báo giá để lưu danh mục sản phẩm ERP. */
export function extractCatalogLinesFromQuote(doc: QuoteDocument): QuoteCatalogLine[] {
  const columns = ensureColumnRoles(doc.columns);

  const nameCol = pickColumn(columns, ["description"], [
    /ten hang/,
    /danh muc/,
    /hang hoa/,
    /noi dung/,
    /mo ta/,
  ]);
  const specCol = pickColumn(columns, ["custom"], [/thong so/, /ky thuat/, /chi tiet/]);
  const qtyCol = pickColumn(columns, ["quantity"], [/so luong/, /^sl\b/, /khoi luong/]);
  const unitCol = pickColumn(columns, ["unit"], [/dvt/, /don vi/]);
  const priceCol = pickColumn(columns, ["unitPrice"], [/don gia/]);

  const lines: QuoteCatalogLine[] = [];
  for (const row of doc.rows) {
    let name = cellText(row, nameCol);
    const spec = cellText(row, specCol);
    if (!name && spec) {
      const firstLine = spec.split(/\n/)[0]?.trim() ?? "";
      name = firstLine;
    }
    if (!name || name === "—" || name === "-") continue;

    let description = spec;
    if (description && description.startsWith(name)) {
      description = description.slice(name.length).trim();
    }
    if (!description && nameCol) {
      const full = cellText(row, nameCol);
      if (full.includes("\n")) {
        const parts = full.split(/\n\s*\n/);
        name = parts[0]?.trim() || name;
        description = parts.slice(1).join("\n\n").trim();
      }
    }

    lines.push({
      name,
      description,
      unit: cellText(row, unitCol),
      price: cellText(row, priceCol),
      quantity: cellText(row, qtyCol) || "1",
    });
  }
  return lines;
}
