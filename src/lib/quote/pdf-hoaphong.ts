import type { QuoteColumn, QuoteDocument, QuoteParty } from "./types";
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
import { hexToRgb, normalizePrimary } from "./theme";
import {
  addImageFit,
  detectImageFormat,
  drawPageFooter,
  formatVnLongDate,
  hasItalicFont,
  loadDocFonts,
} from "./pdf-shared";
import { normalizePageOrientation, PAGE_MARGIN_MM } from "./page-spec";

const FOOTER_H = 10;
const GREEN_DATE: [number, number, number] = [21, 128, 61];
const NEUTRAL_BG: [number, number, number] = [250, 248, 242];

function enLabelForColumn(col: QuoteColumn): string {
  const byRole: Record<string, string> = {
    index: "No",
    description: "Items",
    unit: "Unit",
    quantity: "QTY",
    unitPrice: "Price",
    lineTotal: "Amount",
    vat: "Tax",
  };
  if (col.role && col.role !== "custom" && byRole[col.role]) return byRole[col.role];

  const n = col.label.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim();
  const guess: Record<string, string> = {
    stt: "No",
    "hang muc": "Items",
    "ten hang": "Items",
    "noi dung": "Items",
    "noi dung / mo ta": "Items",
    "mo ta": "Description",
    dvt: "Unit",
    "don vi": "Unit",
    "don vi tinh": "Unit",
    sl: "QTY",
    "so luong": "QTY",
    "don gia": "Price",
    "thanh tien": "Amount",
    "thue gtgt": "Tax",
    vat: "Tax",
    dai: "Length",
    rong: "Width",
    sau: "Depth",
    cao: "Height",
    "kich thuoc": "Dim.",
    "ghi chu": "Notes",
  };
  return guess[n] ?? "";
}

function partyFieldList(party: QuoteParty, isCustomer: boolean): { label: string; value: string }[] {
  const t = (v: string | undefined | null) => (v ?? "").trim();
  const fields: { label: string; value: string }[] = [];
  if (t(party.taxCode)) fields.push({ label: "Mã số thuế:", value: t(party.taxCode) });
  if (t(party.address)) fields.push({ label: "Địa chỉ:", value: t(party.address) });
  if (t(party.phone)) fields.push({ label: "Điện thoại:", value: t(party.phone) });
  if (!isCustomer && t(party.bankAccount)) {
    const bank = t(party.bankName) ? ` tại ngân hàng ${t(party.bankName)}` : "";
    fields.push({ label: "Số tài khoản:", value: `${t(party.bankAccount)}${bank}` });
  }
  if (!isCustomer && t(party.email)) fields.push({ label: "Email:", value: t(party.email) });
  return fields;
}

const BOX_PAD_X = 4;
const BOX_PAD_Y = 3.5;
const BOX_LINE_H = 4.3;
const BOX_LABEL_W = 19;
const BOX_TITLE_LH = 4.8;

type BoxLayout = {
  height: number;
  titleWrap: string[];
  wrappedValues: string[][];
  fields: { label: string; value: string }[];
  headingW: number;
};

function measureInfoBox(
  pdf: import("jspdf").jsPDF,
  w: number,
  heading: string,
  party: QuoteParty,
  isCustomer: boolean
): BoxLayout {
  const fields = partyFieldList(party, isCustomer);
  const valueW = w - BOX_PAD_X * 2 - BOX_LABEL_W;

  pdf.setFont("DocFont", "normal");
  pdf.setFontSize(8);
  let bodyLines = 0;
  const wrappedValues: string[][] = [];
  for (const f of fields) {
    const wrapped = pdf.splitTextToSize(f.value, valueW) as string[];
    wrappedValues.push(wrapped);
    bodyLines += wrapped.length;
  }

  pdf.setFont("DocFont", "bold");
  pdf.setFontSize(8.8);
  const headingW = pdf.getTextWidth(heading) + 1.8;

  pdf.setFontSize(9);
  const titleValueW = w - BOX_PAD_X * 2 - headingW;
  const titleWrap = pdf.splitTextToSize(party.company || "—", titleValueW) as string[];
  const titleLines = Math.max(1, titleWrap.length);

  const height = BOX_PAD_Y * 2 + titleLines * BOX_TITLE_LH + bodyLines * BOX_LINE_H + 1;
  return { height, titleWrap, wrappedValues, fields, headingW };
}

function drawInfoBox(
  pdf: import("jspdf").jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  heading: string,
  layout: BoxLayout,
  primary: [number, number, number],
  bg: [number, number, number]
) {
  pdf.setFillColor(bg[0], bg[1], bg[2]);
  pdf.rect(x, y, w, h, "F");

  let cy = y + BOX_PAD_Y + 3.2;
  pdf.setFont("DocFont", "bold");
  pdf.setFontSize(8.8);
  pdf.setTextColor(primary[0], primary[1], primary[2]);
  pdf.text(heading, x + BOX_PAD_X, cy);

  pdf.setFont("DocFont", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(15, 15, 15);
  pdf.text(layout.titleWrap, x + BOX_PAD_X + layout.headingW, cy);
  cy += layout.titleWrap.length * BOX_TITLE_LH;

  for (let i = 0; i < layout.fields.length; i++) {
    pdf.setFont("DocFont", hasItalicFont() ? "italic" : "normal");
    pdf.setFontSize(7.4);
    pdf.setTextColor(75, 75, 75);
    pdf.text(layout.fields[i].label, x + BOX_PAD_X, cy);

    pdf.setFont("DocLight", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(20, 20, 20);
    pdf.text(layout.wrappedValues[i], x + BOX_PAD_X + BOX_LABEL_W, cy);
    cy += layout.wrappedValues[i].length * BOX_LINE_H;
  }
}

type FootCell = { content: string; colSpan?: number; styles?: Record<string, unknown> };

function buildTotalsFoot(
  exportCols: QuoteColumn[],
  grandTotal: number,
  totalVat: number,
  payable: number,
  vatRate: number,
  showTotal: boolean,
  primary: [number, number, number]
): FootCell[][] {
  if (!showTotal) return [];
  const lineTotalIdx = exportCols.findIndex((c) => c.role === "lineTotal");
  if (lineTotalIdx < 0) return [];

  const labelSpan = Math.min(3, lineTotalIdx > 0 ? lineTotalIdx : 1);
  const leftEmpty = Math.max(0, lineTotalIdx - labelSpan);
  const tailCount = exportCols.length - lineTotalIdx - 1;

  const white: [number, number, number] = [255, 255, 255];
  const noLine = { top: 0, right: 0, bottom: 0, left: 0 };
  // Hai đường kẻ phân cách Tổng↔Thuế và Thuế↔Tổng thanh toán dùng chung độ dày.
  const lightLine = { top: 0.3, right: 0, bottom: 0, left: 0 };
  const strongLine = { top: 0.3, right: 0, bottom: 0, left: 0 };

  const empty: FootCell["styles"] = {
    fillColor: white,
    lineWidth: 0,
  };

  type LineW = { top: number; right: number; bottom: number; left: number };
  const makeRow = (label: string, value: string, lineW: LineW): FootCell[] => {
    const labelStyle: FootCell["styles"] = {
      halign: "right",
      fillColor: white,
      textColor: primary,
      fontStyle: "bold",
      lineColor: primary,
      lineWidth: lineW,
      fontSize: 9,
    };
    const moneyStyle: FootCell["styles"] = {
      halign: "right",
      fillColor: white,
      textColor: [10, 10, 10],
      fontStyle: "bold",
      lineColor: primary,
      lineWidth: lineW,
      fontSize: 9,
    };
    const flank: FootCell["styles"] = {
      fillColor: white,
      lineWidth: 0,
    };

    const row: FootCell[] = [];
    for (let i = 0; i < leftEmpty; i++) row.push({ content: "", styles: empty });
    row.push({ content: label, colSpan: labelSpan, styles: labelStyle });
    row.push({ content: value, styles: moneyStyle });
    for (let i = 0; i < tailCount; i++) row.push({ content: "", styles: flank });
    return row;
  };

  const rows: FootCell[][] = [];
  rows.push(makeRow("Tổng giá trị / Total", formatVnMoney(grandTotal) || "0", noLine));
  if (vatRate > 0) {
    rows.push(makeRow(`Thuế ${vatRate}% / Tax`, formatVnMoney(totalVat) || "0", lightLine));
  }
  rows.push(
    makeRow(
      "Tổng giá trị thanh toán / Grand total",
      formatVnMoney(payable) || "0",
      strongLine
    )
  );

  return rows;
}

function cellText(
  col: QuoteColumn,
  row: QuoteDocument["rows"][number],
  rowIndex: number,
  allColumns: QuoteColumn[],
  vatRate: number
): string {
  if (col.role === "index") return getSttDisplay(rowIndex);
  if (col.role === "lineTotal") return getLineTotalDisplay(row, allColumns);
  if (col.role === "vat") return getVatDisplay(row, allColumns, vatRate);
  if (col.role === "unitPrice") return getUnitPriceDisplay(row.cells[col.id] ?? "");
  return row.cells[col.id] ?? "";
}

async function drawSignatureArea(
  pdf: import("jspdf").jsPDF,
  doc: QuoteDocument,
  margin: number,
  pageW: number,
  y: number
) {
  const halfW = (pageW - margin * 2) / 2;
  const leftCx = margin + halfW / 2;
  const rightCx = margin + halfW + halfW / 2;

  pdf.setFont("DocFont", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(35, 35, 35);
  pdf.text("ĐẠI DIỆN KHÁCH HÀNG", leftCx, y, { align: "center" });
  pdf.text("ĐẠI DIỆN NHÀ CUNG CẤP", rightCx, y, { align: "center" });

  if (doc.quoter.title) {
    pdf.setFont("DocFont", hasItalicFont() ? "italic" : "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(70, 70, 70);
    pdf.text(`(${doc.quoter.title})`, rightCx, y + 4, { align: "center" });
  }

  let sigBottom = y + 14;
  if (doc.quoter.signatureDataUrl) {
    try {
      const scale = doc.quoter.signatureScale ?? 1;
      const size = await computeSignaturePrintSize(doc.quoter.signatureDataUrl, scale);
      const fmt = detectImageFormat(doc.quoter.signatureDataUrl);
      const sx = rightCx - size.w / 2;
      const sy = y + 6;
      pdf.addImage(doc.quoter.signatureDataUrl, fmt, sx, sy, size.w, size.h);
      sigBottom = sy + size.h + 2;
    } catch {
      /* ignore */
    }
  }

  if (doc.quoter.name) {
    pdf.setFont("DocFont", "bold");
    pdf.setFontSize(9.5);
    pdf.setTextColor(10, 10, 10);
    pdf.text(doc.quoter.name, rightCx, sigBottom + 1, { align: "center" });
  }
}

export async function exportQuotePdfHoaphong(
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
  const italic = hasItalicFont();

  const primaryHex = normalizePrimary(doc.primaryColor);
  const primary = hexToRgb(primaryHex);

  const vatRate = parseVatRate(doc.vatRate);
  const totalVat = calcTotalVat(doc.rows, doc.columns, vatRate);
  const payable = grandTotal + totalVat;

  const exportCols = columnsForExport(doc);
  const exportBodyRows = rowsForExport(doc.rows, doc.columns);
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = PAGE_MARGIN_MM.left;

  let y = margin;

  // ===== HEADER =====
  const TITLE_SIZE = 24;
  pdf.setFont("DocFont", "bold");
  pdf.setFontSize(TITLE_SIZE);
  pdf.setTextColor(primary[0], primary[1], primary[2]);
  pdf.text("BÁO GIÁ", margin, y + 8);
  const baoGiaW = pdf.getTextWidth("BÁO GIÁ");

  pdf.setFont("DocFont", "normal");
  pdf.setFontSize(TITLE_SIZE);
  pdf.text("QUOTATIONS", margin + baoGiaW + 4, y + 8);

  pdf.setFont("DocFont", italic ? "italic" : "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(GREEN_DATE[0], GREEN_DATE[1], GREEN_DATE[2]);
  pdf.text(formatVnLongDate(doc.quoteDate), margin, y + 14);

  pdf.setFont("DocFont", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  if (doc.quoteNumber) pdf.text(`Số: ${doc.quoteNumber}`, margin, y + 18.5);

  if (doc.logoDataUrl) {
    try {
      await addImageFit(pdf, doc.logoDataUrl, pageW - margin - 38, y, 38, 20, "right");
    } catch {
      /* skip */
    }
  }

  y += 24;

  // ===== INFO BOXES (equal height) =====
  const gap = 2;
  const boxW = (pageW - margin * 2 - gap) / 2;
  const leftLayout = measureInfoBox(pdf, boxW, "Nhà cung cấp:", doc.seller, false);
  const rightLayout = measureInfoBox(pdf, boxW, "Khách hàng:", doc.customer, true);
  const boxH = Math.max(leftLayout.height, rightLayout.height);
  drawInfoBox(pdf, margin, y, boxW, boxH, "Nhà cung cấp:", leftLayout, primary, NEUTRAL_BG);
  drawInfoBox(pdf, margin + boxW + gap, y, boxW, boxH, "Khách hàng:", rightLayout, primary, NEUTRAL_BG);
  y += boxH + 6;

  // ===== TABLE =====
  const head = [
    exportCols.map((c) => ({
      content: c.label,
      styles: {
        fontStyle: "bold" as const,
        fillColor: primary,
        textColor: [255, 255, 255] as [number, number, number],
        fontSize: 9,
        halign: "center" as const,
        cellPadding: { top: 2.2, right: 2.4, bottom: 0.8, left: 2.4 },
      },
    })),
    exportCols.map((c) => ({
      content: enLabelForColumn(c),
      styles: {
        fontStyle: italic ? ("italic" as const) : ("normal" as const),
        fillColor: primary,
        textColor: [235, 230, 255] as [number, number, number],
        fontSize: 7,
        halign: "center" as const,
        cellPadding: { top: 0, right: 2.4, bottom: 1.4, left: 2.4 },
        lineColor: [255, 255, 255] as [number, number, number],
        lineWidth: { top: 0, right: 0, bottom: 1.3, left: 0 },
      },
    })),
  ];

  const body = exportBodyRows.map((row, rowIndex) =>
    exportCols.map((col) => cellText(col, row, rowIndex, doc.columns, vatRate))
  );

  const footRows = buildTotalsFoot(
    exportCols,
    grandTotal,
    totalVat,
    payable,
    vatRate,
    doc.exportOptions.showLineTotal,
    primary
  );

  let bodyEndY = y;
  autoTable(pdf, {
    startY: y,
    head,
    body,
    foot: footRows.length ? footRows : undefined,
    margin: { left: margin, right: margin },
    tableWidth: pageW - margin * 2,
    didDrawCell: (data: { section: string; cell: { y: number; height: number } }) => {
      if (data.section === "body") {
        const bottom = data.cell.y + data.cell.height;
        if (bottom > bodyEndY) bodyEndY = bottom;
      }
    },
    styles: {
      font: "DocFont",
      fontStyle: "normal",
      fontSize: 9,
      cellPadding: 2.4,
      lineColor: [255, 255, 255],
      lineWidth: { top: 0, right: 0, bottom: 1.3, left: 0 },
      textColor: [25, 25, 25],
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      lineWidth: 0,
    },
    bodyStyles: {
      font: "DocLight",
      fillColor: NEUTRAL_BG,
      minCellHeight: 7,
    },
    alternateRowStyles: { fillColor: NEUTRAL_BG },
    columnStyles: Object.fromEntries(
      exportCols.map((col, i) => [
        i,
        col.role === "index"
          ? { halign: "center", cellWidth: 10 }
          : col.role === "quantity" || col.role === "unit"
            ? { halign: "center", cellWidth: 14 }
            : col.role === "unitPrice" || col.role === "lineTotal" || col.role === "vat"
              ? { halign: "right" }
              : col.role === "description"
                ? { halign: "left" }
                : { halign: "center", cellWidth: 14 },
      ])
    ),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableEndY = ((pdf as any).lastAutoTable?.finalY as number | undefined) ?? y + 20;

  // ===== NOTES (đặt cạnh trái, cách body ~8mm — lấp khoảng trống bên trái totals) =====
  let notesEndY = bodyEndY;
  if (doc.notes.trim()) {
    const notesW = (pageW - margin * 2) * 0.55;
    let cy = bodyEndY + 7.5;

    pdf.setFont("DocFont", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(primary[0], primary[1], primary[2]);
    pdf.text("Ghi chú / Notes:", margin, cy);
    cy += 4;

    pdf.setFont("DocFont", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(35, 35, 35);
    const noteLines = pdf.splitTextToSize(doc.notes, notesW) as string[];
    pdf.text(noteLines, margin, cy);
    cy += noteLines.length * 4.2;
    notesEndY = cy;
  }

  let afterY = Math.max(tableEndY, notesEndY);

  // ===== SIGNATURE AREA =====
  const sigBlockH = estimateSignatureBlockHeight(doc);
  const sigGap = 10;
  if (afterY + sigGap + sigBlockH > pageH - 14) {
    pdf.addPage();
    afterY = margin + 4;
  } else {
    afterY += sigGap;
  }

  await drawSignatureArea(pdf, doc, margin, pageW, afterY);

  drawPageFooter(pdf, pageW, pageH);
  pdf.save(filename);
}

function estimateSignatureBlockHeight(doc: QuoteDocument): number {
  const hasSig = Boolean(doc.quoter.signatureDataUrl);
  const hasTitle = Boolean(doc.quoter.title);
  const hasName = Boolean(doc.quoter.name);
  const scale = doc.quoter.signatureScale ?? 1;
  const sigImgH = hasSig ? Math.max(20, 37 * scale) : 0;
  return (
    6 /* heading line */ +
    (hasTitle ? 5 : 0) +
    sigImgH +
    (hasName ? 6 : 0) +
    4 /* breathing */
  );
}
