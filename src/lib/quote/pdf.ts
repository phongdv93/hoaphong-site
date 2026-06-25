import type { QuoteDocument, QuoteParty } from "./types";
import {
  calcTotalVat,
  columnsForExport,
  computeSignaturePrintSize,
  formatVnMoney,
  getLineTotalDisplay,
  getSttDisplay,
  getUnitPriceDisplay,
  getVatDisplay,
  parseVatRate,
  rowsForExport,
} from "./calc";
import { getFontFamily } from "./pdf-fonts";
import {
  addImageFit,
  detectImageFormat,
  drawPageFooter,
  hasItalicFont,
  loadDocFonts,
} from "./pdf-shared";
import { hexToRgb, lightenRgb, normalizePrimary } from "./theme";
import { getPdfTemplateMeta } from "./pdf-templates";
import { drawQuoteLayoutHeader, tableStylesForLayout } from "./pdf-layout-draw";
import { normalizePageOrientation, PAGE_MARGIN_MM } from "./page-spec";

const FOOTER_H = 10;
/** Chiều cao mỗi dòng nội dung party (mm) */
const PARTY_LINE_H = 4.1;
/** Cột label cố định — value thẳng hàng, dễ đọc */
const PARTY_LABEL_W = 21;

type PartyLine = {
  label: string;
  value: string;
  company?: boolean;
};

function partyLines(party: QuoteParty): PartyLine[] {
  const t = (v: string | undefined | null) => (v ?? "").trim();
  const lines: PartyLine[] = [];
  if (t(party.company)) lines.push({ label: "Công ty:", value: t(party.company), company: true });
  if (t(party.name)) lines.push({ label: "Người liên hệ:", value: t(party.name) });
  if (t(party.address)) lines.push({ label: "Địa chỉ:", value: t(party.address) });
  if (t(party.phone)) lines.push({ label: "Điện thoại:", value: t(party.phone) });
  if (t(party.email)) lines.push({ label: "Email:", value: t(party.email) });
  if (t(party.taxCode)) lines.push({ label: "Mã số thuế:", value: t(party.taxCode) });
  if (t(party.bankName)) lines.push({ label: "Ngân hàng:", value: t(party.bankName) });
  if (t(party.bankAccount)) lines.push({ label: "STK:", value: t(party.bankAccount) });
  return lines;
}

function setLabelFont(pdf: import("jspdf").jsPDF, hasItalic: boolean) {
  if (hasItalic) {
    pdf.setFont("DocFont", "italic");
  } else {
    pdf.setFont("DocFont", "bold");
  }
  pdf.setFontSize(7.2);
  pdf.setTextColor(28, 28, 28);
}

function partyBlock(
  pdf: import("jspdf").jsPDF,
  x: number,
  y: number,
  w: number,
  heading: string,
  party: QuoteParty,
  primary: [number, number, number],
  hasItalic: boolean,
  lightText = false
) {
  pdf.setFont("DocFont", "bold");
  pdf.setFontSize(7.5);
  if (lightText) {
    pdf.setTextColor(255, 255, 255);
  } else {
    pdf.setTextColor(primary[0], primary[1], primary[2]);
  }
  pdf.text(heading, x, y);

  let cy = y + 4.5;
  for (const line of partyLines(party)) {
    setLabelFont(pdf, hasItalic);
    if (lightText) pdf.setTextColor(230, 230, 230);
    pdf.text(line.label, x, cy);
    const valueW = w - PARTY_LABEL_W;

    pdf.setFont("DocFont", line.company ? "bold" : "normal");
    pdf.setFontSize(line.company ? 9 : 8.5);
    if (lightText) {
      pdf.setTextColor(255, 255, 255);
    } else {
      pdf.setTextColor(15, 15, 15);
    }

    const wrapped = pdf.splitTextToSize(line.value, valueW);
    pdf.text(wrapped, x + PARTY_LABEL_W, cy);
    cy += Math.max(1, wrapped.length) * PARTY_LINE_H + 0.5;
  }
  return cy;
}

async function drawQuoterBlock(
  pdf: import("jspdf").jsPDF,
  doc: QuoteDocument,
  colX: number,
  colW: number,
  zoneTop: number
) {
  const cx = colX + colW / 2;
  let y = zoneTop + 2;

  pdf.setFont("DocFont", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(50, 50, 50);
  pdf.text("NGƯỜI BÁO GIÁ", cx, y, { align: "center" });
  y += 5;

  if (doc.quoter.title) {
    pdf.setFont("DocFont", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(40, 40, 40);
    pdf.text(doc.quoter.title, cx, y, { align: "center" });
    y += 4.5;
  }

  if (doc.quoter.signatureDataUrl) {
    try {
      const scale = doc.quoter.signatureScale ?? 1;
      const size = await computeSignaturePrintSize(doc.quoter.signatureDataUrl, scale);
      const fmt = detectImageFormat(doc.quoter.signatureDataUrl);
      pdf.addImage(doc.quoter.signatureDataUrl, fmt, cx - size.w / 2, y, size.w, size.h);
      y += size.h + 3;
    } catch {
      y += 6;
    }
  } else {
    y += 4;
  }

  if (doc.quoter.name) {
    pdf.setFont("DocFont", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(10, 10, 10);
    pdf.text(doc.quoter.name, cx, y, { align: "center" });
  }
}

type FootCell = { content: string; colSpan?: number; styles?: Record<string, unknown> };

function buildFootRows(
  exportCols: ReturnType<typeof columnsForExport>,
  grandTotal: number,
  totalVat: number,
  payable: number,
  vatRate: number,
  showTotal: boolean,
  primary: [number, number, number],
  primaryRow: [number, number, number],
  primarySoft: [number, number, number]
): FootCell[][] {
  if (!showTotal) return [];

  const lineTotalIdx = exportCols.findIndex((c) => c.role === "lineTotal");
  const vatIdx = exportCols.findIndex((c) => c.role === "vat");
  const rows: FootCell[][] = [];
  const labelStyle = { halign: "right" as const, fillColor: primaryRow, textColor: primary, fontStyle: "bold" };
  const moneyStyle = {
    halign: "right" as const,
    fillColor: primaryRow,
    textColor: [10, 10, 10] as [number, number, number],
    fontStyle: "bold" as const,
  };
  const emptyStyle = { fillColor: primaryRow };

  if (lineTotalIdx >= 0) {
    const beforeRow: FootCell[] = [
      { content: "Tổng trước thuế", colSpan: Math.max(1, lineTotalIdx), styles: labelStyle },
      { content: formatVnMoney(grandTotal) || "0", styles: moneyStyle },
    ];
    for (let i = lineTotalIdx + 1; i < exportCols.length; i++) {
      beforeRow.push({ content: "", styles: emptyStyle });
    }
    rows.push(beforeRow);

    if (vatRate > 0) {
      const taxRow: FootCell[] = [
        {
          content: `Thuế GTGT (${vatRate}%)`,
          colSpan: Math.max(1, lineTotalIdx),
          styles: labelStyle,
        },
      ];
      if (vatIdx > lineTotalIdx) {
        for (let i = lineTotalIdx; i < vatIdx; i++) {
          taxRow.push({ content: "", styles: emptyStyle });
        }
        taxRow.push({ content: formatVnMoney(totalVat) || "0", styles: moneyStyle });
        for (let i = vatIdx + 1; i < exportCols.length; i++) {
          taxRow.push({ content: "", styles: emptyStyle });
        }
      } else {
        taxRow.push({ content: formatVnMoney(totalVat) || "0", styles: moneyStyle });
        for (let i = lineTotalIdx + 1; i < exportCols.length; i++) {
          taxRow.push({ content: "", styles: emptyStyle });
        }
      }
      rows.push(taxRow);
    }

    rows.push([
      {
        content: "Tổng sau thuế",
        colSpan: Math.max(1, lineTotalIdx),
        styles: { ...labelStyle, fillColor: primarySoft },
      },
      {
        content: formatVnMoney(payable) || "0",
        colSpan: Math.max(1, exportCols.length - lineTotalIdx),
        styles: {
          halign: "right",
          fillColor: primarySoft,
          textColor: [10, 10, 10],
          fontStyle: "bold",
        },
      },
    ]);
  } else {
    rows.push([
      { content: "Tổng trước thuế", colSpan: Math.max(1, exportCols.length - 1), styles: labelStyle },
      { content: formatVnMoney(grandTotal) || "0", styles: moneyStyle },
    ]);
  }

  return rows;
}

function cellText(
  col: ReturnType<typeof columnsForExport>[number],
  row: QuoteDocument["rows"][number],
  rowIndex: number,
  allColumns: QuoteDocument["columns"],
  vatRate: number
): string {
  if (col.role === "index") return getSttDisplay(rowIndex);
  if (col.role === "lineTotal") return getLineTotalDisplay(row, allColumns);
  if (col.role === "vat") return getVatDisplay(row, allColumns, vatRate);
  if (col.role === "unitPrice") return getUnitPriceDisplay(row.cells[col.id] ?? "");
  return row.cells[col.id] ?? "";
}

export async function exportQuotePdf(
  doc: QuoteDocument,
  grandTotal: number,
  filename: string
) {
  const id = doc.pdfTemplateId || "classic";
  if (id === "hoaphong") {
    const mod = await import("./pdf-hoaphong");
    return mod.exportQuotePdfHoaphong(doc, grandTotal, filename);
  }
  return exportQuotePdfClassic(doc, grandTotal, filename);
}

async function exportQuotePdfClassic(
  doc: QuoteDocument,
  grandTotal: number,
  filename: string
) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default;

  const pdf = new jsPDF({
    orientation: normalizePageOrientation(doc.exportOptions.pageOrientation) === "landscape" ? "l" : "p",
    unit: "mm",
    format: "a4",
  });
  const family = getFontFamily(doc.fontFamilyId);
  await loadDocFonts(pdf, family);
  const hasItalic = hasItalicFont();

  const primaryHex = normalizePrimary(doc.primaryColor);
  const primary = hexToRgb(primaryHex);
  const primarySoft = lightenRgb(primary, 0.9);
  const primaryRow = lightenRgb(primary, 0.82);

  const vatRate = parseVatRate(doc.vatRate);
  const totalVat = calcTotalVat(doc.rows, doc.columns, vatRate);
  const payable = grandTotal + totalVat;

  const exportCols = columnsForExport(doc);
  const exportBodyRows = rowsForExport(doc.rows, doc.columns);
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = PAGE_MARGIN_MM.left;
  const templateMeta = getPdfTemplateMeta(doc.pdfTemplateId);
  const layoutVariant = templateMeta.preview;

  if (doc.logoDataUrl && layoutVariant === "classic") {
    try {
      await addImageFit(pdf, doc.logoDataUrl, margin, margin, 32, 18);
    } catch {
      /* skip */
    }
  }

  const layout = drawQuoteLayoutHeader({
    pdf,
    doc,
    variant: layoutVariant,
    primary,
    primarySoft,
    pageW,
    margin,
    hasItalic,
    partyBlock,
  });

  const y = layout.y;
  const tableW = pageW - layout.tableMarginLeft - layout.tableMarginRight;

  const head = [exportCols.map((c) => c.label)];
  const body = exportBodyRows.map((row, rowIndex) =>
    exportCols.map((col) => cellText(col, row, rowIndex, doc.columns, vatRate))
  );

  const showTotal = doc.exportOptions.showLineTotal;
  const footRows = buildFootRows(
    exportCols,
    grandTotal,
    totalVat,
    payable,
    vatRate,
    showTotal,
    primary,
    primaryRow,
    primarySoft
  );

  const tbl = tableStylesForLayout(layoutVariant, primary, primarySoft);
  const colW = (pageW - margin * 2) / 2 - 6;
  const rightColX = margin + colW + 12;

  autoTable(pdf, {
    startY: y,
    head,
    body,
    foot: footRows.length ? footRows : undefined,
    margin: { left: layout.tableMarginLeft, right: layout.tableMarginRight },
    tableWidth: tableW,
    styles: {
      font: "DocFont",
      fontStyle: "normal",
      fontSize: tbl.fontSize,
      cellPadding: layoutVariant === "compact" ? 1.8 : 2.5,
      lineColor: tbl.lineColor,
      lineWidth: tbl.lineWidth,
      textColor: [20, 20, 20],
      overflow: "linebreak",
    },
    headStyles: {
      font: "DocFont",
      fontStyle: "bold",
      fillColor: tbl.headStyles.fillColor,
      textColor: tbl.headStyles.textColor,
      fontSize: tbl.headStyles.fontSize,
    },
    footStyles: {
      font: "DocFont",
      fontStyle: "bold",
      fontSize: tbl.fontSize,
    },
    alternateRowStyles: tbl.alternateRow ? { fillColor: [250, 250, 250] } : undefined,
    columnStyles: Object.fromEntries(
      exportCols.map((col, i) => [
        i,
        col.role === "quantity" || col.role === "unitPrice" || col.role === "lineTotal" || col.role === "vat"
          ? { halign: "right" }
          : col.role === "index"
            ? { halign: "center", cellWidth: 10 }
            : {},
      ])
    ),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let notesY = ((pdf as any).lastAutoTable?.finalY as number | undefined) ?? y + 20;
  notesY += 8;

  if (doc.notes.trim()) {
    if (notesY > pageH - FOOTER_H - 50) {
      pdf.addPage();
      notesY = margin;
    }
    pdf.setFont("DocFont", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(primary[0], primary[1], primary[2]);
    pdf.text("Ghi chú", margin, notesY);
    notesY += 5;
    pdf.setFont("DocFont", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(35, 35, 35);
    const noteLines = pdf.splitTextToSize(doc.notes, pageW - margin * 2);
    pdf.text(noteLines, margin, notesY);
    notesY += noteLines.length * PARTY_LINE_H + 3;
  }

  const quoterBlockH = estimateQuoterBlockHeight(doc);
  if (notesY + quoterBlockH > pageH - FOOTER_H - 4) {
    pdf.addPage();
    notesY = margin + 4;
  }

  await drawQuoterBlock(pdf, doc, rightColX, colW, notesY);
  drawPageFooter(pdf, pageW, pageH);

  pdf.save(filename);
}

function estimateQuoterBlockHeight(doc: QuoteDocument): number {
  const hasSig = Boolean(doc.quoter.signatureDataUrl);
  const hasTitle = Boolean(doc.quoter.title);
  const hasName = Boolean(doc.quoter.name);
  const scale = doc.quoter.signatureScale ?? 1;
  const sigImgH = hasSig ? Math.max(20, 37 * scale) : 0;
  return (
    8 /* "NGƯỜI BÁO GIÁ" heading + margin */ +
    (hasTitle ? 5 : 0) +
    sigImgH +
    (hasName ? 8 : 0) +
    4
  );
}
