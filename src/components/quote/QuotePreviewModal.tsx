"use client";

import { Download, X } from "lucide-react";
import { QuotePrintSheet } from "@/components/quote/QuotePrintSheet";
import { TemplateThumb } from "@/components/quote/TemplateThumb";
import {
  getPdfTemplateMeta,
  PDF_TEMPLATES,
  type PdfTemplateMeta,
} from "@/lib/quote/pdf-templates";
import type { QuoteDocument } from "@/lib/quote/types";

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

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#0a1228]/95 backdrop-blur-sm" role="dialog">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Xem trước & in</h2>
          <p className="text-xs text-slate-muted mt-0.5">
            Mỗi mẫu có bố cục khác nhau — chọn rồi tải PDF
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
                <TemplateThumb template={t} active={active} />
                <span className="block text-xs font-semibold text-white leading-tight">{t.name}</span>
                <span className="block text-[10px] text-slate-muted mt-1 line-clamp-2">{t.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <QuotePrintSheet
            doc={{ ...doc, pdfTemplateId: meta.id }}
            grandTotal={grandTotal}
            totalVat={totalVat}
            payableTotal={payableTotal}
            vatRateNum={vatRateNum}
            lineTotalColIndex={lineTotalColIndex}
          />
        </div>
      </div>
    </div>
  );
}
