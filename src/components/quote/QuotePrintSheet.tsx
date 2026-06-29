"use client";

import type { ReactNode } from "react";
import {
  exportShowsLineTotal,
  formatVnMoney,
  getLineTotalDisplay,
  getSttDisplay,
  getVatDisplay,
  isColumnHiddenOnExport,
} from "@/lib/quote/calc";
import { getPdfTemplateMeta } from "@/lib/quote/pdf-templates";
import type { PdfTemplatePreviewVariant } from "@/lib/quote/pdf-templates";
import { primaryCssVars } from "@/lib/quote/theme";
import type { QuoteColumn, QuoteDocument } from "@/lib/quote/types";
import type { ColumnRole } from "@/lib/quote/types";

function webColumnClass(col: QuoteColumn): string {
  switch (col.role) {
    case "index":
      return "quote-col-tight";
    case "quantity":
    case "unit":
      return "quote-col-narrow";
    case "unitPrice":
    case "lineTotal":
    case "vat":
      return "quote-col-money";
    case "description":
      return "quote-col-wide";
    default:
      return "quote-col-custom";
  }
}

function PartyLines({ party }: { party: QuoteDocument["seller"] }) {
  const lines: { label: string; value: string; bold?: boolean }[] = [
    { label: "Công ty", value: party.company ?? "", bold: true },
    { label: "Liên hệ", value: party.name ?? "" },
    { label: "Điện thoại", value: party.phone ?? "" },
    { label: "Email", value: party.email ?? "" },
    { label: "Địa chỉ", value: party.address ?? "" },
    { label: "MST", value: party.taxCode ?? "" },
  ].filter((l) => l.value.trim());

  return (
    <div className="space-y-0.5 text-sm text-gray-800">
      {lines.map((l) => (
        <p key={l.label} className={l.bold ? "font-semibold text-gray-900" : ""}>
          {l.value}
        </p>
      ))}
    </div>
  );
}

function PartyBox({
  title,
  party,
  variant = "pill",
}: {
  title: string;
  party: QuoteDocument["seller"];
  variant?: "pill" | "framed" | "plain" | "sidebar";
}) {
  const cls =
    variant === "framed"
      ? "quote-party-framed"
      : variant === "plain"
        ? "quote-party-plain"
        : variant === "sidebar"
          ? "quote-party-sidebar"
          : "quote-party-pill";

  return (
    <div className={cls}>
      <p className="quote-party-title">{title}</p>
      <PartyLines party={party} />
    </div>
  );
}

function LogoBlock({ logoDataUrl }: { logoDataUrl: string | null }) {
  if (logoDataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoDataUrl} alt="Logo" className="max-h-14 w-auto object-contain object-left" />
    );
  }
  return (
    <div className="h-14 w-28 rounded border border-dashed border-gray-200 text-[10px] text-gray-400 flex items-center justify-center">
      Logo
    </div>
  );
}

function QuoteTableBlock({
  doc,
  grandTotal,
  totalVat,
  payableTotal,
  vatRateNum,
  lineTotalColIndex,
  tableVariant = "default",
}: {
  doc: QuoteDocument;
  grandTotal: number;
  totalVat: number;
  payableTotal: number;
  vatRateNum: number;
  lineTotalColIndex: number;
  tableVariant?: "default" | "minimal" | "solid-head" | "compact";
}) {
  const isColHidden = (col: QuoteColumn) => isColumnHiddenOnExport(col);

  const tableCls =
    tableVariant === "minimal"
      ? "quote-table quote-table--minimal"
      : tableVariant === "solid-head"
        ? "quote-table quote-table--solid-head"
        : tableVariant === "compact"
          ? "quote-table quote-table--compact"
          : "quote-table";

  return (
    <div className="overflow-x-auto">
      <table className={`${tableCls} w-full border-collapse text-sm`}>
        <thead>
          <tr>
            {doc.columns.map((col) => (
              <th
                key={col.id}
                className={`quote-th border border-gray-200 px-2 py-2 ${webColumnClass(col)} ${
                  isColHidden(col) ? "opacity-40" : ""
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {doc.rows.map((row, ri) => (
            <tr key={row.id} className={ri % 2 === 1 ? "quote-row-alt" : ""}>
              {doc.columns.map((col) => {
                const hidden = isColHidden(col);
                const colCls = webColumnClass(col);
                if (col.role === "lineTotal")
                  return (
                    <td
                      key={col.id}
                      className={`border border-gray-200 px-2 py-1.5 text-right font-semibold tabular-nums ${colCls} ${hidden ? "opacity-40" : ""}`}
                      style={{ background: "var(--quote-primary-light)" }}
                    >
                      {getLineTotalDisplay(row, doc.columns)}
                    </td>
                  );
                if (col.role === "vat")
                  return (
                    <td
                      key={col.id}
                      className={`border border-gray-200 px-2 py-1.5 text-right font-semibold tabular-nums ${colCls} ${hidden ? "opacity-40" : ""}`}
                      style={{ background: "var(--quote-primary-light)" }}
                    >
                      {getVatDisplay(row, doc.columns, vatRateNum)}
                    </td>
                  );
                if (col.role === "index")
                  return (
                    <td
                      key={col.id}
                      className={`border border-gray-200 px-2 py-1.5 text-center text-gray-600 ${colCls}`}
                    >
                      {getSttDisplay(ri)}
                    </td>
                  );
                return (
                  <td
                    key={col.id}
                    className={`border border-gray-200 px-2 py-1.5 text-gray-900 whitespace-pre-wrap ${colCls} ${hidden ? "opacity-40" : ""}`}
                  >
                    {row.cells[col.id] ?? ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {exportShowsLineTotal(doc) && (
          <tfoot>
            <tr className="quote-tfoot">
              {lineTotalColIndex >= 0 ? (
                <>
                  <td colSpan={Math.max(1, lineTotalColIndex)} className="border border-gray-200 px-2 py-2 text-right quote-label !text-[0.65rem]">
                    Tổng trước thuế
                  </td>
                  <td className="border border-gray-200 px-2 py-2 text-right font-bold tabular-nums">
                    {formatVnMoney(grandTotal)}
                  </td>
                  {doc.columns.slice(lineTotalColIndex + 1).map((col) => (
                    <td key={col.id} className="border border-gray-200" />
                  ))}
                </>
              ) : null}
            </tr>
            {vatRateNum > 0 && lineTotalColIndex >= 0 && (
              <tr className="quote-tfoot">
                <td colSpan={Math.max(1, lineTotalColIndex)} className="border border-gray-200 px-2 py-2 text-right quote-label !text-[0.65rem]">
                  Thuế GTGT ({vatRateNum}%)
                </td>
                <td className="border border-gray-200" />
                {doc.columns.slice(lineTotalColIndex + 1).map((col) => (
                  <td key={col.id} className="border border-gray-200 px-2 py-2 text-right font-bold tabular-nums">
                    {col.role === "vat" ? formatVnMoney(totalVat) : ""}
                  </td>
                ))}
              </tr>
            )}
            {lineTotalColIndex >= 0 && (
              <tr className="quote-tfoot">
                <td colSpan={Math.max(1, lineTotalColIndex)} className="border border-gray-200 px-2 py-2 text-right quote-label !text-[0.65rem]">
                  Tổng sau thuế
                </td>
                <td colSpan={doc.columns.length - lineTotalColIndex} className="border border-gray-200 px-2 py-2 text-right font-bold tabular-nums">
                  {formatVnMoney(payableTotal)}
                </td>
              </tr>
            )}
          </tfoot>
        )}
      </table>
    </div>
  );
}

function NotesBlock({ notes }: { notes: string }) {
  if (!notes.trim()) return null;
  return (
    <div className="quote-notes-block mt-6 pt-4 border-t border-gray-100">
      <p className="quote-label mb-2">Ghi chú</p>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{notes}</p>
    </div>
  );
}

function SignatureBlock({ doc }: { doc: QuoteDocument }) {
  return (
    <div className="quote-signature-block mt-4 max-w-[14rem] ml-auto flex flex-col items-center text-center">
      <p className="quote-label mb-1">Người báo giá</p>
      {doc.quoter.title && <p className="text-xs text-gray-700">{doc.quoter.title}</p>}
      {doc.quoter.signatureDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={doc.quoter.signatureDataUrl}
          alt="Chữ ký"
          className="max-h-16 w-auto object-contain my-1"
          style={{ transform: `scale(${doc.quoter.signatureScale ?? 1})`, transformOrigin: "center bottom" }}
        />
      )}
      {doc.quoter.name && <p className="text-sm font-bold text-gray-900">{doc.quoter.name}</p>}
    </div>
  );
}

function PoweredBy() {
  return <p className="mt-4 text-center text-[10px] text-gray-500">Powered by hoaphong.com.vn</p>;
}

type SheetProps = {
  doc: QuoteDocument;
  grandTotal: number;
  totalVat: number;
  payableTotal: number;
  vatRateNum: number;
  lineTotalColIndex: number;
};

function LayoutClassic(p: SheetProps) {
  const { doc } = p;
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-6 mb-6">
        <div className="shrink-0">
          <LogoBlock logoDataUrl={doc.logoDataUrl} />
        </div>
        <div className="flex-1 min-w-0 px-0 sm:px-4">
          <p className="quote-doc-title text-center">{doc.title}</p>
        </div>
        <div className="shrink-0 space-y-1 sm:text-right text-sm">
          <p>
            <span className="quote-meta-label">Số báo giá </span>
            <span className="font-medium">{doc.quoteNumber}</span>
          </p>
          <p>
            <span className="quote-meta-label">Ngày </span>
            <span className="font-medium">{doc.quoteDate}</span>
          </p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <PartyBox title="Bên báo giá" party={doc.seller} />
        <PartyBox title="Khách hàng" party={doc.customer} />
      </div>
      <QuoteTableBlock {...p} />
      <NotesBlock notes={doc.notes} />
      <SignatureBlock doc={doc} />
      <PoweredBy />
    </>
  );
}

function LayoutMinimal(p: SheetProps) {
  const { doc } = p;
  return (
    <div className="quote-layout-minimal-inner px-2 py-2">
      <div className="mb-8">
        <p className="quote-doc-title quote-doc-title--left text-3xl mb-3">{doc.title}</p>
        <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm text-gray-600">
          <span>
            <span className="quote-meta-label">Số </span>
            {doc.quoteNumber}
          </span>
          <span>
            <span className="quote-meta-label">Ngày </span>
            {doc.quoteDate}
          </span>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <PartyBox title="Bên báo giá" party={doc.seller} variant="plain" />
        <PartyBox title="Khách hàng" party={doc.customer} variant="plain" />
      </div>
      <QuoteTableBlock {...p} tableVariant="minimal" />
      <NotesBlock notes={doc.notes} />
      <SignatureBlock doc={doc} />
      <PoweredBy />
    </div>
  );
}

function LayoutModern(p: SheetProps) {
  const { doc } = p;
  return (
    <div className="quote-layout-modern-grid min-h-[520px]">
      <aside className="quote-modern-sidebar">
        <LogoBlock logoDataUrl={doc.logoDataUrl} />
        <div className="mt-6">
          <PartyBox title="Bên báo giá" party={doc.seller} variant="sidebar" />
        </div>
      </aside>
      <main className="quote-modern-main p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <p className="quote-doc-title quote-doc-title--accent text-left text-2xl flex-1">{doc.title}</p>
          <div className="text-sm text-right shrink-0">
            <p>
              <span className="quote-meta-label">Số </span>
              <span className="font-semibold">{doc.quoteNumber}</span>
            </p>
            <p>
              <span className="quote-meta-label">Ngày </span>
              <span className="font-semibold">{doc.quoteDate}</span>
            </p>
          </div>
        </div>
        <PartyBox title="Khách hàng" party={doc.customer} variant="pill" />
        <div className="mt-4">
          <QuoteTableBlock {...p} tableVariant="solid-head" />
        </div>
        <NotesBlock notes={doc.notes} />
        <SignatureBlock doc={doc} />
        <PoweredBy />
      </main>
    </div>
  );
}

function LayoutFormal(p: SheetProps) {
  const { doc } = p;
  return (
    <div className="quote-layout-formal-frame p-6 md:p-8">
      <p className="quote-doc-title quote-doc-title--formal text-center mb-2">{doc.title}</p>
      <p className="text-center text-xs tracking-widest text-gray-500 uppercase mb-6">
        Số {doc.quoteNumber} · {doc.quoteDate}
      </p>
      <div className="flex justify-center mb-6">
        <LogoBlock logoDataUrl={doc.logoDataUrl} />
      </div>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <PartyBox title="Bên báo giá" party={doc.seller} variant="framed" />
        <PartyBox title="Khách hàng" party={doc.customer} variant="framed" />
      </div>
      <QuoteTableBlock {...p} />
      <NotesBlock notes={doc.notes} />
      <SignatureBlock doc={doc} />
      <PoweredBy />
    </div>
  );
}

function LayoutStriped(p: SheetProps) {
  const { doc } = p;
  return (
    <>
      <div className="quote-layout-striped-banner">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-white/80 text-[10px] uppercase tracking-widest mb-1">Báo giá</p>
            <p className="quote-doc-title quote-doc-title--inverse text-2xl">{doc.title}</p>
          </div>
          <div className="text-right text-sm text-white/95">
            <p className="font-semibold">{doc.quoteNumber}</p>
            <p className="text-white/80">{doc.quoteDate}</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-5 md:px-6">
        <div className="flex items-center gap-4 mb-5 pb-4 border-b border-gray-100">
          <LogoBlock logoDataUrl={doc.logoDataUrl} />
        </div>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <PartyBox title="Bên báo giá" party={doc.seller} />
          <PartyBox title="Khách hàng" party={doc.customer} />
        </div>
        <QuoteTableBlock {...p} tableVariant="solid-head" />
        <NotesBlock notes={doc.notes} />
        <SignatureBlock doc={doc} />
        <PoweredBy />
      </div>
    </>
  );
}

function LayoutCompact(p: SheetProps) {
  const { doc } = p;
  return (
    <div className="quote-layout-compact p-4 md:p-5 text-sm">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <LogoBlock logoDataUrl={doc.logoDataUrl} />
        <p className="quote-doc-title text-lg flex-1 min-w-0">{doc.title}</p>
      </div>
      <div className="quote-compact-meta-chips mb-4">
        <span className="quote-compact-chip">#{doc.quoteNumber}</span>
        <span className="quote-compact-chip">{doc.quoteDate}</span>
        {doc.seller.company && <span className="quote-compact-chip">{doc.seller.company}</span>}
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mb-3 text-xs">
        <div>
          <p className="quote-party-title mb-1">Bên báo giá</p>
          <PartyLines party={doc.seller} />
        </div>
        <div>
          <p className="quote-party-title mb-1">Khách hàng</p>
          <PartyLines party={doc.customer} />
        </div>
      </div>
      <QuoteTableBlock {...p} tableVariant="compact" />
      <NotesBlock notes={doc.notes} />
      <div className="flex justify-end mt-3">
        <SignatureBlock doc={doc} />
      </div>
      <PoweredBy />
    </div>
  );
}

function LayoutHoaphong(p: SheetProps) {
  const { doc } = p;
  return (
    <div className="quote-layout-hoaphong">
      <div className="quote-hoaphong-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <LogoBlock logoDataUrl={doc.logoDataUrl} />
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-purple-200/90">Hoa Phong Group</p>
              <p className="text-white font-bold text-lg leading-tight mt-0.5">{doc.seller.company || "—"}</p>
            </div>
          </div>
          <div className="text-right text-white/95 text-sm">
            <p className="text-[10px] uppercase tracking-wider text-purple-200/80">Quote No.</p>
            <p className="font-semibold">{doc.quoteNumber}</p>
            <p className="text-[10px] text-purple-200/80 mt-1">{doc.quoteDate}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/20 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-purple-200/90">Quotation</p>
          <p className="quote-doc-title quote-doc-title--inverse text-xl mt-1">{doc.title}</p>
          <p className="text-[10px] text-purple-200/80 mt-0.5 uppercase tracking-widest">Báo giá</p>
        </div>
      </div>
      <div className="px-5 py-5 md:px-6">
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="quote-hoaphong-party">
            <p className="quote-party-title">Seller / Bên báo giá</p>
            <PartyLines party={doc.seller} />
          </div>
          <div className="quote-hoaphong-party">
            <p className="quote-party-title">Customer / Khách hàng</p>
            <PartyLines party={doc.customer} />
          </div>
        </div>
        <QuoteTableBlock {...p} tableVariant="solid-head" />
        <NotesBlock notes={doc.notes} />
        <SignatureBlock doc={doc} />
        <PoweredBy />
      </div>
    </div>
  );
}

const LAYOUT_RENDERERS: Record<PdfTemplatePreviewVariant, (p: SheetProps) => ReactNode> = {
  classic: LayoutClassic,
  minimal: LayoutMinimal,
  modern: LayoutModern,
  formal: LayoutFormal,
  striped: LayoutStriped,
  compact: LayoutCompact,
  hoaphong: LayoutHoaphong,
};

export function QuotePrintSheet({
  doc,
  grandTotal,
  totalVat,
  payableTotal,
  vatRateNum,
  lineTotalColIndex,
}: {
  doc: QuoteDocument;
  grandTotal: number;
  totalVat: number;
  payableTotal: number;
  vatRateNum: number;
  lineTotalColIndex: number;
}) {
  const meta = getPdfTemplateMeta(doc.pdfTemplateId);
  const themeStyle = primaryCssVars(doc.primaryColor);
  const Layout = LAYOUT_RENDERERS[meta.preview] ?? LayoutClassic;

  return (
    <div
      className={`quote-preview-sheet quote-sheet quote-pdf-root bg-white text-gray-900 overflow-hidden quote-print-layout--${meta.preview}`}
      style={themeStyle}
      data-preview={meta.preview}
    >
      <Layout
        doc={doc}
        grandTotal={grandTotal}
        totalVat={totalVat}
        payableTotal={payableTotal}
        vatRateNum={vatRateNum}
        lineTotalColIndex={lineTotalColIndex}
      />
    </div>
  );
}
