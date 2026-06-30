import type { ColumnRole } from "./types";
import type { QuoteColumn, QuoteDocument, QuoteRow, QuoteTemplate } from "./types";
import { createDefaultRows, createQuote, emptyParty, emptyQuoter, uid } from "./defaults";

export function docToTemplate(doc: QuoteDocument, savedName: string): QuoteTemplate {
  return {
    version: 2,
    id: uid(),
    savedName,
    kind: "template",
    title: doc.title,
    logoDataUrl: doc.logoDataUrl,
    seller: { ...doc.seller },
    quoter: { ...doc.quoter },
    columns: doc.columns.map((c) => ({ ...c, id: uid() })),
    rowCount: doc.rows.length,
    notes: doc.notes,
    vatRate: doc.vatRate,
    exportOptions: { ...doc.exportOptions },
    primaryColor: doc.primaryColor,
    pdfTemplateId: doc.pdfTemplateId,
    fontFamilyId: doc.fontFamilyId,
    updatedAt: new Date().toISOString(),
  };
}

export function applyTemplate(template: QuoteTemplate, current?: QuoteDocument): QuoteDocument {
  const columns = template.columns.map((c) => ({ ...c, id: uid() }));
  const base = current ?? createQuote({ seller: template.seller });

  return {
    ...base,
    version: 2,
    kind: "quote",
    title: template.title,
    logoDataUrl: template.logoDataUrl,
    seller: { ...template.seller },
    quoter: { ...template.quoter },
    columns,
    rows: createDefaultRows(columns, template.rowCount),
    notes: template.notes,
    vatRate: template.vatRate,
    exportOptions: { ...template.exportOptions },
    primaryColor: template.primaryColor,
    pdfTemplateId: template.pdfTemplateId,
    fontFamilyId: template.fontFamilyId,
    customer: current?.customer ?? emptyParty(),
    updatedAt: new Date().toISOString(),
  };
}

export function insertColumnAt(
  columns: QuoteColumn[],
  rows: QuoteRow[],
  col: QuoteColumn,
  insertIndex: number
): { columns: QuoteColumn[]; rows: QuoteRow[] } {
  const nextColumns = [...columns];
  const idx = Math.max(0, Math.min(insertIndex, nextColumns.length));
  nextColumns.splice(idx, 0, col);
  const nextRows = rows.map((row) => {
    const cells = { ...row.cells };
    if (col.role !== "lineTotal" && col.role !== "index" && col.role !== "vat") cells[col.id] = "";
    return { ...row, cells };
  });
  return { columns: nextColumns, rows: nextRows };
}

export function defaultLabelForRole(role: ColumnRole): string {
  const map: Record<ColumnRole, string> = {
    index: "STT",
    itemName: "Tên hạng mục",
    description: "Mô tả",
    unit: "ĐVT",
    quantity: "SL",
    unitPrice: "Đơn giá",
    lineTotal: "Thành tiền",
    vat: "Thuế GTGT",
    custom: "Cột mới",
  };
  return map[role];
}
