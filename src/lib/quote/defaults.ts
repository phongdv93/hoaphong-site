import { DEFAULT_PRIMARY } from "./theme";
import { DEFAULT_PDF_TEMPLATE_ID } from "./pdf-templates";
import { DEFAULT_FONT_FAMILY_ID } from "./pdf-fonts";
import type {
  ColumnRole,
  QuoteColumn,
  QuoteDocument,
  QuoteExportOptions,
  QuoteParty,
  QuoterInfo,
  QuoteRow,
  QuoteTemplate,
} from "./types";

export function uid() {
  return crypto.randomUUID();
}

export function emptyParty(): QuoteParty {
  return {
    name: "",
    company: "",
    address: "",
    phone: "",
    email: "",
    taxCode: "",
    bankName: "",
    bankAccount: "",
  };
}

export function emptyQuoter(): QuoterInfo {
  return { name: "", title: "", signatureDataUrl: null, signatureScale: 1 };
}

export function normalizeParty(raw: unknown): QuoteParty {
  const p = { ...emptyParty(), ...((raw as Partial<QuoteParty>) ?? {}) };
  return {
    name: p.name ?? "",
    company: p.company ?? "",
    address: p.address ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    taxCode: p.taxCode ?? "",
    bankName: p.bankName ?? "",
    bankAccount: p.bankAccount ?? "",
  };
}

export function normalizeQuoter(raw: unknown): QuoterInfo {
  const q = { ...emptyQuoter(), ...((raw as Partial<QuoterInfo>) ?? {}) };
  const scale = Number(q.signatureScale);
  return {
    name: q.name ?? "",
    title: q.title ?? "",
    signatureDataUrl: q.signatureDataUrl ?? null,
    signatureScale: Number.isFinite(scale) && scale > 0 ? scale : 1,
  };
}

export function defaultExportOptions(): QuoteExportOptions {
  return { showUnitPrice: true, showLineTotal: true, pageOrientation: "portrait" };
}

export function createColumn(label: string, role: ColumnRole = "custom"): QuoteColumn {
  return { id: uid(), label, role };
}

export function createRow(columns: QuoteColumn[]): QuoteRow {
  const cells: Record<string, string> = {};
  for (const col of columns) {
    if (col.role !== "lineTotal" && col.role !== "index" && col.role !== "vat") cells[col.id] = "";
  }
  return { id: uid(), cells };
}

const DEFAULT_COLUMNS: { label: string; role: ColumnRole }[] = [
  { label: "STT", role: "index" },
  { label: "Nội dung / mô tả", role: "description" },
  { label: "ĐVT", role: "unit" },
  { label: "SL", role: "quantity" },
  { label: "Đơn giá", role: "unitPrice" },
  { label: "Thuế GTGT", role: "vat" },
  { label: "Thành tiền", role: "lineTotal" },
];

export function createDefaultColumns(): QuoteColumn[] {
  return DEFAULT_COLUMNS.map((c) => createColumn(c.label, c.role));
}

export function createDefaultRows(columns: QuoteColumn[], count = 5): QuoteRow[] {
  return Array.from({ length: count }, () => createRow(columns));
}

export function createQuote(partial?: {
  seller?: Partial<QuoteParty>;
  savedName?: string;
}): QuoteDocument {
  const columns = createDefaultColumns();
  const now = new Date();
  const quoteDate = now.toISOString().slice(0, 10);
  const quoteNumber = `BG-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

  return {
    version: 2,
    id: uid(),
    savedName: partial?.savedName ?? "Báo giá mới",
    kind: "quote",
    title: "BÁO GIÁ",
    quoteNumber,
    quoteDate,
    logoDataUrl: null,
    seller: { ...emptyParty(), ...partial?.seller },
    customer: emptyParty(),
    quoter: emptyQuoter(),
    columns,
    rows: createDefaultRows(columns),
    notes: "Báo giá có hiệu lực trong 15 ngày kể từ ngày phát hành.",
    vatRate: "10",
    exportOptions: defaultExportOptions(),
    primaryColor: DEFAULT_PRIMARY,
    pdfTemplateId: DEFAULT_PDF_TEMPLATE_ID,
    fontFamilyId: DEFAULT_FONT_FAMILY_ID,
    updatedAt: now.toISOString(),
  };
}

export function syncRowsWithColumns(rows: QuoteRow[], columns: QuoteColumn[]): QuoteRow[] {
  return rows.map((row) => {
    const cells = { ...row.cells };
    for (const col of columns) {
      if (col.role === "lineTotal" || col.role === "index" || col.role === "vat") {
        delete cells[col.id];
        continue;
      }
      if (!(col.id in cells)) cells[col.id] = "";
    }
    for (const key of Object.keys(cells)) {
      if (!columns.some((c) => c.id === key && c.role !== "lineTotal" && c.role !== "index" && c.role !== "vat"))
        delete cells[key];
    }
    return { ...row, cells };
  });
}

export function isQuoteTemplate(item: QuoteDocument | QuoteTemplate): item is QuoteTemplate {
  return item.kind === "template";
}
