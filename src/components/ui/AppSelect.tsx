"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export interface AppSelectOption {
  value: string;
  label: string;
}

export function AppSelect({
  value,
  options,
  onChange,
  disabled,
  placeholder,
  className,
  menuClassName,
  variant = "dark",
  size = "md",
}: {
  value: string;
  options: AppSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  /** dark = ERP sidebar/forms; light = admin/marketing trên nền trắng */
  variant?: "dark" | "light";
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  const triggerClass = [
    "app-select-trigger",
    variant === "light" ? "app-select-trigger-light" : "",
    size === "sm" ? "app-select-trigger-sm" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const menuClass = [
    "app-select-menu",
    variant === "light" ? "app-select-menu-light" : "",
    menuClassName ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  function positionMenu() {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const menuH = menuRef.current?.offsetHeight ?? 256;
    const gap = 6;
    const spaceBelow = window.innerHeight - r.bottom - gap;
    const spaceAbove = r.top - gap;
    const openBelow = spaceBelow >= menuH || spaceBelow >= spaceAbove;
    let top = openBelow ? r.bottom + gap : r.top - menuH - gap;
    top = Math.max(8, Math.min(top, window.innerHeight - menuH - 8));
    setMenuPos({ top, left: r.left, width: r.width });
  }

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !(t as Element).closest?.("[data-app-select-menu]")) {
        setOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || disabled) return;
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
  }, [open, disabled, options.length]);

  const menu =
    open &&
    !disabled &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menuRef}
        data-app-select-menu
        className={`${menuClass} fixed z-[200]`}
        style={{
          top: menuPos.top,
          left: menuPos.left,
          minWidth: Math.max(menuPos.width, 160),
        }}
        role="listbox"
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value || "__empty__"}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`app-select-option ${
                active ? "app-select-option-active" : ""
              } ${variant === "light" ? "app-select-option-light" : ""}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>,
      document.body
    );

  return (
    <div className="app-select relative" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate flex-1 min-w-0">
          {selected?.label ?? placeholder ?? "Chọn..."}
        </span>
        <ChevronDown
          size={size === "sm" ? 12 : 14}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {menu}
    </div>
  );
}
