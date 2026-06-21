export type ColumnRole =
  | "custom"
  | "index"
  | "description"
  | "unit"
  | "quantity"
  | "unitPrice"
  | "lineTotal"
  | "vat";

export type QuoteParty = {
  name: string;
  company: string;
  address: string;
  phone: string;
  email: string;
  taxCode: string;
  bankName: string;
  bankAccount: string;
};

export type QuoterInfo = {
  name: string;
  title: string;
  signatureDataUrl: string | null;
  /** Tỷ lệ chữ ký/con dấu khi in PDF (1 = 100%, con dấu tròn ≈ 37mm) */
  signatureScale: number;
};

export type QuoteExportOptions = {
  showUnitPrice: boolean;
  showLineTotal: boolean;
};

export type QuoteColumn = {
  id: string;
  label: string;
  role?: ColumnRole;
};

export type QuoteRow = {
  id: string;
  cells: Record<string, string>;
};

export type QuoteDocument = {
  version: 2;
  id: string;
  savedName: string;
  kind: "quote";
  title: string;
  quoteNumber: string;
  quoteDate: string;
  logoDataUrl: string | null;
  seller: QuoteParty;
  customer: QuoteParty;
  quoter: QuoterInfo;
  columns: QuoteColumn[];
  rows: QuoteRow[];
  notes: string;
  /** Thuế suất GTGT % — vd. "10" = 10% */
  vatRate: string;
  primaryColor: string;
  exportOptions: QuoteExportOptions;
  /** ID template PDF — "classic" mặc định, hoặc theo email/mã user */
  pdfTemplateId: string;
  /** ID font chữ in PDF — "noto-sans" mặc định */
  fontFamilyId: string;
  updatedAt: string;
};

export type QuoteTemplate = {
  version: 2;
  id: string;
  savedName: string;
  kind: "template";
  title: string;
  logoDataUrl: string | null;
  seller: QuoteParty;
  quoter: QuoterInfo;
  columns: QuoteColumn[];
  rowCount: number;
  notes: string;
  /** Thuế suất GTGT % — vd. "10" = 10% */
  vatRate: string;
  primaryColor: string;
  exportOptions: QuoteExportOptions;
  pdfTemplateId: string;
  fontFamilyId: string;
  updatedAt: string;
};

export type SavedQuoteItem = QuoteDocument | QuoteTemplate;

export type CellAnchor = {
  rowIndex: number;
  colIndex: number;
};

export const COLUMN_ROLE_OPTIONS: { role: ColumnRole; label: string }[] = [
  { role: "custom", label: "Tùy chỉnh" },
  { role: "index", label: "STT" },
  { role: "description", label: "Nội dung / mô tả" },
  { role: "unit", label: "ĐVT" },
  { role: "quantity", label: "Số lượng" },
  { role: "unitPrice", label: "Đơn giá" },
  { role: "lineTotal", label: "Thành tiền" },
  { role: "vat", label: "Thuế GTGT" },
];
