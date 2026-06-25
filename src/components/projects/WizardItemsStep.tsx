"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ProjectItem } from "@/lib/projects/types";
import {
  parseItemQuantity,
  parseProjectItemPaste,
  type ParsedProjectItemRow,
} from "@/lib/projects/parse-item-paste";

function normSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function WizardItemsStep({
  projectId,
  items,
  onChanged,
}: {
  projectId: number;
  items: ProjectItem[];
  onChanged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState("1");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState<Array<{ id: number; name: string }>>([]);
  const [msg, setMsg] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/factory/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (!Array.isArray(list)) return;
        setCatalog(
          list.map((p: { id: number; name: string }) => ({
            id: p.id,
            name: p.name || `#${p.id}`,
          }))
        );
      })
      .catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const suggestions = useMemo(() => {
    const q = normSearch(query.trim());
    if (!q) return catalog.slice(0, 12);
    return catalog
      .filter((p) => normSearch(p.name).includes(q) || String(p.id).includes(q))
      .slice(0, 12);
  }, [catalog, query]);

  const trimmed = query.trim();
  const showNewOption = trimmed.length > 0;

  async function addFromCatalog(factoryProductId: number, quantity?: number) {
    setLoading(true);
    setMsg("");
    const res = await fetch(`/api/projects/${projectId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        factoryProductId,
        sortOrder: items.length,
        quantity: quantity ?? parseItemQuantity(qty),
      }),
    });
    setLoading(false);
    if (res.ok) {
      setQuery("");
      setQty("1");
      setOpen(false);
      onChanged();
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg(typeof j.error === "string" ? j.error : "Không thêm được hạng mục");
    }
  }

  async function addNewProduct(name: string, quantity: number) {
    setLoading(true);
    setMsg("");
    const createRes = await fetch("/api/factory/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), sourceProjectId: projectId }),
    });
    const created = await createRes.json();
    if (!createRes.ok) {
      setMsg(typeof created.error === "string" ? created.error : "Không tạo được SP mới");
      setLoading(false);
      return;
    }
    await addFromCatalog(Number(created.id), quantity);
  }

  async function addRows(rows: ParsedProjectItemRow[]) {
    if (!rows.length) return;
    setLoading(true);
    setMsg("");
    const res = await fetch(`/api/projects/${projectId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: rows.map((r) => ({
          name: r.name,
          description: r.description,
          quantity: r.quantity,
          unit: r.unit,
        })),
        baseSortOrder: items.length,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      const skipped = Array.isArray(data.skipped) ? (data.skipped as string[]) : [];
      if (skipped.length) {
        setMsg(
          `Đã thêm ${data.added ?? 0} hàng. Chưa có trong danh mục: ${skipped.slice(0, 3).join(", ")}${skipped.length > 3 ? "…" : ""}`
        );
      } else {
        setQuery("");
        setQty("1");
        setOpen(false);
      }
      onChanged();
    } else {
      setMsg(typeof data.error === "string" ? data.error : "Không thêm được");
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const html = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain");
    const multi =
      plain.includes("\n") || plain.includes("\r") || plain.includes("\t") || html.includes("<tr");
    if (!multi && !plain.includes("\t")) return;

    const rows = parseProjectItemPaste(plain, html || null);
    if (rows.length === 0) return;
    e.preventDefault();
    void addRows(rows);
  }

  async function submitComposer() {
    if (!trimmed) return;
    const quantity = parseItemQuantity(qty);
    const exact = catalog.find((p) => normSearch(p.name) === normSearch(trimmed));
    if (exact) {
      await addFromCatalog(exact.id, quantity);
      return;
    }
    if (suggestions.length === 1 && normSearch(suggestions[0]!.name) === normSearch(trimmed)) {
      await addFromCatalog(suggestions[0]!.id, quantity);
      return;
    }
    await addNewProduct(trimmed, quantity);
  }

  async function deleteItem(id: number) {
    if (!confirm("Xóa hạng mục này?")) return;
    const res = await fetch(`/api/projects/${projectId}/items/${id}`, { method: "DELETE" });
    if (res.ok) onChanged();
  }

  return (
    <div className="space-y-3">
      <div ref={rootRef} className="relative">
        <div className="flex gap-2 items-stretch">
          <input
            ref={inputRef}
            value={query}
            disabled={loading}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setMsg("");
            }}
            onFocus={() => setOpen(true)}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submitComposer();
              }
              if (e.key === "Escape") setOpen(false);
            }}
            className="input-field flex-1 min-w-0"
            placeholder="Tên hạng mục — gõ tìm danh mục, dán nhiều dòng…"
          />
          <input
            value={qty}
            disabled={loading}
            onChange={(e) => setQty(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submitComposer();
              }
            }}
            className="input-field w-16 text-center font-mono shrink-0"
            title="Số lượng"
            inputMode="decimal"
          />
          <button
            type="button"
            disabled={loading || !trimmed}
            onClick={() => void submitComposer()}
            className="shrink-0 inline-flex items-center gap-1 px-3 rounded-lg bg-sky text-white text-xs hover:bg-sky-light disabled:opacity-50"
          >
            <Plus size={14} />
            Thêm
          </button>
        </div>

        {open && (trimmed || suggestions.length > 0) && (
          <div
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-[80] max-h-56 overflow-y-auto rounded-xl border border-white/15 shadow-2xl shadow-black/50 py-1"
            style={{ background: "linear-gradient(180deg, #121d33 0%, #0c1426 100%)" }}
          >
            {suggestions.length > 0 ? (
              <p className="px-3 py-1 text-[10px] text-slate-500 uppercase tracking-wide">
                Danh mục SP
              </p>
            ) : trimmed ? (
              <p className="px-3 py-1.5 text-xs text-slate-500">Không khớp danh mục hiện có</p>
            ) : null}
            {suggestions.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={loading}
                onClick={() => void addFromCatalog(p.id)}
                className="block w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-sky/15 hover:text-white transition-colors disabled:opacity-50"
              >
                {p.name}
              </button>
            ))}
            {showNewOption && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void addNewProduct(trimmed, parseItemQuantity(qty))}
                className="block w-full text-left px-3 py-2 text-xs border-t border-white/10 text-sky-light hover:bg-sky/10 transition-colors disabled:opacity-50"
              >
                + Thêm mới «{trimmed}»
              </button>
            )}
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-500">
        Dán 1 dòng → thêm 1 hạng mục; dán bảng Excel/Sheets → thêm nhiều. Gõ tên để tìm trong danh
        mục hoặc bấm «Thêm mới».
      </p>

      {msg && <p className="text-xs text-amber-300/90">{msg}</p>}

      {items.length > 0 ? (
        <ul className="divide-y divide-white/10 rounded-lg border border-white/10 overflow-hidden">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] hover:bg-white/[0.04]"
            >
              <span className="flex-1 min-w-0 text-sm text-white truncate">{it.name}</span>
              <span className="text-xs text-slate-400 font-mono tabular-nums shrink-0">
                ×{it.quantity}
                {it.unit ? ` ${it.unit}` : ""}
              </span>
              <button
                type="button"
                onClick={() => void deleteItem(it.id)}
                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose/10 shrink-0"
                title="Xóa"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 py-4 text-center border border-dashed border-white/10 rounded-lg">
          Chưa có hạng mục — thêm hoặc dán từ bảng tính.
        </p>
      )}
    </div>
  );
}
