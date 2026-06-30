import { parseVnNumber } from "./calc";
import { extractCatalogLinesFromQuote } from "./to-catalog";
import type { QuoteDocument } from "./types";

export type QuoteProjectItemRow = {
  name: string;
  description: string;
  quantity: number;
};

/** Hạng mục dự án từ báo giá — chỉ tên, mô tả, số lượng. */
export function extractProjectItemsFromQuote(doc: QuoteDocument): QuoteProjectItemRow[] {
  return extractCatalogLinesFromQuote(doc).map((line) => ({
    name: line.name,
    description: line.description,
    quantity: parseVnNumber(line.quantity) || 1,
  }));
}

export function mergeQuoteProjectItems(docs: QuoteDocument[]): QuoteProjectItemRow[] {
  const out: QuoteProjectItemRow[] = [];
  for (const doc of docs) {
    out.push(...extractProjectItemsFromQuote(doc));
  }
  return out;
}
