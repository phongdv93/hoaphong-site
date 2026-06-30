import type { ColumnRole, QuoteColumn, QuoteDocument, QuoteExportOptions, QuoteTemplate } from "./types";
import { createColumn, defaultExportOptions, normalizeParty, normalizeQuoter } from "./defaults";
import { normalizePageOrientation } from "./page-spec";
import { normalizePdfTemplateId } from "./pdf-templates";
import { normalizeFontFamilyId } from "./pdf-fonts";
import { normalizePrimary } from "./theme";

export function guessColumnRole(label: string): ColumnRole {
  const n = label
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
  if (/^(stt|#|no\.?)$/.test(n)) return "index";
  if (/thue gtgt|thuế gtgt|vat\b/.test(n)) return "vat";
  if (/thanh tien|thành tiền|line total|amount/.test(n)) return "lineTotal";
  if (/don gia|đơn giá|unit price|gia\b/.test(n) && !/thanh/.test(n)) return "unitPrice";
  if (/^(sl|so luong|số lượng|qty|quantity)\b/.test(n)) return "quantity";
  if (/^(dvt|đvt|don vi|đơn vị)\b/.test(n)) return "unit";
  if (/ten hang|tên hàng|hang muc|hạng mục|ten san pham|tên sp\b/.test(n)) return "itemName";
  if (/mo ta|mô tả|description|thong so|thông số|ky thuat|kỹ thuật/.test(n)) return "description";
  if (/noi dung|nội dung|danh muc|danh mục|hang hoa|hàng hóa/.test(n)) return "itemName";
  return "custom";
}

export function ensureColumnRoles(columns: QuoteColumn[]): QuoteColumn[] {
  return columns.map((col) => ({
    ...col,
    role: col.role ?? guessColumnRole(col.label),
  }));
}

/** Bổ sung cột VAT (ngay trước Thành tiền) nếu thiếu (bản lưu cũ). */
export function ensureVatColumn(columns: QuoteColumn[]): QuoteColumn[] {
  if (columns.some((c) => c.role === "vat")) return columns;
  const lineIdx = columns.findIndex((c) => c.role === "lineTotal");
  const vatCol = createColumn("Thuế GTGT", "vat");
  if (lineIdx >= 0) {
    const next = [...columns];
    next.splice(lineIdx, 0, vatCol);
    return next;
  }
  return [...columns, vatCol];
}

/** Di chuyển cột VAT về ngay trước cột Thành tiền nếu đang nằm sau (bản lưu cũ). */
export function reorderVatBeforeLineTotal(columns: QuoteColumn[]): QuoteColumn[] {
  const vatIdx = columns.findIndex((c) => c.role === "vat");
  const lineIdx = columns.findIndex((c) => c.role === "lineTotal");
  if (vatIdx < 0 || lineIdx < 0 || vatIdx <= lineIdx) return columns;
  const next = [...columns];
  const [vat] = next.splice(vatIdx, 1);
  const newLineIdx = next.findIndex((c) => c.role === "lineTotal");
  next.splice(newLineIdx, 0, vat);
  return next;
}

/** Chuẩn hóa bản lưu cũ (v1) → v2 */
export function normalizeQuoteDocument(raw: Record<string, unknown>): QuoteDocument {
  const exportOptions = {
    ...defaultExportOptions(),
    ...((raw.exportOptions as object) ?? {}),
    pageOrientation: normalizePageOrientation(
      (raw.exportOptions as { pageOrientation?: string } | undefined)?.pageOrientation
    ),
  };
  const columns = applyLegacyExportFlagsToColumns(
    reorderVatBeforeLineTotal(
      ensureVatColumn(ensureColumnRoles((raw.columns as QuoteColumn[]) ?? []))
    ),
    exportOptions
  );
  return {
    version: 2,
    id: (raw.id as string) ?? crypto.randomUUID(),
    savedName: (raw.savedName as string) ?? "Báo giá",
    kind: "quote",
    title: (raw.title as string) ?? "BÁO GIÁ",
    quoteNumber: (raw.quoteNumber as string) ?? "",
    quoteDate: (raw.quoteDate as string) ?? new Date().toISOString().slice(0, 10),
    logoDataUrl: (raw.logoDataUrl as string | null) ?? null,
    seller: normalizeParty(raw.seller),
    customer: normalizeParty(raw.customer),
    quoter: normalizeQuoter(raw.quoter),
    columns,
    rows: (raw.rows as QuoteDocument["rows"]) ?? [],
    notes: (raw.notes as string) ?? "",
    vatRate: (raw.vatRate as string) ?? "10",
    exportOptions,
    primaryColor: normalizePrimary(raw.primaryColor as string | undefined),
    pdfTemplateId: normalizePdfTemplateId(raw.pdfTemplateId as string | undefined),
    fontFamilyId: normalizeFontFamilyId(raw.fontFamilyId as string | undefined),
    updatedAt: (raw.updatedAt as string) ?? new Date().toISOString(),
  };
}

export function normalizeTemplate(raw: Record<string, unknown>): QuoteTemplate {
  const exportOptions = {
    ...defaultExportOptions(),
    ...((raw.exportOptions as object) ?? {}),
    pageOrientation: normalizePageOrientation(
      (raw.exportOptions as { pageOrientation?: string } | undefined)?.pageOrientation
    ),
  };
  const columns = applyLegacyExportFlagsToColumns(
    reorderVatBeforeLineTotal(
      ensureVatColumn(ensureColumnRoles((raw.columns as QuoteColumn[]) ?? []))
    ),
    exportOptions
  );
  return {
    version: 2,
    id: (raw.id as string) ?? crypto.randomUUID(),
    savedName: (raw.savedName as string) ?? "Template",
    kind: "template",
    title: (raw.title as string) ?? "BÁO GIÁ",
    logoDataUrl: (raw.logoDataUrl as string | null) ?? null,
    seller: normalizeParty(raw.seller),
    quoter: normalizeQuoter(raw.quoter),
    columns,
    rowCount: (raw.rowCount as number) ?? 5,
    notes: (raw.notes as string) ?? "",
    vatRate: (raw.vatRate as string) ?? "10",
    exportOptions,
    primaryColor: normalizePrimary(raw.primaryColor as string | undefined),
    pdfTemplateId: normalizePdfTemplateId(raw.pdfTemplateId as string | undefined),
    fontFamilyId: normalizeFontFamilyId(raw.fontFamilyId as string | undefined),
    updatedAt: (raw.updatedAt as string) ?? new Date().toISOString(),
  };
}

export function isColumnHiddenOnExport(col: QuoteColumn): boolean {
  return Boolean(col.hiddenOnExport);
}

/** Gắn hiddenOnExport từ bản lưu cũ (showUnitPrice / showLineTotal). */
export function applyLegacyExportFlagsToColumns(
  columns: QuoteColumn[],
  exportOptions: QuoteExportOptions
): QuoteColumn[] {
  return columns.map((col) => ({
    ...col,
    hiddenOnExport:
      col.hiddenOnExport ??
      ((col.role === "unitPrice" && !exportOptions.showUnitPrice) ||
        (col.role === "lineTotal" && !exportOptions.showLineTotal)),
  }));
}

export function exportShowsLineTotal(doc: QuoteDocument): boolean {
  return doc.columns.some((c) => c.role === "lineTotal" && !c.hiddenOnExport);
}

export function columnsForExport(doc: QuoteDocument): QuoteColumn[] {
  return doc.columns.filter((col) => !isColumnHiddenOnExport(col));
}

export function parseVnNumber(raw: string): number {
  const s = raw?.trim();
  if (!s) return 0;
  const cleaned = s.replace(/\s/g, "").replace(/[^\d.,-]/g, "");
  if (!cleaned) return 0;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = cleaned.split(",");
    normalized = parts.length === 2 && parts[1].length <= 2 ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (hasDot) {
    const parts = cleaned.split(".");
    normalized = parts.length === 2 && parts[1].length <= 2 ? cleaned : cleaned.replace(/\./g, "");
  }

  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function formatVnMoney(value: number): string {
  if (!value) return "";
  return new Intl.NumberFormat("vi-VN").format(Math.round(value));
}

export function findColumn(columns: QuoteColumn[], role: ColumnRole): QuoteColumn | undefined {
  return columns.find((c) => c.role === role);
}

export function calcLineTotal(row: QuoteDocument["rows"][0], columns: QuoteColumn[]): number {
  const qtyCol = findColumn(columns, "quantity");
  const priceCol = findColumn(columns, "unitPrice");
  if (!qtyCol || !priceCol) return 0;
  return parseVnNumber(row.cells[qtyCol.id] ?? "") * parseVnNumber(row.cells[priceCol.id] ?? "");
}

export function calcGrandTotal(rows: QuoteDocument["rows"], columns: QuoteColumn[]): number {
  return rows.reduce((sum, row) => sum + calcLineTotal(row, columns), 0);
}

export function getSttDisplay(rowIndex: number): string {
  return String(rowIndex + 1);
}

export function getLineTotalDisplay(row: QuoteDocument["rows"][0], columns: QuoteColumn[]): string {
  const total = calcLineTotal(row, columns);
  return total ? formatVnMoney(total) : "";
}

export function getUnitPriceDisplay(raw: string): string {
  const n = parseVnNumber(raw);
  return n ? formatVnMoney(n) : raw.trim();
}

/** Con dấu tròn in ra đường kính chuẩn (mm) */
export const SEAL_DIAMETER_MM = 37;

/** Kích thước in chữ ký/con dấu (mm), giữ tỷ lệ gốc */
export async function computeSignaturePrintSize(
  dataUrl: string,
  scale: number
): Promise<{ w: number; h: number }> {
  const { loadImageSize, fitAspectBox } = await import("./images");
  const natural = await loadImageSize(dataUrl);
  const ratio = natural.w / natural.h;
  const isSeal = ratio >= 0.72 && ratio <= 1.38;
  const s = Math.max(0.4, Math.min(2.5, scale || 1));

  if (isSeal) {
    const d = SEAL_DIAMETER_MM * s;
    if (ratio >= 1) return { w: d, h: d / ratio };
    return { w: d * ratio, h: d };
  }

  return fitAspectBox(natural.w, natural.h, 52 * s, 26 * s);
}

export function parseVatRate(raw: string): number {
  const n = parseVnNumber(raw);
  return n > 0 && n <= 100 ? n : 0;
}

export function calcRowVat(
  row: QuoteDocument["rows"][0],
  columns: QuoteColumn[],
  vatRatePercent: number
): number {
  if (!vatRatePercent) return 0;
  return (calcLineTotal(row, columns) * vatRatePercent) / 100;
}

export function calcTotalVat(
  rows: QuoteDocument["rows"],
  columns: QuoteColumn[],
  vatRatePercent: number
): number {
  return rows.reduce((sum, row) => sum + calcRowVat(row, columns, vatRatePercent), 0);
}

export function getVatDisplay(
  row: QuoteDocument["rows"][0],
  columns: QuoteColumn[],
  vatRatePercent: number
): string {
  const v = calcRowVat(row, columns, vatRatePercent);
  return v ? formatVnMoney(v) : "";
}

/** Dòng không có nội dung — bỏ khi xuất PDF */
export function isRowEmpty(row: QuoteDocument["rows"][0], columns: QuoteColumn[]): boolean {
  for (const col of columns) {
    if (col.role === "index" || col.role === "lineTotal" || col.role === "vat") continue;
    if ((row.cells[col.id] ?? "").trim()) return false;
  }
  return calcLineTotal(row, columns) === 0;
}

export function rowsForExport(rows: QuoteDocument["rows"], columns: QuoteColumn[]): QuoteDocument["rows"] {
  return rows.filter((row) => !isRowEmpty(row, columns));
}
