import type { jsPDF } from "jspdf";
import type { QuoteDocument } from "./types";
import { formatQuoteDate } from "./pdf-shared";
import type { PdfTemplatePreviewVariant } from "./pdf-templates";
import { getPrintLayoutConfig } from "./print-layout";

function titleUpper(raw: string): string {
  return (raw || "BÁO GIÁ").toLocaleUpperCase("vi-VN");
}

export type LayoutDrawResult = {
  y: number;
  contentLeft: number;
  contentWidth: number;
  tableMarginLeft: number;
  tableMarginRight: number;
};

type DrawCtx = {
  pdf: jsPDF;
  doc: QuoteDocument;
  variant: PdfTemplatePreviewVariant;
  primary: [number, number, number];
  primarySoft: [number, number, number];
  pageW: number;
  margin: number;
  hasItalic: boolean;
  partyBlock: (
    pdf: jsPDF,
    x: number,
    y: number,
    w: number,
    heading: string,
    party: QuoteDocument["seller"],
    primary: [number, number, number],
    hasItalic: boolean,
    lightText?: boolean
  ) => number;
};

function drawClassicHeader(ctx: DrawCtx): LayoutDrawResult {
  const { pdf, doc, primary, primarySoft, pageW, margin, hasItalic, partyBlock } = ctx;
  const contentRight = pageW - margin;
  let y = margin;

  const titleY = y + 10;
  pdf.setFont("DocFont", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(10, 10, 10);
  pdf.text(titleUpper(doc.title), pageW / 2, titleY, { align: "center" });

  pdf.setFont("DocFont", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(45, 45, 45);
  pdf.text(`Số ${doc.quoteNumber}`, contentRight, titleY - 2, { align: "right" });
  pdf.text(`Ngày ${formatQuoteDate(doc.quoteDate)}`, contentRight, titleY + 1.6, { align: "right" });

  y += 20;
  pdf.setDrawColor(primarySoft[0], primarySoft[1], primarySoft[2]);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageW - margin, y);
  y += 5;

  const colW = (pageW - margin * 2) / 2 - 6;
  const rightColX = margin + colW + 12;
  const leftEnd = partyBlock(pdf, margin, y, colW, "BÊN BÁO GIÁ", doc.seller, primary, hasItalic);
  const rightEnd = partyBlock(pdf, rightColX, y, colW, "KHÁCH HÀNG", doc.customer, primary, hasItalic);
  y = Math.max(leftEnd, rightEnd) + 3;

  return {
    y,
    contentLeft: margin,
    contentWidth: pageW - margin * 2,
    tableMarginLeft: margin,
    tableMarginRight: margin,
  };
}

function drawMinimalHeader(ctx: DrawCtx): LayoutDrawResult {
  const { pdf, doc, margin, pageW, hasItalic, partyBlock, primary } = ctx;
  let y = margin + 4;

  pdf.setFont("DocFont", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(15, 15, 15);
  pdf.text(titleUpper(doc.title), margin, y);
  y += 8;

  pdf.setFont("DocFont", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);
  pdf.text(`Số ${doc.quoteNumber}  ·  Ngày ${formatQuoteDate(doc.quoteDate)}`, margin, y);
  y += 10;

  const colW = (pageW - margin * 2) / 2 - 6;
  const rightColX = margin + colW + 12;
  const leftEnd = partyBlock(pdf, margin, y, colW, "BÊN BÁO GIÁ", doc.seller, primary, hasItalic);
  const rightEnd = partyBlock(pdf, rightColX, y, colW, "KHÁCH HÀNG", doc.customer, primary, hasItalic);
  y = Math.max(leftEnd, rightEnd) + 4;

  return {
    y,
    contentLeft: margin,
    contentWidth: pageW - margin * 2,
    tableMarginLeft: margin,
    tableMarginRight: margin,
  };
}

function drawModernHeader(ctx: DrawCtx): LayoutDrawResult {
  const { pdf, doc, margin, pageW, hasItalic, partyBlock, primary } = ctx;
  const sidebarW = (pageW - margin * 2) * 0.28;
  const mainLeft = margin + sidebarW + 4;
  const mainW = pageW - margin - mainLeft;
  const bandH = 52;

  pdf.setFillColor(primary[0], primary[1], primary[2]);
  pdf.rect(margin, margin, sidebarW, bandH, "F");
  partyBlock(pdf, margin + 3, margin + 6, sidebarW - 6, "BÊN BÁO GIÁ", doc.seller, [255, 255, 255], hasItalic, true);

  let y = margin + 4;
  pdf.setFont("DocFont", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(10, 10, 10);
  const titleLines = pdf.splitTextToSize(titleUpper(doc.title), mainW - 4);
  pdf.text(titleLines, mainLeft, y);
  y += titleLines.length * 6 + 2;

  pdf.setFont("DocFont", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(60, 60, 60);
  pdf.text(`Số ${doc.quoteNumber}`, mainLeft, y);
  pdf.text(`Ngày ${formatQuoteDate(doc.quoteDate)}`, mainLeft, y + 4);
  y += 10;

  const custEnd = partyBlock(pdf, mainLeft, y, mainW, "KHÁCH HÀNG", doc.customer, primary, hasItalic);
  y = Math.max(custEnd, margin + bandH) + 3;

  return {
    y,
    contentLeft: mainLeft,
    contentWidth: mainW,
    tableMarginLeft: mainLeft,
    tableMarginRight: margin,
  };
}

function drawFormalHeader(ctx: DrawCtx): LayoutDrawResult {
  const { pdf, doc, margin, pageW, hasItalic, partyBlock, primary } = ctx;
  const inset = 6;
  const frameX = margin + inset;
  const frameW = pageW - margin * 2 - inset * 2;
  let y = margin + inset + 6;

  pdf.setDrawColor(40, 40, 40);
  pdf.setLineWidth(0.6);
  pdf.rect(frameX, margin + inset, frameW, 0.1);
  pdf.rect(frameX + 1.5, margin + inset + 1.5, frameW - 3, 0.1);

  pdf.setFont("DocFont", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(20, 20, 20);
  pdf.text(titleUpper(doc.title), pageW / 2, y, { align: "center" });
  y += 7;

  pdf.setFont("DocFont", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(90, 90, 90);
  pdf.text(`Số ${doc.quoteNumber}  ·  ${formatQuoteDate(doc.quoteDate)}`, pageW / 2, y, { align: "center" });
  y += 10;

  const colW = frameW / 2 - 4;
  const rightColX = frameX + colW + 8;
  const leftEnd = partyBlock(pdf, frameX, y, colW, "BÊN BÁO GIÁ", doc.seller, primary, hasItalic);
  const rightEnd = partyBlock(pdf, rightColX, y, colW, "KHÁCH HÀNG", doc.customer, primary, hasItalic);
  y = Math.max(leftEnd, rightEnd) + 4;

  return {
    y,
    contentLeft: frameX,
    contentWidth: frameW,
    tableMarginLeft: frameX,
    tableMarginRight: pageW - frameX - frameW,
  };
}

function drawStripedHeader(ctx: DrawCtx): LayoutDrawResult {
  const { pdf, doc, margin, pageW, hasItalic, partyBlock, primary } = ctx;
  const bandH = 22;

  pdf.setFillColor(primary[0], primary[1], primary[2]);
  pdf.rect(0, 0, pageW, margin + bandH, "F");

  pdf.setFont("DocFont", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(255, 255, 255);
  pdf.text(titleUpper(doc.title), margin, margin + 10);

  pdf.setFont("DocFont", "normal");
  pdf.setFontSize(9);
  pdf.text(doc.quoteNumber, pageW - margin, margin + 8, { align: "right" });
  pdf.text(formatQuoteDate(doc.quoteDate), pageW - margin, margin + 13, { align: "right" });

  let y = margin + bandH + 6;
  const colW = (pageW - margin * 2) / 2 - 6;
  const rightColX = margin + colW + 12;
  const leftEnd = partyBlock(pdf, margin, y, colW, "BÊN BÁO GIÁ", doc.seller, primary, hasItalic);
  const rightEnd = partyBlock(pdf, rightColX, y, colW, "KHÁCH HÀNG", doc.customer, primary, hasItalic);
  y = Math.max(leftEnd, rightEnd) + 3;

  return {
    y,
    contentLeft: margin,
    contentWidth: pageW - margin * 2,
    tableMarginLeft: margin,
    tableMarginRight: margin,
  };
}

function drawCompactHeader(ctx: DrawCtx): LayoutDrawResult {
  const { pdf, doc, margin, pageW, hasItalic, partyBlock, primary } = ctx;
  let y = margin + 2;

  pdf.setFont("DocFont", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(15, 15, 15);
  pdf.text(titleUpper(doc.title), margin, y);
  y += 6;

  pdf.setFont("DocFont", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(70, 70, 70);
  pdf.text(`#${doc.quoteNumber}   ${formatQuoteDate(doc.quoteDate)}`, margin, y);
  y += 6;

  const colW = (pageW - margin * 2) / 2 - 4;
  const rightColX = margin + colW + 8;
  const leftEnd = partyBlock(pdf, margin, y, colW, "BÊN BÁO GIÁ", doc.seller, primary, hasItalic);
  const rightEnd = partyBlock(pdf, rightColX, y, colW, "KHÁCH HÀNG", doc.customer, primary, hasItalic);
  y = Math.max(leftEnd, rightEnd) + 2;

  return {
    y,
    contentLeft: margin,
    contentWidth: pageW - margin * 2,
    tableMarginLeft: margin,
    tableMarginRight: margin,
  };
}

const HEADER_DRAWERS: Record<
  PdfTemplatePreviewVariant,
  (ctx: DrawCtx) => LayoutDrawResult
> = {
  classic: drawClassicHeader,
  minimal: drawMinimalHeader,
  modern: drawModernHeader,
  formal: drawFormalHeader,
  striped: drawStripedHeader,
  compact: drawCompactHeader,
  hoaphong: drawClassicHeader,
};

export function drawQuoteLayoutHeader(ctx: DrawCtx): LayoutDrawResult {
  const drawer = HEADER_DRAWERS[ctx.variant] ?? drawClassicHeader;
  return drawer(ctx);
}

export function tableStylesForLayout(variant: PdfTemplatePreviewVariant, primary: [number, number, number], primarySoft: [number, number, number]) {
  const cfg = getPrintLayoutConfig(variant).table;
  const headFill =
    cfg.headFill === "solid"
      ? primary
      : cfg.headFill === "soft"
        ? primarySoft
        : ([255, 255, 255] as [number, number, number]);

  return {
    fontSize: cfg.fontSize,
    lineWidth: cfg.lineWidth,
    lineColor: cfg.lineColor,
    headStyles: {
      fillColor: headFill,
      textColor: cfg.headTextWhite ? ([255, 255, 255] as [number, number, number]) : primary,
      fontSize: cfg.fontSize,
    },
    alternateRow: cfg.alternateRow,
  };
}
