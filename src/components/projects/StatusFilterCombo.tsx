"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import type { ProjectStatus } from "@/lib/projects/types";

const OPTIONS: { id: ProjectStatus | "all"; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "open", label: "Mới mở" },
  { id: "in_progress", label: "Đang thi công" },
  { id: "on_hold", label: "Tạm dừng" },
  { id: "done", label: "Hoàn thành" },
  { id: "cancelled", label: "Đã hủy" },
];

export function StatusFilterCombo({
  value,
  onChange,
}: {
  value: ProjectStatus | "all";
  onChange: (v: ProjectStatus | "all") => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = OPTIONS.find((o) => o.id === value) ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 h-[30px] pl-2.5 pr-2 rounded-lg border text-xs transition-colors ${
          open
            ? "bg-sky/15 border-sky/50 text-white"
            : "bg-white/5 border-white/15 text-slate-200 hover:bg-white/10 hover:border-white/25"
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <SlidersHorizontal size={14} className="text-sky-light shrink-0" />
        <span className="font-medium">{current.label}</span>
        <ChevronDown
          size={14}
          className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-[60] min-w-[200px] py-1.5 rounded-xl border border-white/15 shadow-2xl shadow-black/50 overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #121d33 0%, #0c1426 100%)",
          }}
        >
          {OPTIONS.map((opt) => {
            const active = opt.id === value;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  active
                    ? "bg-sky/25 text-sky-light"
                    : "text-slate-200 hover:bg-white/8"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    active ? "bg-sky-light" : "bg-transparent"
                  }`}
                />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
