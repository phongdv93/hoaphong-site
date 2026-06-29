"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Eye,
  EyeOff,
  FilePlus,
  FolderOpen,
  ImagePlus,
  Layers,
  LayoutTemplate,
  Plus,
  Save,
  SlidersHorizontal,
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
import { ErpDateInput } from "@/components/erp/ErpDateInput";
import {
  calcGrandTotal,
  calcTotalVat,
  exportShowsLineTotal,
  formatVnMoney,
  getLineTotalDisplay,
  getSttDisplay,
  getVatDisplay,
  guessColumnRole,
  isColumnHiddenOnExport,
  parseVatRate,
  SEAL_DIAMETER_MM,
} from "@/lib/quote/calc";
import { applyPasteToGrid, isPasteHeaderRow, parseClipboardMatrix } from "@/lib/quote/paste";
import { AppSelect } from "@/components/ui/AppSelect";
import {
  applyTemplate,
  defaultLabelForRole,
  docToTemplate,
  insertColumnAt,
} from "@/lib/quote/template";
import {
  createQuoteStorage,
  type QuoteStorageScope,
} from "@/lib/quote/storage";
import { extractCatalogLinesFromQuote } from "@/lib/quote/to-catalog";
import type { CellRange, QuoteColumn, QuoteDocument, QuoteParty, QuoteTemplate } from "@/lib/quote/types";
import { COLUMN_ROLE_OPTIONS } from "@/lib/quote/types";
import type { ColumnRole } from "@/lib/quote/types";
import { primaryCssVars } from "@/lib/quote/theme";
import { FONT_FAMILIES } from "@/lib/quote/pdf-fonts";
import { primaryColorForTemplate, type PdfTemplateMeta } from "@/lib/quote/pdf-templates";
import { QuotePreviewModal } from "@/components/quote/QuotePreviewModal";
import { CustomerPartyBlock } from "@/components/quote/CustomerPartyBlock";
import type { Customer } from "@/lib/marketing/customer-types";
import { createNewQuoteDocument } from "@/lib/quote/new-quote";
import {
  countEditableCellsInRange,
  isCellInRange,
  isColumnEditable,
  isSingleCellRange,
  normalizeCellRange,
  pasteAnchorFromRange,
  selectedRowCount,
} from "@/lib/quote/selection";

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
  editMode = false,
}: {
  title: string;
  party: QuoteParty;
  onChange: (party: QuoteParty) => void;
  editMode?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  // auto-expand nếu có dữ liệu ở field phụ
  const hasExtraData = PARTY_FIELDS_EXTRA.some((f) => {
    const v = party[f.key];
    return typeof v === "string" && v.trim() !== "";
  });

  const showExtra = expanded || hasExtraData;

  return (
    <div className={editMode ? "quote-party-pill-dark" : "quote-party-pill"}>
      <p className={editMode ? "quote-party-title-dark" : "quote-party-title"}>{title}</p>
      <div className="space-y-0.5">
        <input
          type="text"
          value={party.company ?? ""}
          onChange={(e) => onChange({ ...party, company: e.target.value })}
          placeholder="Tên công ty / tổ chức"
          className={editMode ? "quote-party-line-dark quote-party-line-dark-bold" : "quote-party-line quote-party-line-bold"}
        />
        <input
          type="text"
          value={party.name ?? ""}
          onChange={(e) => onChange({ ...party, name: e.target.value })}
          placeholder="Người liên hệ"
          className={editMode ? "quote-party-line-dark" : "quote-party-line"}
        />
        <input
          type="text"
          value={party.phone ?? ""}
          onChange={(e) => onChange({ ...party, phone: e.target.value })}
          placeholder="Điện thoại"
          className={editMode ? "quote-party-line-dark" : "quote-party-line"}
        />
        <input
          type="text"
          value={party.email ?? ""}
          onChange={(e) => onChange({ ...party, email: e.target.value })}
          placeholder="Email"
          className={editMode ? "quote-party-line-dark" : "quote-party-line"}
        />
      </div>

      {showExtra && (
        <div className={`space-y-0.5 mt-2 pt-2 border-t ${editMode ? "border-white/10" : "border-gray-100"}`}>
          <textarea
            value={party.address ?? ""}
            onChange={(e) => onChange({ ...party, address: e.target.value })}
            placeholder="Địa chỉ"
            rows={2}
            className={`${editMode ? "quote-party-line-dark" : "quote-party-line"} resize-none min-h-[2.5rem]`}
          />
          {PARTY_FIELDS_EXTRA.filter((f) => f.key !== "address").map((f) => (
            <input
              key={f.key}
              type="text"
              value={party[f.key] ?? ""}
              onChange={(e) => onChange({ ...party, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className={editMode ? "quote-party-line-dark" : "quote-party-line"}
            />
          ))}
        </div>
      )}

      {!hasExtraData && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`flex items-center gap-1 text-[10px] mt-2 ${editMode ? "text-slate-muted hover:text-white" : "text-gray-400 hover:text-gray-600"}`}
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

export function QuoteBuilder({
  defaultSeller,
  variant = "mini",
}: {
  defaultSeller?: Partial<QuoteParty>;
  /** mini = công cụ public; erp = báo giá nội bộ công ty */
  variant?: QuoteStorageScope;
}) {
  const isErp = variant === "erp";
  const storage = useMemo(() => createQuoteStorage(variant), [variant]);
  const tableRef = useRef<HTMLTableElement>(null);
  const gridFocusRef = useRef<HTMLDivElement>(null);
  const cellInputRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const isDraggingRef = useRef(false);
  const cellRangeRef = useRef<CellRange>({ start: { rowIndex: 0, colIndex: 0 }, end: { rowIndex: 0, colIndex: 0 } });
  const [doc, setDoc] = useState<QuoteDocument>(() => createQuote({ seller: defaultSeller }));
  const [cellRange, setCellRange] = useState<CellRange>({ start: { rowIndex: 0, colIndex: 0 }, end: { rowIndex: 0, colIndex: 0 } });
  const [isSelecting, setIsSelecting] = useState(false);
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  useEffect(() => {
    const draft = storage.loadDraft();
    if (draft) {
      setDoc(draft);
      setSaveName(draft.savedName);
    } else {
      const initial = createQuote({ seller: defaultSeller });
      setDoc(initial);
      setSaveName(initial.savedName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storage]);

  useEffect(() => {
    if (!defaultSeller?.company) return;
    setDoc((prev) => {
      if (prev.seller.company?.trim()) return prev;
      return { ...prev, seller: { ...prev.seller, ...defaultSeller } };
    });
  }, [defaultSeller]);

  useEffect(() => {
    if (!isErp) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/marketing/customers");
        if (!res.ok || cancelled) return;
        setCustomers((await res.json()) as Customer[]);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isErp]);

  const lineTotalColIndex = useMemo(
    () => doc.columns.findIndex((c) => c.role === "lineTotal"),
    [doc.columns]
  );
  const vatRateNum = useMemo(() => parseVatRate(doc.vatRate), [doc.vatRate]);
  const grandTotal = useMemo(() => calcGrandTotal(doc.rows, doc.columns), [doc.rows, doc.columns]);
  const totalVat   = useMemo(() => calcTotalVat(doc.rows, doc.columns, vatRateNum), [doc.rows, doc.columns, vatRateNum]);
  const payableTotal = grandTotal + totalVat;

  useEffect(() => {
    const t = setTimeout(() => storage.saveDraft(doc), 400);
    return () => clearTimeout(t);
  }, [doc, storage]);

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

  const deleteSelectedColumns = useCallback(() => {
    const { colMin, colMax } = normalizeCellRange(cellRangeRef.current);
    const removeCount = colMax - colMin + 1;
    setDoc((prev) => {
      if (prev.columns.length <= removeCount) return prev;
      const remove = new Set(Array.from({ length: removeCount }, (_, i) => colMin + i));
      const columns = prev.columns.filter((_, i) => !remove.has(i));
      return { ...prev, columns, rows: syncRowsWithColumns(prev.rows, columns), updatedAt: new Date().toISOString() };
    });
    const nextCol = Math.min(colMin, doc.columns.length - removeCount - 1);
    setCellRange({
      start: { rowIndex: cellRangeRef.current.start.rowIndex, colIndex: Math.max(0, nextCol) },
      end: { rowIndex: cellRangeRef.current.end.rowIndex, colIndex: Math.max(0, nextCol) },
    });
    setToast(`Đã xóa ${removeCount} cột`);
    setTimeout(() => setToast(null), 2800);
  }, [doc.columns.length]);

  const toggleColumnHiddenOnExport = (colIndex: number) => {
    setDoc((prev) => ({
      ...prev,
      columns: prev.columns.map((col, i) =>
        i === colIndex ? { ...col, hiddenOnExport: !col.hiddenOnExport } : col
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  const selectionCols = useMemo(() => {
    const { colMin, colMax } = normalizeCellRange(cellRange);
    return colMax - colMin + 1;
  }, [cellRange]);

  const setCell = (rowIndex: number, colId: string, value: string) => {
    setDoc((prev) => {
      const col = prev.columns.find((c) => c.id === colId);
      if (col?.role === "lineTotal" || col?.role === "index" || col?.role === "vat") return prev;
      return { ...prev, rows: prev.rows.map((row, i) => i === rowIndex ? { ...row, cells: { ...row.cells, [colId]: value } } : row), updatedAt: new Date().toISOString() };
    });
  };

  const cellKey = (rowIndex: number, colIndex: number) => `${rowIndex}:${colIndex}`;

  useEffect(() => {
    cellRangeRef.current = cellRange;
  }, [cellRange]);

  const shouldInterceptGridDelete = useCallback((el: Element | null, key: string) => {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false;
    if (!el.closest("[data-quote-grid]")) return false;
    if (el instanceof HTMLInputElement && el.closest("thead")) return false;
    if (!isSingleCellRange(cellRangeRef.current)) return true;
    if (!(el instanceof HTMLTextAreaElement)) return false;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start !== end) return false;
    if (key === "Backspace" && start > 0) return false;
    if (key === "Delete" && end < el.value.length) return false;
    return true;
  }, []);

  const focusGrid = useCallback(() => {
    gridFocusRef.current?.focus({ preventScroll: true });
  }, []);

  const clearSelectedCells = useCallback(() => {
    const range = cellRangeRef.current;
    const editable = countEditableCellsInRange(range, doc.columns.length, (ci) => doc.columns[ci]?.role);
    if (editable === 0) {
      setToast("Ô STT / Thành tiền / Thuế tính tự động — không xóa được");
      setTimeout(() => setToast(null), 2800);
      return 0;
    }
    const { rowMin, rowMax, colMin, colMax } = normalizeCellRange(range);
    setDoc((prev) => ({
      ...prev,
      rows: prev.rows.map((row, ri) => {
        if (ri < rowMin || ri > rowMax) return row;
        const cells = { ...row.cells };
        prev.columns.forEach((col, ci) => {
          if (ci < colMin || ci > colMax || !isColumnEditable(col.role)) return;
          cells[col.id] = "";
        });
        return { ...row, cells };
      }),
      updatedAt: new Date().toISOString(),
    }));
    return editable;
  }, [doc.columns]);

  const handleClearSelection = useCallback(() => {
    const n = clearSelectedCells();
    if (n > 0) {
      setToast(`Đã xóa ${n} ô`);
      setTimeout(() => setToast(null), 2800);
    }
    focusGrid();
  }, [clearSelectedCells, focusGrid]);

  const deleteSelectedRows = useCallback(() => {
    const { rowMin, rowMax } = normalizeCellRange(cellRangeRef.current);
    const removeCount = rowMax - rowMin + 1;
    setDoc((prev) => {
      if (prev.rows.length <= removeCount) return prev;
      const rows = [...prev.rows.slice(0, rowMin), ...prev.rows.slice(rowMax + 1)];
      return { ...prev, rows, updatedAt: new Date().toISOString() };
    });
    const nextRow = Math.min(rowMin, doc.rows.length - removeCount - 1);
    setCellRange({
      start: { rowIndex: Math.max(0, nextRow), colIndex: cellRangeRef.current.start.colIndex },
      end: { rowIndex: Math.max(0, nextRow), colIndex: cellRangeRef.current.end.colIndex },
    });
    setToast(`Đã xóa ${removeCount} dòng`);
    setTimeout(() => setToast(null), 2800);
  }, [doc.rows.length]);

  const finishSelectionInteraction = useCallback(() => {
    const range = cellRangeRef.current;
    if (!isSingleCellRange(range)) {
      if (document.activeElement instanceof HTMLTextAreaElement) {
        document.activeElement.blur();
      }
      focusGrid();
      return;
    }
    const { rowMin, colMin } = normalizeCellRange(range);
    const col = doc.columns[colMin];
    if (!isColumnEditable(col?.role)) {
      focusGrid();
      return;
    }
    const el = cellInputRefs.current.get(cellKey(rowMin, colMin));
    el?.focus();
    el?.select();
  }, [doc.columns, focusGrid]);

  const endCellDrag = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsSelecting(false);
    finishSelectionInteraction();
  }, [finishSelectionInteraction]);

  const handleCellMouseDown = (rowIndex: number, colIndex: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target;
    if (
      target instanceof HTMLTextAreaElement &&
      document.activeElement === target &&
      isSingleCellRange(cellRangeRef.current)
    ) {
      const { rowMin, colMin } = normalizeCellRange(cellRangeRef.current);
      if (rowMin === rowIndex && colMin === colIndex) return;
    }
    if (e.shiftKey) {
      setCellRange((prev) => ({ start: prev.start, end: { rowIndex, colIndex } }));
      e.preventDefault();
      requestAnimationFrame(() => focusGrid());
      return;
    }
    isDraggingRef.current = true;
    setIsSelecting(true);
    setCellRange({
      start: { rowIndex, colIndex },
      end: { rowIndex, colIndex },
    });
    e.preventDefault();
  };

  const handleCellMouseEnter = (rowIndex: number, colIndex: number) => {
    if (!isDraggingRef.current) return;
    setCellRange((prev) => ({ start: prev.start, end: { rowIndex, colIndex } }));
  };

  useEffect(() => {
    window.addEventListener("mouseup", endCellDrag);
    return () => window.removeEventListener("mouseup", endCellDrag);
  }, [endCellDrag]);

  const isExternalTextInput = (el: Element | null) => {
    if (!el || !(el instanceof HTMLElement)) return false;
    if (el.closest("[data-quote-grid]")) return false;
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el.isContentEditable;
  };

  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Delete" && e.key !== "Backspace") return;
    if (!shouldInterceptGridDelete(document.activeElement, e.key)) return;
    e.preventDefault();
    handleClearSelection();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (isExternalTextInput(document.activeElement)) return;
      if (!shouldInterceptGridDelete(document.activeElement, e.key)) return;
      e.preventDefault();
      handleClearSelection();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClearSelection, shouldInterceptGridDelete]);

  const selectionRows = useMemo(() => selectedRowCount(cellRange), [cellRange]);
  const pasteAnchor = useMemo(() => pasteAnchorFromRange(cellRange), [cellRange]);

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
    const usedHeader = matrix.length > 0 && isPasteHeaderRow(matrix[0]);
    const dataRows = usedHeader ? matrix.length - 1 : matrix.length;
    const colCount = Math.max(...matrix.map((r) => r.length));
    showToast(
      usedHeader
        ? `Đã dán ${dataRows} dòng (nhận header Excel)`
        : `Đã dán ${matrix.length} dòng × ${colCount} cột`
    );
    setDoc((prev) => {
      const result = applyPasteToGrid(prev.columns, prev.rows, pasteAnchor.rowIndex, pasteAnchor.colIndex, matrix);
      return { ...prev, ...result, updatedAt: new Date().toISOString() };
    });
  };

  const handleSaveQuote = () => {
    const name  = saveName.trim() || doc.savedName || (isErp ? "Báo giá" : "Bản lưu");
    const saved = storage.saveQuote({ ...doc, savedName: name });
    setDoc(saved); setSaveName(name);
    showToast(isErp ? "Đã lưu báo giá" : "Đã lưu trên trình duyệt");
    // Chỉ ERP: đồng bộ dòng hàng vào danh mục SP tenant (mini tool = khách vãng lai, localStorage only).
    if (isErp) void syncCatalogFromQuote(saved, name);
  };

  const syncCatalogFromQuote = async (quoteDoc: typeof doc, quoteName: string) => {
    const lines = extractCatalogLinesFromQuote(quoteDoc);
    if (!lines.length) return;
    try {
      const res = await fetch("/api/factory/products/import-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteNumber: quoteDoc.quoteNumber,
          quoteName,
          lines,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(j.message || `Đã đồng bộ ${lines.length} dòng vào danh mục SP`);
      }
    } catch {
      // im lặng — lưu local vẫn thành công
    }
  };

  const handleSaveToCatalog = async () => {
    const lines = extractCatalogLinesFromQuote(doc);
    if (!lines.length) {
      showToast("Không có dòng hàng — cần cột Tên/Danh mục hoặc Nội dung");
      return;
    }
    setExporting(true);
    try {
      const res = await fetch("/api/factory/products/import-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteNumber: doc.quoteNumber,
          quoteName: saveName.trim() || doc.savedName,
          lines,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(j.error || "Cần đăng nhập ERP và chọn công ty");
        return;
      }
      showToast(j.message || `Đã lưu danh mục SP`);
    } catch {
      showToast("Không kết nối được server");
    } finally {
      setExporting(false);
    }
  };

  const handleSaveTemplate = () => {
    const name = saveName.trim() || "Template báo giá";
    storage.saveTemplate(docToTemplate(doc, name));
    showToast("Đã lưu template");
  };

  const openSaves = () => { setSavedQuotes(storage.listSavedQuotes()); setSavedTemplates(storage.listSavedTemplates()); setSaveTab("quote"); setSavesOpen(true); };

  const handleLoadQuote    = (id: string) => { const loaded = storage.loadSavedQuote(id);    if (!loaded) return; setDoc(loaded); setSaveName(loaded.savedName); setSavesOpen(false); showToast("Đã mở báo giá"); };
  const handleLoadTemplate = (id: string) => { const tmpl   = storage.loadSavedTemplate(id); if (!tmpl)   return; setDoc(applyTemplate(tmpl, doc)); setSaveName(tmpl.savedName); setSavesOpen(false); showToast("Đã áp template"); };

  const handleNew = () => {
    const msg = isErp
      ? "Tạo báo giá mới? Giữ cấu hình in và thông tin công ty; khách hàng và dòng hàng sẽ được làm mới."
      : "Tạo bản mới? Nội dung chưa lưu sẽ mất.";
    if (!confirm(msg)) return;
    const fresh = isErp
      ? createNewQuoteDocument({ seller: defaultSeller ?? doc.seller, preserveFrom: doc })
      : createQuote({ seller: defaultSeller });
    setDoc(fresh);
    setSaveName(fresh.savedName);
    storage.clearDraft();
    storage.saveDraft(fresh);
    showToast(isErp ? "Đã tạo báo giá mới" : "Đã tạo bản mới");
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

  const isColHiddenOnExport = (col: QuoteColumn) => isColumnHiddenOnExport(col);

  const handleSelectPrintTemplate = (template: PdfTemplateMeta) => {
    patch({
      pdfTemplateId: template.id,
      primaryColor: primaryColorForTemplate(template.id),
    });
  };

  const handleOrientationChange = (pageOrientation: "portrait" | "landscape") => {
    patch({ exportOptions: { ...doc.exportOptions, pageOrientation } });
  };

  const themeStyle = primaryCssVars(doc.primaryColor);

  return (
    <div className="flex flex-col h-full min-h-0">
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-sky/90 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Topbar */}
      <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/10 pb-3 mb-3">
        <input
          type="text"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          className="min-w-0 flex-1 max-w-md rounded-lg bg-white/5 border border-white/15 px-2.5 py-1.5 text-sm text-white"
          placeholder={isErp ? "Tên báo giá…" : "Tên bản lưu…"}
        />
        <div className="flex flex-wrap gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className={`quote-tool-btn text-xs ${sidebarOpen ? "quote-tool-btn-primary" : ""}`}
          >
            <SlidersHorizontal size={14} /> Tùy chỉnh
          </button>
          <button
            type="button"
            onClick={handleNew}
            className={`quote-tool-btn text-xs ${isErp ? "quote-tool-btn-primary" : ""}`}
          >
            <FilePlus size={14} /> {isErp ? "Báo giá mới" : "Mới"}
          </button>
          <button type="button" onClick={openSaves} className="quote-tool-btn text-xs">
            <FolderOpen size={14} /> Mở
          </button>
          <button type="button" onClick={handleSaveTemplate} className="quote-tool-btn text-xs">
            <LayoutTemplate size={14} /> Template
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="quote-tool-btn quote-tool-btn-primary text-xs"
          >
            <Eye size={14} /> Xem & in
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-3 overflow-hidden relative">
        {sidebarOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-30 bg-black/50 lg:hidden"
              aria-label="Đóng tùy chỉnh"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="quote-sidebar z-40 fixed inset-y-0 left-0 w-[min(100%,17rem)] flex flex-col min-h-0 overflow-y-auto lg:relative lg:z-auto lg:inset-auto lg:w-[14rem] lg:shrink-0 lg:max-h-full divide-y divide-white/10 shadow-xl lg:shadow-none">
              <div className="flex items-center justify-between lg:hidden pt-1 pb-2 border-b border-white/10 mb-1">
                <span className="text-xs font-semibold text-white">Tùy chỉnh</span>
                <button type="button" onClick={() => setSidebarOpen(false)} className="p-1 text-slate-muted">
                  <X size={18} />
                </button>
              </div>

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

          <SbSection title="Font in PDF">
            <label className="block text-xs text-slate-muted">
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
              <button type="button" onClick={addRow} className="quote-tool-btn text-[11px] !py-1.5">+ Dòng</button>
              <button type="button" onClick={removeRow} className="quote-tool-btn text-[11px] !py-1.5">− Dòng</button>
              <button
                type="button"
                onClick={deleteSelectedRows}
                disabled={selectionRows < 1 || doc.rows.length <= selectionRows}
                className="quote-tool-btn text-[11px] !py-1.5 col-span-2"
              >
                <Trash2 size={12} /> Xóa {selectionRows} dòng chọn
              </button>
              <button
                type="button"
                onClick={deleteSelectedColumns}
                disabled={selectionCols < 1 || doc.columns.length <= selectionCols}
                className="quote-tool-btn text-[11px] !py-1.5 col-span-2"
              >
                <Trash2 size={12} /> Xóa {selectionCols} cột chọn
              </button>
              <button type="button" onClick={openAddColumn} className="quote-tool-btn text-[11px] !py-1.5 col-span-2">
                <Plus size={12} /> Cột…
              </button>
            </div>
          </SbSection>

          <SbSection title="Thuế">
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

          <div className="mt-auto pt-3 space-y-1.5">
            <button type="button" onClick={handleSaveQuote} className="quote-tool-btn quote-tool-btn-primary text-xs !py-2 w-full">
              <Save size={14} /> {isErp ? "Lưu báo giá" : "Lưu trên máy"}
            </button>
            {isErp && (
              <button
                type="button"
                onClick={() => void handleSaveToCatalog()}
                disabled={exporting}
                className="quote-tool-btn text-xs !py-2 w-full"
                title="Lưu các dòng hàng vào danh mục sản phẩm ERP"
              >
                <Layers size={14} /> Lưu danh mục SP
              </button>
            )}
          </div>
            </aside>
          </>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-0.5">
        <div className="quote-edit-surface" style={themeStyle}>
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-white/10 pb-3 mb-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="shrink-0">
                {doc.logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={doc.logoDataUrl} alt="Logo" className="max-h-10 w-auto object-contain object-left rounded" />
                ) : (
                  <label className="h-10 flex items-center justify-center rounded-lg border border-dashed border-white/20 text-[10px] text-slate-muted cursor-pointer hover:border-white/35 px-3">
                    + Logo
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleLogo(e.target.files?.[0] ?? null)} />
                  </label>
                )}
              </div>
              <input
                value={doc.title}
                onChange={(e) => patch({ title: e.target.value })}
                className="quote-doc-title min-w-0 flex-1 bg-transparent border-0 outline-none"
              />
            </div>
            <div className="quote-meta-fields">
              <label className="quote-meta-field">
                <span className="quote-meta-label">Số báo giá</span>
                <input
                  value={doc.quoteNumber}
                  onChange={(e) => patch({ quoteNumber: e.target.value })}
                  className="quote-meta-input"
                />
              </label>
              <label className="quote-meta-field">
                <span className="quote-meta-label">Ngày</span>
                <ErpDateInput
                  value={doc.quoteDate}
                  onChange={(v) => patch({ quoteDate: v })}
                  className="quote-meta-date w-full"
                />
              </label>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <PartyBlock editMode title="Bên báo giá" party={doc.seller} onChange={(seller) => patch({ seller })} />
            {isErp ? (
              <CustomerPartyBlock
                party={doc.customer}
                onChange={(customer) => patch({ customer })}
                customers={customers}
              />
            ) : (
              <PartyBlock editMode title="Khách hàng" party={doc.customer} onChange={(customer) => patch({ customer })} />
            )}
          </div>

          <p className="text-[10px] text-slate-muted mb-1.5">
            Kéo chọn nhiều ô · Delete xóa nội dung · Icon mắt trên tiêu đề cột = ẩn khi in
          </p>
          <div
            ref={gridFocusRef}
            data-quote-grid
            tabIndex={0}
            onKeyDown={handleGridKeyDown}
            className="overflow-x-auto -mx-1 px-1 rounded-lg outline-none focus:ring-1 focus:ring-sky/40"
          >
            <table
              ref={tableRef}
              className={`quote-table quote-table-dark w-full border-collapse text-sm${isSelecting ? " quote-table-selecting" : ""}`}
              onPaste={handleTablePaste}
            >
              <thead>
                <tr>
                  {doc.columns.map((col, ci) => (
                    <th
                      key={col.id}
                      className={`quote-th-dark border p-0 ${webColumnClass(col)} ${isColHiddenOnExport(col) ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-stretch min-h-[2.25rem]">
                        <input
                          value={col.label}
                          onChange={(e) => setColumnLabel(ci, e.target.value)}
                          className={`flex-1 min-w-0 bg-transparent text-center text-sky-light focus:outline-none ${isNarrowHeader(col) ? "px-1 py-1.5 text-[10px]" : "px-2 py-2"}`}
                        />
                        <button
                          type="button"
                          onClick={() => toggleColumnHiddenOnExport(ci)}
                          title={col.hiddenOnExport ? "Đang ẩn khi in — bấm để hiện" : "Hiện khi in — bấm để ẩn"}
                          className={`shrink-0 px-1.5 border-l border-white/10 hover:bg-white/10 transition-colors ${
                            col.hiddenOnExport ? "text-amber-300" : "text-slate-muted"
                          }`}
                        >
                          {col.hiddenOnExport ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {doc.rows.map((row, ri) => (
                  <tr key={row.id} className={ri % 2 === 1 ? "bg-white/[0.02]" : ""}>
                    {doc.columns.map((col, ci) => {
                      const hidden = isColHiddenOnExport(col);
                      const colCls = webColumnClass(col);
                      const pad = colCls === "quote-col-tight" || colCls === "quote-col-narrow" ? "px-1" : "px-2";
                      const selected = isCellInRange(ri, ci, cellRange);
                      const selectCls = selected ? " quote-cell-selected" : "";
                      const selectHandlers = {
                        onMouseDown: (e: React.MouseEvent) => handleCellMouseDown(ri, ci, e),
                        onMouseEnter: () => handleCellMouseEnter(ri, ci),
                      };
                      if (col.role === "lineTotal") return (
                        <td
                          key={col.id}
                          {...selectHandlers}
                          className={`border ${pad} py-1.5 text-right font-semibold text-sky-light tabular-nums ${colCls}${selectCls} ${hidden ? "opacity-40" : ""}`}
                          style={{ background: "color-mix(in srgb, var(--quote-primary) 12%, transparent)" }}
                        >
                          {getLineTotalDisplay(row, doc.columns)}
                        </td>
                      );
                      if (col.role === "vat") return (
                        <td
                          key={col.id}
                          {...selectHandlers}
                          className={`border ${pad} py-1.5 text-right font-semibold text-sky-light tabular-nums ${colCls}${selectCls} ${hidden ? "opacity-40" : ""}`}
                          style={{ background: "color-mix(in srgb, var(--quote-primary) 12%, transparent)" }}
                        >
                          {getVatDisplay(row, doc.columns, vatRateNum)}
                        </td>
                      );
                      if (col.role === "index") return (
                        <td
                          key={col.id}
                          {...selectHandlers}
                          className={`border ${pad} py-1.5 text-center text-slate-muted font-medium tabular-nums ${colCls}${selectCls} ${hidden ? "opacity-40" : ""}`}
                        >
                          {getSttDisplay(ri)}
                        </td>
                      );
                      return (
                        <td
                          key={col.id}
                          {...selectHandlers}
                          className={`border p-0 ${colCls}${selectCls} ${hidden ? "opacity-40" : ""}`}
                        >
                          <textarea
                            data-quote-cell
                            ref={(el) => {
                              const key = cellKey(ri, ci);
                              if (el) cellInputRefs.current.set(key, el);
                              else cellInputRefs.current.delete(key);
                            }}
                            value={row.cells[col.id] ?? ""}
                            rows={1}
                            onFocus={() =>
                              setCellRange({
                                start: { rowIndex: ri, colIndex: ci },
                                end: { rowIndex: ri, colIndex: ci },
                              })
                            }
                            onChange={(e) => {
                              setCell(ri, col.id, e.target.value);
                              e.target.style.height = "auto";
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            className={`quote-cell-input quote-cell-input-dark w-full min-h-[2.25rem] py-1.5 resize-none bg-transparent font-normal focus:outline-none ${
                              colCls === "quote-col-tight" || colCls === "quote-col-narrow" ? "px-1 text-center" : "px-2"
                            } ${col.role === "quantity" || col.role === "unitPrice" ? "text-right tabular-nums" : ""}`}
                          />
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
                        <td colSpan={Math.max(1, lineTotalColIndex)}
                          className="border px-2 py-2.5 text-right quote-label !text-[0.65rem]">Tổng trước thuế</td>
                        <td className="border px-2 py-2.5 text-right text-base font-bold text-white tabular-nums">
                          {formatVnMoney(grandTotal)}</td>
                        {doc.columns.slice(lineTotalColIndex + 1).map((col) => (
                          <td key={col.id} className="border" />
                        ))}
                      </>
                    ) : (
                      <td colSpan={doc.columns.length} className="border px-2 py-2.5 text-right">
                        <span className="quote-label mr-3">Tổng trước thuế</span>
                        <span className="text-base font-bold tabular-nums text-white">{formatVnMoney(grandTotal)}</span>
                      </td>
                    )}
                  </tr>
                  {vatRateNum > 0 && lineTotalColIndex >= 0 && (
                    <tr className="quote-tfoot">
                      <td colSpan={Math.max(1, lineTotalColIndex)}
                        className="border px-2 py-2.5 text-right quote-label !text-[0.65rem]">
                        Thuế GTGT ({vatRateNum}%)</td>
                      <td className="border" />
                      {doc.columns.slice(lineTotalColIndex + 1).map((col) => (
                        <td key={col.id}
                          className="border px-2 py-2.5 text-right text-base font-bold text-white tabular-nums">
                          {col.role === "vat" ? formatVnMoney(totalVat) : ""}
                        </td>
                      ))}
                    </tr>
                  )}
                  {lineTotalColIndex >= 0 && (
                    <tr className="quote-tfoot">
                      <td colSpan={Math.max(1, lineTotalColIndex)}
                        className="border px-2 py-2.5 text-right quote-label !text-[0.65rem]">Tổng sau thuế</td>
                      <td colSpan={doc.columns.length - lineTotalColIndex}
                        className="border px-2 py-2.5 text-right text-base font-bold text-white tabular-nums">
                        {formatVnMoney(payableTotal)}</td>
                    </tr>
                  )}
                </tfoot>
              )}
            </table>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="quote-label mb-2">Ghi chú</p>
            <textarea
              value={doc.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              rows={2}
              className="input-field-dark resize-y min-h-[4rem]"
            />
          </div>

          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2">
              <p className="quote-label">Người báo giá</p>
              <input
                value={doc.quoter.title}
                onChange={(e) => patch({ quoter: { ...doc.quoter, title: e.target.value } })}
                placeholder="Chức danh"
                className="input-field-dark text-sm"
              />
              <input
                value={doc.quoter.name}
                onChange={(e) => patch({ quoter: { ...doc.quoter, name: e.target.value } })}
                placeholder="Họ tên"
                className="input-field-dark text-sm font-semibold"
              />
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <p className="quote-label mb-2">Chữ ký (hiện khi in)</p>
              {doc.quoter.signatureDataUrl ? (
                <div className="flex items-end gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={doc.quoter.signatureDataUrl}
                    alt="Chữ ký"
                    className="max-h-14 w-auto object-contain"
                    style={{ transform: `scale(${doc.quoter.signatureScale ?? 1})`, transformOrigin: "left bottom" }}
                  />
                  <button
                    type="button"
                    onClick={() => patch({ quoter: { ...doc.quoter, signatureDataUrl: null } })}
                    className="text-[10px] text-red-400 hover:underline"
                  >
                    Xóa
                  </button>
                </div>
              ) : (
                <label className="quote-tool-btn text-xs w-full cursor-pointer justify-center">
                  <ImagePlus size={14} /> Tải chữ ký
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleSignature(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      <QuotePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        doc={doc}
        grandTotal={grandTotal}
        totalVat={totalVat}
        payableTotal={payableTotal}
        vatRateNum={vatRateNum}
        lineTotalColIndex={lineTotalColIndex}
        exporting={exporting}
        onSelectTemplate={handleSelectPrintTemplate}
        onOrientationChange={handleOrientationChange}
        onExportPdf={handlePdf}
      />

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
                    <button type="button" onClick={() => { storage.deleteSavedQuote(q.id); setSavedQuotes(storage.listSavedQuotes()); }}
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
                  <button type="button" onClick={() => { storage.deleteSavedTemplate(t.id); setSavedTemplates(storage.listSavedTemplates()); }}
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