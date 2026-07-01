"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import {
  formatDimensionsMm,
  formatProductPrimaryCode,
  shortDescription,
} from "@/lib/factory/display";
import type { FactoryProduct } from "@/lib/factory/types";

export function ProductSearchPicker({
  onPick,
  disabled,
  supplierId,
  placeholder = "Tìm SP: tên, mô tả, NCC, hãng, xuất xứ, nguyên liệu…",
}: {
  onPick: (product: FactoryProduct) => void;
  disabled?: boolean;
  supplierId?: number | null;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FactoryProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const qs = new URLSearchParams({ q: trimmed, limit: "25" });
      if (supplierId != null) qs.set("supplierId", String(supplierId));
      const res = await fetch(`/api/factory/products/search?${qs}`);
      if (res.ok) {
        const j = await res.json();
        setResults(Array.isArray(j.items) ? (j.items as FactoryProduct[]) : []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(query);
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch, supplierId]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="search"
          disabled={disabled}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="block w-full rounded-md border border-white/15 bg-[#0f1a2e] pl-8 pr-2 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky/40 disabled:opacity-50"
        />
      </div>

      {open && (query.trim() || supplierId != null) ? (
        <div className="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg border border-white/15 bg-[#0c1528] shadow-xl">
          {loading ? (
            <p className="px-3 py-2 text-[11px] text-slate-500">Đang tìm…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-slate-500">Không có kết quả.</p>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onPick(p);
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-white/10 border-b border-white/5 last:border-0 disabled:opacity-50"
              >
                <div className="text-xs font-medium text-slate-100 truncate">{p.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap gap-x-2">
                  {p.brand ? <span>{p.brand}</span> : null}
                  {p.origin ? <span>· {p.origin}</span> : null}
                  {p.supplier ? <span>· {p.supplier}</span> : null}
                  {formatProductPrimaryCode(p) ? <span className="font-mono">· {formatProductPrimaryCode(p)}</span> : null}
                </div>
                {p.description ? (
                  <div className="text-[10px] text-slate-600 mt-0.5 line-clamp-1">
                    {shortDescription(p.description, 72)}
                  </div>
                ) : null}
                {p.lengthMm || p.depthMm || p.heightMm ? (
                  <div className="text-[10px] text-slate-600">
                    {formatDimensionsMm(p.lengthMm, p.depthMm, p.heightMm)}
                  </div>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
