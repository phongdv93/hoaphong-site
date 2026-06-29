import { createDefaultRows, createQuote, emptyParty } from "./defaults";
import type { QuoteDocument, QuoteParty } from "./types";

/** Báo giá mới: số/ngày mới, khách trống, bảng trống — giữ cấu hình in & thông tin bên báo giá. */
export function createNewQuoteDocument(options: {
  seller?: Partial<QuoteParty>;
  preserveFrom?: QuoteDocument;
}): QuoteDocument {
  const base = createQuote({ seller: options.seller });
  const prev = options.preserveFrom;
  if (!prev) return base;

  const columns = prev.columns;
  const rows = createDefaultRows(columns, Math.max(5, prev.rows.length));

  return {
    ...base,
    columns,
    rows,
    title: prev.title || base.title,
    seller: { ...emptyParty(), ...prev.seller, ...options.seller },
    customer: emptyParty(),
    primaryColor: prev.primaryColor,
    fontFamilyId: prev.fontFamilyId,
    pdfTemplateId: prev.pdfTemplateId,
    vatRate: prev.vatRate,
    logoDataUrl: prev.logoDataUrl,
    quoter: { ...prev.quoter },
    exportOptions: { ...prev.exportOptions },
    notes: base.notes,
  };
}
