"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Download,
  FolderOpen,
  ImagePlus,
  LayoutTemplate,
  Plus,
  Save,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  createColumn,
  createQuote,
  createRow,
  syncRowsWithColumns,
} from "@/lib/quote/defaults";
import {
  calcGrandTotal,
  calcTotalVat,
  formatVnMoney,
  getLineTotalDisplay,
  getSttDisplay,
  getVatDisplay,
  guessColumnRole,
  parseVatRate,
  SEAL_DIAMETER_MM,
} from "@/lib/quote/calc";
import { applyPasteToGrid, parseClipboardMatrix } from "@/lib/quote/paste";
import { AppSelect } from "@/components/ui/AppSelect";
import {
  applyTemplate,
  defaultLabelForRole,
  docToTemplate,
  insertColumnAt,
} from "@/lib/quote/template";
import {
  clearDraft,
  deleteSavedQuote,
  deleteSavedTemplate,
  listSavedQuotes,
  listSavedTemplates,
  loadDraft,
  loadSavedQuote,
  loadSavedTemplate,
  saveDraft,
  saveQuote,
  saveTemplate,
} from "@/lib/quote/storage";
import type { CellAnchor, QuoteColumn, QuoteDocument, QuoteParty, QuoteTemplate } from "@/lib/quote/types";
import { COLUMN_ROLE_OPTIONS } from "@/lib/quote/types";
import type { ColumnRole } from "@/lib/quote/types";
import { primaryCssVars } from "@/lib/quote/theme";
import { PDF_TEMPLATES } from "@/lib/quote/pdf-templates";
import { FONT_FAMILIES, getFontFamily } from "@/lib/quote/pdf-fonts";

// === PartyBlock: 4 field chính, còn lại ẩn sau toggle ===
const PARTY_FIELDS_PRIMARY: { key: keyof QuoteParty; label: string; placeholder: string }[] = [
  { key: "company",  label: "Công ty",      placeholder: "Tên công ty / tổ chức" },
  { key: "name",     label: "Người liên hệ", placeholder: "Họ tên" },
  { key: "phone",    label: "Điện thoại",   placeholder: "Số điện thoại" },
  { key: "email",    label: "Email",         placeholder: "email@example.com" },
];

const PARTY_FIELDS_EXTRA: { key: keyof QuoteParty; label: string; placeholder: string }[] = [
  { key: "address",     label: "Địa chỉ",        placeholder: "Địa chỉ" },
  { key: "taxCode",     label: "Mã số thuế",      placeholder: "Mã số thuế" },
  { key: "bankName",    label: "Ngân hàng",       placeholder: "Tên ngân hàng" },
  { key: "bankAccount", label: "STK ngân hàng",   placeholder: "Số tài khoản" },
];

function PartyBlock({
  title,
  party,
  onChange,
}: {
  title: string;
  party: QuoteParty;
  onChange: (party: QuoteParty) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // auto-expand nếu có dữ liệu ở field phụ
  const hasExtraData = PARTY_FIELDS_EXTRA.some((f) => {
    const v = party[f.key];
    return typeof v === "string" && v.trim() !== "";
  });

  const showExtra = expanded || hasExtraData;

  return (
    <div className="quote-party-pill">
      <p className="quote-party-title">{title}</p>
      <div className="space-y-0.5">
        <input
          type="text"
          value={party.company ?? ""}
          onChange={(e) => onChange({ ...party, company: e.target.value })}
          placeholder="Tên công ty / tổ chức"
          className="quote-party-line quote-party-line-bold"
        />
        <input
          type="text"
          value={party.name ?? ""}
          onChange={(e) => onChange({ ...party, name: e.target.value })}
          placeholder="Người liên hệ"
          className="quote-party-line"
        />
        <input
          type="text"
          value={party.phone ?? ""}
          onChange={(e) => onChange({ ...party, phone: e.target.value })}
          placeholder="Điện thoại"
          className="quote-party-line"
        />
        <input
          type="text"
          value={party.email ?? ""}
          onChange={(e) => onChange({ ...party, email: e.target.value })}
          placeholder="Email"
          className="quote-party-line"
        />
      </div>

      {showExtra && (
        <div className="space-y-0.5 mt-2 pt-2 border-t border-gray-100">
          <textarea
            value={party.address ?? ""}
            onChange={(e) => onChange({ ...party, address: e.target.value })}
            placeholder="Địa chỉ"
            rows={2}
            className="quote-party-line resize-none min-h-[2.5rem]"
          />
          {PARTY_FIELDS_EXTRA.filter((f) => f.key !== "address").map((f) => (
            <input
              key={f.key}
              type="text"
              value={party[f.key] ?? ""}
              onChange={(e) => onChange({ ...party, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="quote-party-line"
            />
          ))}
        </div>
      )}

      {!hasExtraData && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 mt-2"
        >
          {showExtra ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {showExtra ? "Ẩn bớt" : "Thêm MST, ngân hàng…"}
        </button>
      )}
    </div>
  );
}

function readImageFile(
  file: File | null,
  onDone: (dataUrl: string) => void,
  onError: (msg: string) => void
) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    onError("Vui lòng chọn file ảnh (PNG, JPG…)");
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    onError("Ảnh tối đa 2MB");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => onDone(reader.result as string);
  reader.readAsDataURL(file);
}

/** Độ rộng cột trên web */
function webColumnClass(col: QuoteColumn): string {
  switch (col.role) {
    case "index":      return "quote-col-tight";
    case "quantity":
    case "unit":       return "quote-col-narrow";
    case "unitPrice":
    case "lineTotal":
    case "vat":        return "quote-col-money";
    case "description": return "quote-col-wide";
    default: {
      const n = col.label.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
      if (/^(dai|rong|cao|sl|dvt|kg|m|cm|mm|m2|m3)$/.test(n) || col.label.trim().length <= 4)
        return "quote-col-narrow";
      return "quote-col-custom";
    }
  }
}

function isNarrowHeader(col: QuoteColumn): boolean {
  const cls = webColumnClass(col);
  return cls === "quote-col-tight" || cls === "quote-col-narrow";
}

// === Sidebar section wrapper ===
function SbSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 pt-2.5 border-t border-white/10 first:pt-0 first:border-0">
      <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wide leading-tight">{title}</p>
      {children}
    </div>
  );
}

export function QuoteBuilder({ defaultSeller }: { defaultSeller?: Partial<QuoteParty> }) {
  const tableRef = useRef<HTMLTableElement>(null);
  const [doc, setDoc] = useState<QuoteDocument>(() => createQuote({ seller: defaultSeller }));
  const [anchor, setAnchor] = useState<CellAnchor>({ rowIndex: 0, colIndex: 0 });
  const [savesOpen, setSavesOpen] = useState(false);
  const [saveTab, setSaveTab] = useState<"quote" | "template">("quote");
  const [savedQuotes, setSavedQuotes] = useState<QuoteDocument[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<QuoteTemplate[]>([]);
  const [saveName, setSaveName] = useState("");
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [addColOpen, setAddColOpen] = useState(false);
  const [newColRole, setNewColRole] = useState<ColumnRole>("custom");
  const [newColLabel, setNewColLabel] = useState("Cột mới");
  const [newColAfter, setNewColAfter] = useState(-1);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setDoc(draft);
      setSaveName(draft.savedName);
    } else {
      const initial = createQuote({ seller: defaultSeller });
      setDoc(initial);
      setSaveName(initial.savedName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lineTotalColIndex = useMemo(
    () => doc.columns.findIndex((c) => c.role === "lineTotal"),
    [doc.columns]
  );
  const vatRateNum = useMemo(() => parseVatRate(doc.vatRate), [doc.vatRate]);
  const grandTotal = useMemo(() => calcGrandTotal(doc.rows, doc.columns), [doc.rows, doc.columns]);
  const totalVat   = useMemo(() => calcTotalVat(doc.rows, doc.columns, vatRateNum), [doc.rows, doc.columns, vatRateNum]);
  const payableTotal = grandTotal + totalVat;

  useEffect(() => {
    const t = setTimeout(() => saveDraft(doc), 400);
    return () => clearTimeout(t);
  }, [doc]);

  const patch = useCallback((partial: Partial<QuoteDocument>) => {
    setDoc((prev) => ({ ...prev, ...partial, updatedAt: new Date().toISOString() }));
  }, []);

  const handleLogo      = (file: File | null) => {
    if (!file) { patch({ logoDataUrl: null }); return; }
    readImageFile(file, (url) => patch({ logoDataUrl: url }), showToast);
  };
  const handleSignature = (file: File | null) => {
    if (!file) { patch({ quoter: { ...doc.quoter, signatureDataUrl: null } }); return; }
    readImageFile(file, (url) => patch({ quoter: { ...doc.quoter, signatureDataUrl: url } }), showToast);
  };

  const addRow    = () => setDoc((prev) => ({ ...prev, rows: [...prev.rows, createRow(prev.columns)], updatedAt: new Date().toISOString() }));
  const removeRow = () => setDoc((prev) => prev.rows.length <= 1 ? prev : { ...prev, rows: prev.rows.slice(0, -1), updatedAt: new Date().toISOString() });

  const openAddColumn = () => { setNewColRole("custom"); setNewColLabel("Cột mới"); setNewColAfter(doc.columns.length - 1); setAddColOpen(true); };

  const confirmAddColumn = () => {
    const label  = newColLabel.trim() || defaultLabelForRole(newColRole);
    const col    = createColumn(label, newColRole);
    const insertAt = newColAfter < 0 ? 0 : newColAfter + 1;
    setDoc((prev) => {
      const result = insertColumnAt(prev.columns, prev.rows, col, insertAt);
      return { ...prev, ...result, rows: syncRowsWithColumns(result.rows, result.columns), updatedAt: new Date().toISOString() };
    });
    setAddColOpen(false);
    showToast(`Đã thêm cột "${label}"`);
  };

  const removeColumn = () => setDoc((prev) => {
    if (prev.columns.length <= 1) return prev;
    const columns = prev.columns.slice(0, -1);
    return { ...prev, columns, rows: syncRowsWithColumns(prev.rows, columns), updatedAt: new Date().toISOString() };
  });

  const setCell = (rowIndex: number, colId: string, value: string) => {
    setDoc((prev) => {
      const col = prev.columns.find((c) => c.id === colId);
      if (col?.role === "lineTotal" || col?.role === "index" || col?.role === "vat") return prev;
      return { ...prev, rows: prev.rows.map((row, i) => i === rowIndex ? { ...row, cells: { ...row.cells, [colId]: value } } : row), updatedAt: new Date().toISOString() };
    });
  };

  const setColumnLabel = (colIndex: number, label: string) => {
    setDoc((prev) => {
      const columns = prev.columns.map((c, i) => {
        if (i !== colIndex) return c;
        const role = c.role && c.role !== "custom" ? c.role : guessColumnRole(label);
        return { ...c, label, role };
      });
      return { ...prev, columns, rows: syncRowsWithColumns(prev.rows, columns), updatedAt: new Date().toISOString() };
    });
  };

  const handleTablePaste = (e: React.ClipboardEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest("[data-quote-cell]")) return;
    const text = e.clipboardData.getData("text");
    if (!text.trim()) return;
    e.preventDefault();
    const matrix = parseClipboardMatrix(text);
    if (matrix.length === 0) return;
    const colCount = Math.max(...matrix.map((r) => r.length));
    showToast(`Đã dán ${matrix.length} dòng × ${colCount} cột`);
    setDoc((prev) => {
      const result = applyPasteToGrid(prev.columns, prev.rows, anchor.rowIndex, anchor.colIndex, matrix);
      return { ...prev, ...result, updatedAt: new Date().toISOString() };
    });
  };

  const handleSaveQuote = () => {
    const name  = saveName.trim() || doc.savedName || "Báo giá";
    const saved = saveQuote({ ...doc, savedName: name });
    setDoc(saved); setSaveName(name);
    showToast("Đã lưu báo giá");
  };

  const handleSaveTemplate = () => {
    const name = saveName.trim() || "Template báo giá";
    saveTemplate(docToTemplate(doc, name));
    showToast("Đã lưu template");
  };

  const openSaves = () => { setSavedQuotes(listSavedQuotes()); setSavedTemplates(listSavedTemplates()); setSaveTab("quote"); setSavesOpen(true); };

  const handleLoadQuote    = (id: string) => { const loaded = loadSavedQuote(id);    if (!loaded) return; setDoc(loaded); setSaveName(loaded.savedName); setSavesOpen(false); showToast("Đã mở báo giá"); };
  const handleLoadTemplate = (id: string) => { const tmpl   = loadSavedTemplate(id); if (!tmpl)   return; setDoc(applyTemplate(tmpl, doc)); setSaveName(tmpl.savedName); setSavesOpen(false); showToast("Đã áp template"); };

  const handleNew = () => {
    if (!confirm("Tạo báo giá mới?")) return;
    const fresh = createQuote({ seller: defaultSeller });
    setDoc(fresh); setSaveName(fresh.savedName); clearDraft(); saveDraft(fresh);
  };

  const handlePdf = async () => {
    setExporting(true);
    try {
      const { exportQuotePdf } = await import("@/lib/quote/pdf");
      const safeName = (doc.quoteNumber || "bao-gia").replace(/[^\w\-]+/g, "_");
      await exportQuotePdf(doc, grandTotal, `${safeName}.pdf`);
      showToast("Đã tải PDF");
    } catch (err) {
      console.error("PDF export failed:", err);
      showToast("Không xuất được PDF");
    } finally {
      setExporting(false);
    }
  };

  const isColHiddenOnExport = (role?: ColumnRole) =>
    (role === "unitPrice" && !doc.exportOptions.showUnitPrice) ||
    (role === "lineTotal" && !doc.exportOptions.showLineTotal);

  const themeStyle = primaryCssVars(doc.primaryColor);

  return (
    <div className="flex flex-col h-full min-h-0">
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-sky/90 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Topbar: tên file + action phụ */}
      <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm font-semibold text-white shrink-0">Báo giá</span>
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            className="min-w-0 flex-1 max-w-md rounded-lg bg-white/5 border border-white/15 px-2.5 py-1.5 text-sm text-white"
            placeholder="Tên bản lưu…"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          <button type="button" onClick={handleNew} className="quote-tool-btn text-xs">
            Mới
          </button>
          <button type="button" onClick={openSaves} className="quote-tool-btn text-xs">
            <FolderOpen size={14} /> Mở
          </button>
          <button type="button" onClick={handleSaveTemplate} className="quote-tool-btn text-xs">
            <LayoutTemplate size={14} /> Template
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid lg:grid-cols-[minmax(0,14rem)_1fr] gap-3 items-start overflow-hidden">

        {/* Sidebar ngắn — chiều cao theo nội dung, dính khi cuộn trang giấy */}
        <aside className="quote-sidebar flex flex-col gap-0 divide-y divide-white/10">

          <SbSection title="Thương hiệu">
            <label className="block">
              <span className="text-[11px] text-slate-muted">Màu chính</span>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={doc.primaryColor}
                  onChange={(e) => patch({ primaryColor: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-white/15 bg-transparent"
                  aria-label="Màu primary"
                />
                <input
                  type="text"
                  value={doc.primaryColor}
                  onChange={(e) => patch({ primaryColor: e.target.value })}
                  className="flex-1 rounded bg-white/5 border border-white/15 px-2 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </label>
            <label className="quote-tool-btn text-xs w-full cursor-pointer justify-center mt-1">
              <ImagePlus size={14} /> Logo công ty
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleLogo(e.target.files?.[0] ?? null)} />
            </label>
          </SbSection>

          <SbSection title="In PDF">
            <label className="block text-xs text-slate-muted">
              <span className="block mb-1">Kiểu in</span>
              <AppSelect
                value={doc.pdfTemplateId}
                onChange={(v) => patch({ pdfTemplateId: v })}
                className="w-full rounded bg-white/5 border border-white/15 px-2 py-1.5 text-xs text-white text-left flex items-center justify-between"
                options={PDF_TEMPLATES.map((t) => ({ value: t.id, label: t.name }))}
              />
            </label>
            <label className="block text-xs text-slate-muted">
              <span className="block mb-1">Font</span>
              <AppSelect
                value={doc.fontFamilyId}
                onChange={(v) => patch({ fontFamilyId: v })}
                className="w-full rounded bg-white/5 border border-white/15 px-2 py-1.5 text-xs text-white text-left flex items-center justify-between"
                options={FONT_FAMILIES.map((f) => ({ value: f.id, label: `${f.name}${f.vietnamese ? " · VN" : ""}` }))}
              />
            </label>
          </SbSection>

          <SbSection title="Bảng hàng">
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={addRow}       className="quote-tool-btn text-[11px] !py-1.5">+ Dòng</button>
              <button type="button" onClick={removeRow}    className="quote-tool-btn text-[11px] !py-1.5">− Dòng</button>
              <button type="button" onClick={openAddColumn} className="quote-tool-btn text-[11px] !py-1.5 col-span-2">
                <Plus size={12} /> Cột…
              </button>
              <button type="button" onClick={removeColumn} className="quote-tool-btn text-[11px] !py-1.5 col-span-2">− Cột cuối</button>
            </div>
          </SbSection>

          <SbSection title="Thuế & in">
            <label className="flex items-center gap-2 text-xs text-slate-muted">
              <span className="shrink-0">VAT</span>
              <input
                type="text"
                inputMode="decimal"
                value={doc.vatRate}
                onChange={(e) => patch({ vatRate: e.target.value })}
                className="w-12 rounded bg-white/5 border border-white/15 px-2 py-1 text-xs text-white text-right tabular-nums"
              />
              <span>%</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-muted font-light">
              <input type="checkbox" checked={doc.exportOptions.showUnitPrice}
                onChange={(e) => patch({ exportOptions: { ...doc.exportOptions, showUnitPrice: e.target.checked } })}
                className="rounded" />
              Hiện đơn giá
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-muted font-light">
              <input type="checkbox" checked={doc.exportOptions.showLineTotal}
                onChange={(e) => patch({ exportOptions: { ...doc.exportOptions, showLineTotal: e.target.checked } })}
                className="rounded" />
              Hiện thành tiền
            </label>
          </SbSection>

          <SbSection title="Chữ ký">
            <label className="block text-xs text-slate-muted">
              <span>
                Tỷ lệ in PDF: {Math.round((doc.quoter.signatureScale ?? 1) * 100)}%
                {doc.quoter.signatureDataUrl && (
                  <span className="block text-[10px] text-slate-muted/80 mt-0.5">
                    Con dấu tròn ≈ {Math.round(SEAL_DIAMETER_MM * (doc.quoter.signatureScale ?? 1))} mm
                  </span>
                )}
              </span>
              <input
                type="range" min={0.5} max={2} step={0.05}
                value={doc.quoter.signatureScale ?? 1}
                onChange={(e) => patch({ quoter: { ...doc.quoter, signatureScale: Number.parseFloat(e.target.value) } })}
                className="mt-2 w-full accent-sky"
              />
            </label>
            <label className="quote-tool-btn text-xs w-full cursor-pointer justify-center">
              <ImagePlus size={14} /> Tải chữ ký lên
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleSignature(e.target.files?.[0] ?? null)} />
            </label>
          </SbSection>

          <div className="mt-auto pt-3 grid grid-cols-2 gap-1.5">
            <button type="button" onClick={handleSaveQuote} className="quote-tool-btn quote-tool-btn-primary text-xs !py-2">
              <Save size={14} /> Lưu
            </button>
            <button type="button" onClick={handlePdf} disabled={exporting}
              className="quote-tool-btn quote-tool-btn-primary text-xs !py-2">
              <Download size={14} /> {exporting ? "PDF…" : "PDF"}
            </button>
          </div>
        </aside>

        {/* Main: chỉ trang giấy cuộn — sidebar + footer trang giữ nguyên */}
        <div className="min-h-0 h-full max-h-full overflow-y-auto overflow-x-hidden pr-0.5 rounded-xl">
        <div
          className="quote-sheet quote-pdf-root bg-white text-gray-900 rounded-xl shadow-xl shadow-black/20 px-4 py-6 md:px-6 md:py-8"
          style={themeStyle}
        >
          {/* Header: logo + tiêu đề + số + ngày */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-6 mb-6">
            <div className="shrink-0">
              {doc.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doc.logoDataUrl} alt="Logo" className="max-h-14 w-auto object-contain object-left" />
              ) : (
                <label className="h-14 flex items-center justify-center rounded-lg border border-dashed border-gray-200 text-[10px] text-gray-400 cursor-pointer hover:border-gray-300">
                  + Logo
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleLogo(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>
            <div className="flex-1 min-w-0 px-0 sm:px-4">
              <input value={doc.title} onChange={(e) => patch({ title: e.target.value })} className="quote-doc-title" />
            </div>
            <div className="shrink-0 space-y-1 sm:text-right sm:self-center">
              <label className="block">
                <span className="quote-meta-label">Số báo giá</span>
                <input value={doc.quoteNumber} onChange={(e) => patch({ quoteNumber: e.target.value })}
                  className="quote-meta-value mt-0.5 w-full sm:w-40 sm:ml-auto block" />
              </label>
              <label className="block">
                <span className="quote-meta-label">Ngày</span>
                <input type="date" value={doc.quoteDate} onChange={(e) => patch({ quoteDate: e.target.value })}
                  className="quote-meta-value mt-0.5 w-full sm:w-40 sm:ml-auto block" />
              </label>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <PartyBlock title="Bên báo giá" party={doc.seller} onChange={(seller) => patch({ seller })} />
            <PartyBlock title="Khách hàng" party={doc.customer} onChange={(customer) => patch({ customer })} />
          </div>

          <p className="text-[10px] text-gray-400 mb-1.5">Ctrl+V trong ô bảng để dán từ Excel</p>
          <div className="overflow-x-auto -mx-1 px-1">
            <table ref={tableRef} className="quote-table w-full border-collapse text-sm" onPaste={handleTablePaste}>
              <thead>
                <tr>
                  {doc.columns.map((col, ci) => (
                    <th key={col.id}
                      className={`quote-th border border-gray-200 p-0 ${webColumnClass(col)} ${isColHiddenOnExport(col.role) ? "opacity-40" : ""}`}>
                      <input
                        value={col.label}
                        onChange={(e) => setColumnLabel(ci, e.target.value)}
                        className={`w-full bg-transparent text-center focus:outline-none ${isNarrowHeader(col) ? "px-1 py-1.5 text-[10px]" : "px-2 py-2"}`}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {doc.rows.map((row, ri) => (
                  <tr key={row.id} className={ri % 2 === 1 ? "bg-gray-50/60" : ""}>
                    {doc.columns.map((col, ci) => {
                      const hidden = isColHiddenOnExport(col.role);
                      const colCls = webColumnClass(col);
                      const pad = colCls === "quote-col-tight" || colCls === "quote-col-narrow" ? "px-1" : "px-2";
                      if (col.role === "lineTotal") return (
                        <td key={col.id} className={`border border-gray-200 ${pad} py-1.5 text-right font-semibold text-gray-900 tabular-nums ${colCls} ${hidden ? "opacity-40" : ""}`}
                          style={{ background: "var(--quote-primary-light)" }}>
                          {getLineTotalDisplay(row, doc.columns)}
                        </td>
                      );
                      if (col.role === "vat") return (
                        <td key={col.id} className={`border border-gray-200 ${pad} py-1.5 text-right font-semibold text-gray-900 tabular-nums ${colCls} ${hidden ? "opacity-40" : ""}`}
                          style={{ background: "var(--quote-primary-light)" }}>
                          {getVatDisplay(row, doc.columns, vatRateNum)}
                        </td>
                      );
                      if (col.role === "index") return (
                        <td key={col.id} className={`border border-gray-200 ${pad} py-1.5 text-center text-gray-600 font-medium tabular-nums ${colCls} ${hidden ? "opacity-40" : ""}`}>
                          {getSttDisplay(ri)}
                        </td>
                      );
                      return (
                        <td key={col.id} className={`border border-gray-200 p-0 ${colCls} ${hidden ? "opacity-40" : ""}`}>
                          <textarea
                            data-quote-cell
                            value={row.cells[col.id] ?? ""}
                            rows={1}
                            onFocus={() => setAnchor({ rowIndex: ri, colIndex: ci })}
                            onChange={(e) => {
                              setCell(ri, col.id, e.target.value);
                              e.target.style.height = "auto";
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            className={`quote-cell-input w-full min-h-[2.25rem] py-1.5 resize-none bg-transparent text-gray-900 font-normal focus:outline-none ${
                              colCls === "quote-col-tight" || colCls === "quote-col-narrow" ? "px-1 text-center" : "px-2"
                            } ${col.role === "quantity" || col.role === "unitPrice" ? "text-right tabular-nums" : ""} ${
                              anchor.rowIndex === ri && anchor.colIndex === ci ? "ring-2 ring-inset" : ""
                            }`}
                            style={anchor.rowIndex === ri && anchor.colIndex === ci
                              ? ({ "--tw-ring-color": "var(--quote-primary)" } as CSSProperties) : undefined}
                          />
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
                        <td colSpan={Math.max(1, lineTotalColIndex)}
                          className="border border-gray-200 px-2 py-2.5 text-right quote-label !text-[0.65rem]">Tổng trước thuế</td>
                        <td className="border border-gray-200 px-2 py-2.5 text-right text-base font-bold text-gray-900 tabular-nums">
                          {formatVnMoney(grandTotal)}</td>
                        {doc.columns.slice(lineTotalColIndex + 1).map((col) => (
                          <td key={col.id} className="border border-gray-200" />
                        ))}
                      </>
                    ) : (
                      <td colSpan={doc.columns.length} className="border border-gray-200 px-2 py-2.5 text-right">
                        <span className="quote-label mr-3">Tổng trước thuế</span>
                        <span className="text-base font-bold tabular-nums">{formatVnMoney(grandTotal)}</span>
                      </td>
                    )}
                  </tr>
                  {vatRateNum > 0 && lineTotalColIndex >= 0 && (
                    <tr className="quote-tfoot">
                      <td colSpan={Math.max(1, lineTotalColIndex)}
                        className="border border-gray-200 px-2 py-2.5 text-right quote-label !text-[0.65rem]">
                        Thuế GTGT ({vatRateNum}%)</td>
                      <td className="border border-gray-200" />
                      {doc.columns.slice(lineTotalColIndex + 1).map((col) => (
                        <td key={col.id}
                          className="border border-gray-200 px-2 py-2.5 text-right text-base font-bold text-gray-900 tabular-nums">
                          {col.role === "vat" ? formatVnMoney(totalVat) : ""}
                        </td>
                      ))}
                    </tr>
                  )}
                  {lineTotalColIndex >= 0 && (
                    <tr className="quote-tfoot">
                      <td colSpan={Math.max(1, lineTotalColIndex)}
                        className="border border-gray-200 px-2 py-2.5 text-right quote-label !text-[0.65rem]">Tổng sau thuế</td>
                      <td colSpan={doc.columns.length - lineTotalColIndex}
                        className="border border-gray-200 px-2 py-2.5 text-right text-base font-bold text-gray-900 tabular-nums">
                        {formatVnMoney(payableTotal)}</td>
                    </tr>
                  )}
                </tfoot>
              )}
            </table>
          </div>

          {/* Ghi chú */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="quote-label mb-2">Ghi chú</p>
            <textarea
              value={doc.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal text-gray-800 focus:outline-none resize-y"
              onFocus={(e)  => (e.target.style.borderColor = doc.primaryColor)}
              onBlur={(e)   => (e.target.style.borderColor = "#e5e7eb")}
            />
          </div>

          {/* Người báo giá / chữ ký */}
          <div className="mt-4 max-w-[14rem] ml-auto mr-4 md:mr-6 flex flex-col items-center">
            <p className="quote-label mb-1 text-center">Người báo giá</p>
            <input value={doc.quoter.title}
              onChange={(e) => patch({ quoter: { ...doc.quoter, title: e.target.value } })}
              placeholder="Chức danh"
              className="w-full text-center text-xs font-medium text-gray-700 border-0 py-0 mb-2 leading-tight focus:outline-none bg-transparent"
            />
            <div className="quote-sig-box w-full justify-center">
              {doc.quoter.signatureDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doc.quoter.signatureDataUrl} alt="Chữ ký"
                  className="max-h-16 w-auto max-w-full object-contain mx-auto"
                  style={{ transform: `scale(${doc.quoter.signatureScale ?? 1})`, transformOrigin: "center bottom" }}
                />
              ) : (
                <label className="text-[11px] font-normal text-gray-500 cursor-pointer hover:text-gray-700 flex items-center justify-center gap-1">
                  <ImagePlus size={14} /> Chèn chữ ký
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleSignature(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>
            {doc.quoter.signatureDataUrl && (
              <button type="button"
                onClick={() => patch({ quoter: { ...doc.quoter, signatureDataUrl: null } })}
                className="text-[10px] font-normal text-red-500 hover:underline mb-1">
                Xóa chữ ký
              </button>
            )}
            <input value={doc.quoter.name}
              onChange={(e) => patch({ quoter: { ...doc.quoter, name: e.target.value } })}
              placeholder="Họ tên"
              className="w-full text-center text-sm font-bold text-gray-900 border-0 py-0.5 focus:outline-none bg-transparent"
            />
          </div>

          <p className="mt-4 text-center text-[10px] font-normal text-gray-500 tracking-wide">
            Powered by hoaphong.com.vn
          </p>
        </div>
        </div>
      </div>

      {/* === Modal thêm cột (không đổi) === */}
      {addColOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" role="dialog">
          <div className="public-card max-w-sm w-full !p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-white">Thêm cột</h2>
              <button type="button" onClick={() => setAddColOpen(false)} className="text-slate-muted hover:text-white p-1"><X size={20} /></button>
            </div>
            <label className="block">
              <span className="text-xs text-slate-muted">Loại cột</span>
              <AppSelect value={newColRole}
                onChange={(v) => { const role = v as ColumnRole; setNewColRole(role); setNewColLabel(defaultLabelForRole(role)); }}
                className="mt-1 w-full rounded-lg bg-navy border border-white/15 px-3 py-2 text-sm text-white text-left flex items-center justify-between"
                options={COLUMN_ROLE_OPTIONS.map((o) => ({ value: o.role, label: o.label }))} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-muted">Tên cột</span>
              <input value={newColLabel} onChange={(e) => setNewColLabel(e.target.value)}
                className="mt-1 w-full rounded-lg bg-navy border border-white/15 px-3 py-2 text-sm text-white" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-muted">Chèn sau cột</span>
              <AppSelect value={String(newColAfter)} onChange={(v) => setNewColAfter(Number(v))}
                className="mt-1 w-full rounded-lg bg-navy border border-white/15 px-3 py-2 text-sm text-white text-left flex items-center justify-between"
                options={[{ value: "-1", label: "Đầu bảng" }, ...doc.columns.map((c, i) => ({ value: String(i), label: c.label }))]} />
            </label>
            <button type="button" onClick={confirmAddColumn} className="quote-tool-btn quote-tool-btn-primary w-full">Thêm cột</button>
          </div>
        </div>
      )}

      {/* === Modal mở bản lưu (không đổi) === */}
      {savesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" role="dialog">
          <div className="public-card max-w-lg w-full max-h-[70vh] flex flex-col !p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold text-white">Mở bản lưu</h2>
              <button type="button" onClick={() => setSavesOpen(false)} className="text-slate-muted hover:text-white p-1"><X size={20} /></button>
            </div>
            <div className="flex gap-2 mb-3">
              <button type="button" onClick={() => setSaveTab("quote")}
                className={`quote-tool-btn text-xs flex-1 ${saveTab === "quote" ? "quote-tool-btn-primary" : ""}`}>Báo giá</button>
              <button type="button" onClick={() => setSaveTab("template")}
                className={`quote-tool-btn text-xs flex-1 ${saveTab === "template" ? "quote-tool-btn-primary" : ""}`}>Template</button>
            </div>
            <ul className="overflow-y-auto flex-1 space-y-2 min-h-0">
              {saveTab === "quote" ? (
                savedQuotes.length === 0 ? (
                  <li className="text-sm text-slate-muted py-4 text-center">Chưa có báo giá đã lưu.</li>
                ) : savedQuotes.map((q) => (
                  <li key={q.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <button type="button" onClick={() => handleLoadQuote(q.id)} className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-white truncate">{q.savedName}</p>
                      <p className="text-[11px] text-slate-muted mt-0.5">
                        {q.customer.company || q.customer.name || "—"} · {new Date(q.updatedAt).toLocaleString("vi-VN")}
                      </p>
                    </button>
                    <button type="button" onClick={() => { deleteSavedQuote(q.id); setSavedQuotes(listSavedQuotes()); }}
                      className="p-2 text-red-400/80 hover:text-red-300 shrink-0" aria-label="Xóa"><Trash2 size={16} /></button>
                  </li>
                ))
              ) : savedTemplates.length === 0 ? (
                <li className="text-sm text-slate-muted py-4 text-center">Chưa có template.</li>
              ) : savedTemplates.map((t) => (
                <li key={t.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <button type="button" onClick={() => handleLoadTemplate(t.id)} className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-white truncate">{t.savedName}</p>
                    <p className="text-[11px] text-slate-muted mt-0.5">
                      {t.columns.length} cột · {t.rowCount} dòng · {new Date(t.updatedAt).toLocaleString("vi-VN")}
                    </p>
                  </button>
                  <button type="button" onClick={() => { deleteSavedTemplate(t.id); setSavedTemplates(listSavedTemplates()); }}
                    className="p-2 text-red-400/80 hover:text-red-300 shrink-0" aria-label="Xóa"><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}