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

/** Trích dòng hàng từ báo giá (giữ số lượng thật — dùng cho dự án). */
export function extractQuoteLineRows(doc: QuoteDocument): QuoteCatalogLine[] {
  const columns = ensureColumnRoles(doc.columns);

  const nameCol = pickColumn(columns, ["itemName"], [
    /ten hang/,
    /ten san pham/,
    /hang muc/,
    /danh muc/,
    /hang hoa/,
  ]);
  const descCol = pickColumn(columns, ["description"], [
    /mo ta/,
    /noi dung/,
    /thong so/,
    /ky thuat/,
    /chi tiet/,
  ]);
  const legacyCol = pickColumn(columns, [], [/noi dung/, /mo ta/]);
  const qtyCol = pickColumn(columns, ["quantity"], [/so luong/, /^sl\b/, /khoi luong/]);
  const unitCol = pickColumn(columns, ["unit"], [/dvt/, /don vi/]);
  const priceCol = pickColumn(columns, ["unitPrice"], [/don gia/]);

  const lines: QuoteCatalogLine[] = [];
  for (const row of doc.rows) {
    let name = cellText(row, nameCol);
    let description = cellText(row, descCol);

    if (!name && !description && legacyCol) {
      const full = cellText(row, legacyCol);
      if (full.includes("\n")) {
        const parts = full.split(/\n/);
        name = parts[0]?.trim() ?? "";
        description = parts.slice(1).join("\n").trim();
      } else {
        name = full;
        description = full;
      }
    }

    if (!name || name === "—" || name === "-") continue;

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

/** Danh mục SP: luôn SL = 1, lưu đơn giá + mô tả. */
export function extractCatalogLinesFromQuote(doc: QuoteDocument): QuoteCatalogLine[] {
  return extractQuoteLineRows(doc).map((line) => ({
    ...line,
    quantity: "1",
  }));
}
