import type { FactoryProductPayload } from "@/lib/factory/types";

export interface ParsedProductPasteRow {
  name: string;
  description: string;
  price: string;
  unit: string;
  brand: string;
}

/** Dán từ Excel: Tên [Tab] Mô tả [Tab] Giá [Tab] ĐVT [Tab] Hãng — hoặc mỗi dòng một tên. */
export function parseProductPaste(text: string): ParsedProductPasteRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: ParsedProductPasteRow[] = [];

  for (const line of lines) {
    const cols = line.split("\t").map((c) => c.trim());
    const name = cols[0] ?? "";
    if (!name || /^tên|name|stt$/i.test(name)) continue;
    rows.push({
      name,
      description: cols[1] ?? "",
      price: cols[2] ?? "",
      unit: cols[3] ?? "cái",
      brand: cols[4] ?? "",
    });
  }

  return rows;
}

export function toProductPayload(row: ParsedProductPasteRow): FactoryProductPayload {
  return {
    name: row.name,
    description: row.description,
    price: row.price,
    unit: row.unit || "cái",
    brand: row.brand,
    status: "active",
  };
}
