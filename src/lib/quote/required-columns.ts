import { ensureColumnRoles } from "./calc";
import type { ColumnRole, QuoteDocument } from "./types";

/** Cột bắt buộc trên báo giá ERP để lưu danh mục SP và tạo dự án. */
export const ERP_QUOTE_REQUIRED_COLUMNS: { role: ColumnRole; label: string }[] = [
  { role: "itemName", label: "Tên hạng mục" },
  { role: "description", label: "Mô tả" },
  { role: "quantity", label: "Số lượng" },
  { role: "unit", label: "Đơn vị tính" },
  { role: "unitPrice", label: "Đơn giá" },
];

export function getMissingQuoteRequiredColumns(doc: QuoteDocument): string[] {
  const columns = ensureColumnRoles(doc.columns);
  return ERP_QUOTE_REQUIRED_COLUMNS.filter(
    ({ role }) => !columns.some((c) => c.role === role)
  ).map(({ label }) => label);
}

export function formatMissingQuoteColumnsMessage(missing: string[]): string {
  if (!missing.length) return "";
  return `Báo giá cần các cột: ${missing.join(", ")}. Thêm cột hoặc đặt đúng vai trò cột trước khi lưu.`;
}
