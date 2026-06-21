"use client";

import { useMemo, useState } from "react";
import { ClipboardPaste, Plus, Trash2 } from "lucide-react";
import type { ProjectItem } from "@/lib/projects/types";
import {
  getPasteImportStats,
  MAX_PASTE_COLUMNS,
  parseItemQuantity,
  parseProjectItemPaste,
} from "@/lib/projects/parse-item-paste";

const ITEM_IN =
  "block w-full max-w-full box-border rounded-md border border-white/15 bg-[#0f1a2e] px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-sky/40 focus:border-sky/50";

/** Hạng mục — layout 2 cột: tên+mô tả | SL kế hoạch / đã có */
export function ProjectItemsTab({
  projectId,
  items,
  canEdit,
  onChanged,
  linkedPhaseName,
}: {
  projectId: number;
  items: ProjectItem[];
  canEdit: boolean;
  onChanged: () => void;
  /** Công đoạn đang gán tiến độ theo hạng mục */
  linkedPhaseName?: string | null;
}) {
  const [importOpen, setImportOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  /** Clipboard HTML khi Ctrl+C từ Sheets/Excel — mỗi &lt;tr&gt; = 1 hàng, chính xác hơn plain text. */
  const [pasteHtml, setPasteHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");

  async function createItem(payload: {
    name: string;
    sortOrder: number;
    description?: string;
    quantity?: number;
  }) {
    const res = await fetch(`/api/projects/${projectId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  }

  async function patchItem(
    id: number,
    patch: Partial<{
      name: string;
      description: string;
      quantity: number;
      quantityDone: number;
    }>
  ) {
    const res = await fetch(`/api/projects/${projectId}/items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) onChanged();
  }

  async function deleteItem(id: number) {
    if (!confirm("Xóa hạng mục này?")) return;
    const res = await fetch(`/api/projects/${projectId}/items/${id}`, {
      method: "DELETE",
    });
    if (res.ok) onChanged();
  }

  async function deleteAllItems() {
    if (items.length === 0) return;
    if (
      !confirm(
        `Xóa tất cả ${items.length} hạng mục trong dự án này? Thao tác không hoàn tác được.`
      )
    ) {
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/items`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      onChanged();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(typeof j.error === "string" ? j.error : "Xóa thất bại");
    }
  }

  const parsedPreview = useMemo(
    () => (importOpen ? parseProjectItemPaste(pasteText, pasteHtml) : []),
    [importOpen, pasteText, pasteHtml]
  );

  const pasteStats = useMemo(
    () =>
      importOpen && pasteText.trim()
        ? getPasteImportStats(pasteText, pasteHtml)
        : null,
    [importOpen, pasteText, pasteHtml]
  );

  async function runImport() {
    const rows = parseProjectItemPaste(pasteText, pasteHtml);
    if (!rows.length) {
      alert(
        "Không nhận dòng nào. Chọn vùng dữ liệu trên Sheets (không gồm tiêu đề lớn), Ctrl+C rồi dán lại."
      );
      return;
    }
    setLoading(true);
    let ok = 0;
    const base = items.length;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (
        await createItem({
          name: r.name,
          description: r.description,
          quantity: r.quantity,
          sortOrder: base + i,
        })
      ) {
        ok++;
      }
    }
    setLoading(false);
    if (ok > 0) {
      setPasteText("");
      setPasteHtml(null);
      setImportOpen(false);
      onChanged();
    } else alert("Import thất bại");
  }

  async function addOne(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    const ok = await createItem({ name: newName, sortOrder: items.length, quantity: 1 });
    setLoading(false);
    if (ok) {
      setNewName("");
      onChanged();
    }
  }

  function pctDone(it: ProjectItem): number {
    if (it.quantity <= 0) return it.quantityDone > 0 ? 100 : 0;
    return Math.min(100, Math.round((it.quantityDone / it.quantity) * 100));
  }

  return (
    <div className="space-y-3 w-full min-w-0">
      <p className="text-[11px] text-slate-400 leading-relaxed">
        Chọn vùng trên Google Sheets / Excel → <strong className="text-slate-300">Ctrl+C</strong>{" "}
        rồi dán vào ô <strong className="text-slate-300">Dán nhiều hàng</strong> (không sửa tay sau
        khi dán). Hỗ trợ tới <strong className="text-slate-300">{MAX_PASTE_COLUMNS} cột</strong>;
        cột SL/KL/Qty được nhận tự động.
        Cập nhật <strong className="text-slate-300">Có</strong> khi theo dõi.
      </p>

      {linkedPhaseName && (
        <p className="text-[11px] text-emerald-200/90 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-2.5 py-2">
          Công đoạn <strong>{linkedPhaseName}</strong> đang lấy tiến độ từ tổng{" "}
          <strong>Có / SL</strong> ở đây — đủ số lượng mọi hạng mục thì công đoạn đạt 100%.
        </p>
      )}

      {canEdit && (
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={() => {
              setImportOpen((v) => {
                if (v) {
                  setPasteText("");
                  setPasteHtml(null);
                }
                return !v;
              });
            }}
            className="inline-flex items-center gap-1.5 border border-white/20 text-slate-200 px-2.5 py-1 rounded-lg text-[11px] hover:bg-white/10"
          >
            <ClipboardPaste size={13} />
            Dán nhiều hàng
          </button>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => void deleteAllItems()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 border border-rose-500/40 text-rose-300 px-2.5 py-1 rounded-lg text-[11px] hover:bg-rose-500/15 disabled:opacity-50"
            >
              <Trash2 size={13} />
              Xóa tất cả ({items.length})
            </button>
          )}
        </div>
      )}

      {importOpen && canEdit && (
        <div className="rounded-lg border border-white/15 bg-white/[0.04] p-2.5 space-y-2">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            onPaste={(e) => {
              const plain = e.clipboardData.getData("text/plain");
              const html = e.clipboardData.getData("text/html");
              if (plain && (plain.includes("\t") || plain.includes("\n") || plain.includes("\r"))) {
                e.preventDefault();
                setPasteText(plain.replace(/\u00a0/g, " "));
                setPasteHtml(html?.trim() ? html : null);
              }
            }}
            rows={6}
            placeholder={
              "Danh mục\tHãng\tXuất xứ\tĐVT\tSL\nLõi lọc dầu\tDongfang...\tTrung Quốc\tCái\t1"
            }
            className={`${ITEM_IN} text-[11px] font-mono resize-y min-h-[100px]`}
          />
          {pasteText.trim() && parsedPreview.length === 0 && (
            <p className="text-[10px] text-amber-300/90">
              Chưa nhận được dòng nào — thử copy lại vùng dữ liệu trên Sheets (Ctrl+C), không
              chụp ảnh.
            </p>
          )}
          {pasteStats && pasteStats.columnCount > 0 && (
            <p className="text-[10px] text-slate-400">
              Bảng: <strong className="text-slate-300">{pasteStats.columnCount} cột</strong>
              {pasteStats.columnCount > MAX_PASTE_COLUMNS && (
                <span className="text-amber-300/90">
                  {" "}
                  (vượt {MAX_PASTE_COLUMNS} — có thể mất cột phía phải)
                </span>
              )}
              {pasteStats.quantityColumnLabel && (
                <span>
                  {" "}
                  · SL: <strong className="text-slate-300">{pasteStats.quantityColumnLabel}</strong>
                </span>
              )}
              {!pasteStats.quantityColumnLabel && (
                <span className="text-amber-300/90"> · chưa thấy cột SL/KL/Qty trong tiêu đề</span>
              )}
            </p>
          )}
          {parsedPreview.length > 0 && (
            <p className="text-[10px] text-emerald-300/90">
              Nhận {parsedPreview.length} hạng mục
              {parsedPreview.length > 28 && (
                <span className="block text-amber-200/90 mt-0.5">
                  Đếm {parsedPreview.length} — đóng ô dán, chọn lại đúng 22 hàng trên Sheets/Excel,
                  Ctrl+C và dán lại (đừng gõ/sửa trong ô sau khi dán).
                </span>
              )}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className="text-[10px] border border-white/20 px-2 py-1 rounded text-slate-300"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={loading || parsedPreview.length === 0}
              onClick={() => void runImport()}
              className="text-[10px] bg-sky text-white px-2.5 py-1 rounded disabled:opacity-50"
            >
              {loading ? "Đang thêm…" : `Thêm ${parsedPreview.length}`}
            </button>
          </div>
        </div>
      )}

      {canEdit && (
        <form onSubmit={addOne} className="flex gap-1.5 w-full">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onPaste={(e) => {
              const plain = e.clipboardData.getData("text/plain");
              const html = e.clipboardData.getData("text/html");
              if (
                plain &&
                (plain.includes("\t") || plain.includes("\n") || plain.includes("\r"))
              ) {
                const rows = parseProjectItemPaste(plain, html?.trim() ? html : null);
                if (rows.length >= 2) {
                  e.preventDefault();
                  setImportOpen(true);
                  setPasteText(plain.replace(/\u00a0/g, " "));
                  setPasteHtml(html?.trim() ? html : null);
                  setNewName("");
                }
              }
            }}
            placeholder="Thêm một hạng mục… (dán nhiều dòng → mở dán hàng loạt)"
            className={`${ITEM_IN} text-xs flex-1 min-w-0`}
          />
          <button
            type="submit"
            disabled={loading || !newName.trim()}
            className="shrink-0 inline-flex items-center gap-1 bg-sky text-white px-2 py-1 rounded text-[11px]"
          >
            <Plus size={13} />
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-center text-slate-500 text-xs py-4">Chưa có hạng mục.</p>
      ) : (
        <ul className="space-y-2 w-full min-w-0 list-none p-0 m-0">
          {items.map((it) => {
            const pct = pctDone(it);
            const done = it.quantity > 0 && it.quantityDone >= it.quantity;
            return (
              <li
                key={it.id}
                className={`w-full rounded-lg border px-2 py-2 ${
                  done
                    ? "bg-emerald-500/5 border-emerald-500/25"
                    : "bg-white/[0.03] border-white/10"
                }`}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_70px_auto] gap-1.5 w-full items-start">
                  <div className="min-w-0 w-full flex flex-col gap-1">
                    {canEdit ? (
                      <>
                        <input
                          key={`${it.id}-n`}
                          defaultValue={it.name}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== it.name) void patchItem(it.id, { name: v });
                          }}
                          className={`${ITEM_IN} text-[11px] font-medium`}
                          placeholder="Tên hạng mục"
                        />
                        <input
                          key={`${it.id}-d`}
                          defaultValue={it.description}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v !== it.description) void patchItem(it.id, { description: v });
                          }}
                          className={`${ITEM_IN} text-[10px] text-slate-300`}
                          placeholder="Mô tả (tuỳ chọn)"
                        />
                      </>
                    ) : (
                      <>
                        <div className="text-[11px] font-medium text-slate-100 leading-snug break-words">
                          {it.name}
                        </div>
                        {it.description ? (
                          <div className="text-[10px] text-slate-500 leading-snug break-words">
                            {it.description}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>

                  <div className="w-[70px] shrink-0 flex flex-col gap-1 pt-0.5">
                    <div className="grid grid-cols-[18px_minmax(0,1fr)] items-center gap-0.5">
                      <span className="text-[8px] text-slate-500 leading-none">KH</span>
                      {canEdit ? (
                        <input
                          key={`${it.id}-q`}
                          type="text"
                          inputMode="decimal"
                          defaultValue={String(it.quantity)}
                          onBlur={(e) => {
                            const q = parseItemQuantity(e.target.value);
                            if (q !== it.quantity) void patchItem(it.id, { quantity: q });
                          }}
                          className={`${ITEM_IN} w-full text-center text-[10px] tabular-nums py-0.5 px-1`}
                        />
                      ) : (
                        <span className="text-[10px] tabular-nums text-slate-300 text-center">
                          {it.quantity}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-[18px_minmax(0,1fr)] items-center gap-0.5">
                      <span className="text-[8px] text-emerald-400/90 leading-none">Có</span>
                      {canEdit ? (
                        <input
                          key={`${it.id}-qd`}
                          type="text"
                          inputMode="decimal"
                          defaultValue={String(it.quantityDone)}
                          onBlur={(e) => {
                            const q = Math.max(0, parseItemQuantity(e.target.value));
                            if (q !== it.quantityDone) {
                              void patchItem(it.id, { quantityDone: q });
                            }
                          }}
                          className={`${ITEM_IN} w-full text-center text-[10px] tabular-nums text-emerald-200 py-0.5 px-1`}
                        />
                      ) : (
                        <span className="text-[10px] tabular-nums text-emerald-200 text-center">
                          {it.quantityDone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-between shrink-0 w-7 pt-0.5">
                    <span
                      className={`text-[9px] tabular-nums leading-none ${
                        done ? "text-emerald-300" : "text-slate-500"
                      }`}
                    >
                      {pct}%
                    </span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => deleteItem(it.id)}
                        className="text-rose-400 hover:text-rose-300 p-0.5"
                        title="Xóa"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
