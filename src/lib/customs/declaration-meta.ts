/** Trường mở rộng tờ khai IDA (VNACCS) — lưu JSONB. */
export interface DeclarationMeta {
  partyClassification?: string;
  exporterName?: string;
  exporterAddress?: string;
  exporterCountry?: string;
  exporterPhone?: string;
  importerAddress?: string;
  importerPhone?: string;
  packageCount?: number;
  grossWeightKg?: number;
  paymentRemark?: string;
  invoiceClassification?: string;
  valuationClassification?: string;
  taxDeadlineCode?: string;
  transportMeansName?: string;
}

export function parseDeclarationMeta(raw: unknown): DeclarationMeta {
  if (!raw || typeof raw !== "object") return {};
  return raw as DeclarationMeta;
}

export function emptyDeclarationMeta(): DeclarationMeta {
  return {};
}
