"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { Supplier } from "@/lib/suppliers/types";

const FIELD =
  "block w-full rounded-md border border-white/15 bg-[#0f1a2e] px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky/40";

export function SupplierPicker({
  valueId,
  valueName,
  onChange,
  disabled,
  allowQuickAdd = true,
}: {
  valueId: number | null;
  valueName: string;
  onChange: (supplier: Supplier | null) => void;
  disabled?: boolean;
  allowQuickAdd?: boolean;
}) {
  const [query, setQuery] = useState(valueName);
  const [results, setResults] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(valueName);
  }, [valueName, valueId]);

  const load = useCallback(async (q: string) => {
    const res = await fetch(`/api/suppliers?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const j = await res.json();
      setResults(Array.isArray(j.items) ? (j.items as Supplier[]) : []);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(query), 250);
    return () => clearTimeout(t);
  }, [query, load]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function quickAdd() {
    const name = query.trim();
    if (!name) return;
    setAdding(true);
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setAdding(false);
    if (res.ok) {
      const j = await res.json();
      const supplier = j.supplier as Supplier;
      onChange(supplier);
      setQuery(supplier.name);
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="space-y-1">
      <input
        className={FIELD}
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value.trim()) onChange(null);
        }}
        onFocus={() => {
          setOpen(true);
          void load(query);
        }}
        placeholder="Chọn hoặc thêm NCC…"
      />
      {open && (
        <div className="relative z-40">
          <div className="absolute left-0 right-0 mt-0.5 max-h-40 overflow-y-auto rounded-lg border border-white/15 bg-[#0c1528] shadow-xl">
            {results.map((s) => (
              <button
                key={s.id}
                type="button"
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
                onClick={() => {
                  onChange(s);
                  setQuery(s.name);
                  setOpen(false);
                }}
              >
                {s.name}
              </button>
            ))}
            {allowQuickAdd && query.trim() && !results.some((s) => s.name.toLowerCase() === query.trim().toLowerCase()) ? (
              <button
                type="button"
                disabled={adding}
                onClick={() => void quickAdd()}
                className="w-full text-left px-3 py-2 text-xs text-sky hover:bg-white/10 flex items-center gap-1 border-t border-white/10"
              >
                <Plus size={12} />
                Thêm «{query.trim()}»
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
