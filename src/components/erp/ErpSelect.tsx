"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const current =
    value === "" || value == null
      ? null
      : options.find((o) => o.value === value) ?? null;

  function positionMenu() {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const menuH = menuRef.current?.offsetHeight ?? 208;
    const gap = 4;
    const spaceBelow = window.innerHeight - r.bottom - gap;
    const spaceAbove = r.top - gap;
    const openBelow = spaceBelow >= menuH || spaceBelow >= spaceAbove;
    let top = openBelow ? r.bottom + gap : r.top - menuH - gap;
    top = Math.max(8, Math.min(top, window.innerHeight - menuH - 8));
    const left = align === "right" ? r.right - r.width : r.left;
    setMenuPos({ top, left, width: r.width });
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !(t as Element).closest?.("[data-erp-select-menu]")) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    positionMenu();
    const id = requestAnimationFrame(() => positionMenu());
    const onReflow = () => positionMenu();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, options.length, align]);

  const menu =
    open &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menuRef}
        data-erp-select-menu
        role="listbox"
        className="fixed z-[200] max-h-52 overflow-y-auto py-1 rounded-xl border border-white/15 shadow-2xl shadow-black/50"
        style={{
          top: menuPos.top,
          left: menuPos.left,
          minWidth: menuPos.width,
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
                active ? "bg-sky/25 text-sky-light" : "text-slate-200 hover:bg-white/8"
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
      </div>,
      document.body
    );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={btnRef}
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
      {menu}
    </div>
  );
}
