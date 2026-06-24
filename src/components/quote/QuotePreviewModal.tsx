"use client";

import { Download, X } from "lucide-react";
import {
  formatVnMoney,
  getLineTotalDisplay,
  getSttDisplay,
  getVatDisplay,
} from "@/lib/quote/calc";
import {
  getPdfTemplateMeta,
  PDF_TEMPLATES,
  primaryColorForTemplate,
  type PdfTemplateMeta,
} from "@/lib/quote/pdf-templates";
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

function PartyReadonly({ title, party }: { title: string; party: QuoteDocument["seller"] }) {
  const lines: { label: string; value: string; bold?: boolean }[] = [
    { label: "Công ty", value: party.company ?? "", bold: true },
    { label: "Liên hệ", value: party.name ?? "" },
    { label: "Điện thoại", value: party.phone ?? "" },
    { label: "Email", value: party.email ?? "" },
    { label: "Địa chỉ", value: party.address ?? "" },
    { label: "MST", value: party.taxCode ?? "" },
  ].filter((l) => l.value.trim());

  return (
    <div className="quote-party-pill">
      <p className="quote-party-title">{title}</p>
      <div className="space-y-0.5 text-sm text-gray-800">
        {lines.map((l) => (
          <p key={l.label} className={l.bold ? "font-semibold text-gray-900" : ""}>
            {l.value}
          </p>
        ))}
      </div>
    </div>
  );
}

export function QuotePreviewModal({
  open,
  onClose,
  doc,
  grandTotal,
  totalVat,
  payableTotal,
  vatRateNum,
  lineTotalColIndex,
  exporting,
  onSelectTemplate,
  onExportPdf,
}: {
  open: boolean;
  onClose: () => void;
  doc: QuoteDocument;
  grandTotal: number;
  totalVat: number;
  payableTotal: number;
  vatRateNum: number;
  lineTotalColIndex: number;
  exporting: boolean;
  onSelectTemplate: (template: PdfTemplateMeta) => void;
  onExportPdf: () => void;
}) {
  if (!open) return null;

  const meta = getPdfTemplateMeta(doc.pdfTemplateId);
  const themeStyle = primaryCssVars(doc.primaryColor);
  const isColHidden = (role?: ColumnRole) =>
    (role === "unitPrice" && !doc.exportOptions.showUnitPrice) ||
    (role === "lineTotal" && !doc.exportOptions.showLineTotal);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#0a1228]/95 backdrop-blur-sm" role="dialog">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Xem trước & in</h2>
          <p className="text-xs text-slate-muted mt-0.5">Chọn mẫu in, sau đó tải PDF</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void onExportPdf()}
            disabled={exporting}
            className="quote-tool-btn quote-tool-btn-primary text-xs"
          >
            <Download size={14} /> {exporting ? "Đang xuất…" : "Tải PDF"}
          </button>
          <button type="button" onClick={onClose} className="p-2 text-slate-muted hover:text-white" aria-label="Đóng">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="shrink-0 border-b border-white/10 px-4 py-3 md:px-6 overflow-x-auto">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Mẫu in</p>
        <div className="flex gap-2 min-w-max pb-1">
          {PDF_TEMPLATES.map((t) => {
            const active = doc.pdfTemplateId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTemplate(t)}
                className={`shrink-0 w-36 rounded-lg border p-2.5 text-left transition-colors ${
                  active
                    ? "border-sky bg-sky/15 ring-1 ring-sky/40"
                    : "border-white/15 bg-white/[0.03] hover:border-white/25"
                }`}
              >
                <span
                  className="block h-1.5 w-full rounded-full mb-2"
                  style={{ background: primaryColorForTemplate(t.id) }}
                />
                <span className="block text-xs font-semibold text-white leading-tight">{t.name}</span>
                <span className="block text-[10px] text-slate-muted mt-1 line-clamp-2">{t.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div
            className="quote-preview-sheet quote-sheet quote-pdf-root bg-white text-gray-900 rounded-xl shadow-2xl shadow-black/40 px-4 py-6 md:px-6 md:py-8"
            style={themeStyle}
            data-preview={meta.preview}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-6 mb-6">
              <div className="shrink-0">
                {doc.logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={doc.logoDataUrl} alt="Logo" className="max-h-14 w-auto object-contain object-left" />
                ) : (
                  <div className="h-14 w-28 rounded border border-dashed border-gray-200 text-[10px] text-gray-400 flex items-center justify-center">
                    Logo
                  </div>
                )}
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
              <PartyReadonly title="Bên báo giá" party={doc.seller} />
              <PartyReadonly title="Khách hàng" party={doc.customer} />
            </div>

            <div className="overflow-x-auto">
              <table className="quote-table w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {doc.columns.map((col) => (
                      <th
                        key={col.id}
                        className={`quote-th border border-gray-200 px-2 py-2 ${webColumnClass(col)} ${
                          isColHidden(col.role) ? "opacity-40" : ""
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {doc.rows.map((row, ri) => (
                    <tr key={row.id} className={ri % 2 === 1 ? "bg-gray-50/60" : ""}>
                      {doc.columns.map((col) => {
                        const hidden = isColHidden(col.role);
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
                {doc.exportOptions.showLineTotal && (
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

            {doc.notes.trim() && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="quote-label mb-2">Ghi chú</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{doc.notes}</p>
              </div>
            )}

            <div className="mt-4 max-w-[14rem] ml-auto flex flex-col items-center text-center">
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

            <p className="mt-4 text-center text-[10px] text-gray-500">Powered by hoaphong.com.vn</p>
          </div>
        </div>
      </div>
    </div>
  );
}
