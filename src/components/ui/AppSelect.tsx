"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target as Node)) return;
      setOpen(false);
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
  }, []);

  return (
    <div className="app-select relative" ref={rootRef}>
      <button
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
      {open && !disabled && (
        <div className={menuClass} role="listbox">
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
        </div>
      )}
    </div>
  );
}
