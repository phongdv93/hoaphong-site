"use client";

import { Download, X } from "lucide-react";
import { A4PreviewFrame } from "@/components/quote/A4PreviewFrame";
import { QuotePrintSheet } from "@/components/quote/QuotePrintSheet";
import { TemplateThumb } from "@/components/quote/TemplateThumb";
import {
  getPdfTemplateMeta,
  PDF_TEMPLATES,
  type PdfTemplateMeta,
} from "@/lib/quote/pdf-templates";
import { normalizePageOrientation } from "@/lib/quote/page-spec";
import type { QuoteDocument, QuotePageOrientation } from "@/lib/quote/types";

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
  onOrientationChange,
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
  onOrientationChange: (orientation: QuotePageOrientation) => void;
  onExportPdf: () => void;
}) {
  if (!open) return null;

  const meta = getPdfTemplateMeta(doc.pdfTemplateId);
  const orientation = normalizePageOrientation(doc.exportOptions.pageOrientation);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#0a1228]/95 backdrop-blur-sm" role="dialog">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Xem trước & in</h2>
          <p className="text-xs text-slate-muted mt-0.5">
            Khổ A4, lề chuẩn — chọn mẫu và hướng giấy rồi tải PDF
          </p>
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

      <div className="shrink-0 border-b border-white/10 px-4 py-3 md:px-6 overflow-x-auto space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Khổ giấy</span>
          <div className="inline-flex rounded-lg border border-white/15 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => onOrientationChange("portrait")}
              className={`px-3 py-1.5 transition-colors ${
                orientation === "portrait" ? "bg-sky/20 text-sky-light" : "text-slate-400 hover:bg-white/5"
              }`}
            >
              A4 dọc
            </button>
            <button
              type="button"
              onClick={() => onOrientationChange("landscape")}
              className={`px-3 py-1.5 transition-colors ${
                orientation === "landscape" ? "bg-sky/20 text-sky-light" : "text-slate-400 hover:bg-white/5"
              }`}
            >
              A4 ngang
            </button>
          </div>
        </div>
        <div>
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
                  <TemplateThumb template={t} active={active} />
                  <span className="block text-xs font-semibold text-white leading-tight">{t.name}</span>
                  <span className="block text-[10px] text-slate-muted mt-1 line-clamp-2">{t.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 bg-[#060d18]">
        <A4PreviewFrame orientation={orientation}>
          <QuotePrintSheet
            doc={{ ...doc, pdfTemplateId: meta.id }}
            grandTotal={grandTotal}
            totalVat={totalVat}
            payableTotal={payableTotal}
            vatRateNum={vatRateNum}
            lineTotalColIndex={lineTotalColIndex}
          />
        </A4PreviewFrame>
      </div>
    </div>
  );
}
