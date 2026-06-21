"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type ErpSelectOption<T extends string | number> = {
  value: T;
  label: string;
};

export function ErpSelect<T extends string | number>({
  value,
  options,
  onChange,
  placeholder = "Chọn…",
  disabled,
  className = "",
  buttonClassName = "",
  align = "left",
}: {
  value: T | "" | null;
  options: ErpSelectOption<T>[];
  onChange: (v: T | "") => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current =
    value === "" || value == null
      ? null
      : options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 w-full min-w-0 h-[30px] pl-2 pr-1.5 rounded-lg border text-xs transition-colors disabled:opacity-50 ${
          open
            ? "bg-sky/15 border-sky/50 text-white"
            : "bg-white/5 border-white/15 text-slate-200 hover:bg-white/10 hover:border-white/25"
        } ${buttonClassName}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate flex-1 text-left font-medium">
          {current?.label ?? placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          role="listbox"
          className={`absolute top-[calc(100%+4px)] z-[80] min-w-full max-h-52 overflow-y-auto py-1 rounded-xl border border-white/15 shadow-2xl shadow-black/50 ${
            align === "right" ? "right-0" : "left-0"
          }`}
          style={{
            background: "linear-gradient(180deg, #121d33 0%, #0c1426 100%)",
          }}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center gap-2 transition-colors ${
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
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
