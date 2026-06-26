"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar } from "lucide-react";
import { ErpDateCalendar } from "@/components/erp/ErpDateCalendar";
import { isoToVnDate, toLocalDateString, vnDateToIso } from "@/lib/dates";

type Props = {
  /** ISO yyyy-mm-dd hoặc rỗng */
  value: string;
  onChange: (iso: string) => void;
  /** Gọi sau khi người dùng xác nhận (blur / chọn lịch) */
  onCommit?: (iso: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

/** Ô ngày dd/mm/yyyy + lịch tiếng Việt (giao diện tối). */
export function ErpDateInput({
  value,
  onChange,
  onCommit,
  min,
  max,
  disabled,
  className = "",
  placeholder = "dd/mm/yyyy",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [text, setText] = useState(() => isoToVnDate(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText(isoToVnDate(value));
    setInvalid(false);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !(t as Element).closest?.("[data-erp-date-calendar]")) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function openCalendar() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const w = 252;
      const left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8));
      setMenuPos({ top: r.bottom + 4, left });
    }
    setOpen(true);
  }

  function emit(iso: string, commit: boolean) {
    const norm = toLocalDateString(iso) ?? "";
    onChange(norm);
    if (commit) onCommit?.(norm);
  }

  function commitText(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setInvalid(false);
      emit("", true);
      return;
    }
    const iso = vnDateToIso(trimmed);
    if (!iso) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setText(isoToVnDate(iso));
    if (iso !== (toLocalDateString(value) ?? "")) emit(iso, true);
  }

  const iso = toLocalDateString(value) ?? "";

  return (
    <div ref={rootRef} className="relative flex items-center gap-0.5 min-w-0 w-full">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          setInvalid(false);
        }}
        onBlur={(e) => commitText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitText(text);
            (e.target as HTMLInputElement).blur();
          }
        }}
        className={`flex-1 min-w-0 input-field ${className} ${invalid ? "!border-rose-500/60" : ""}`}
      />
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && (open ? setOpen(false) : openCalendar())}
        className={`relative shrink-0 w-7 h-7 flex items-center justify-center rounded-md border transition-colors ${
          open
            ? "bg-sky/20 border-sky/50 text-sky-light"
            : "bg-white/5 border-white/15 text-slate-400 hover:bg-white/10 hover:text-slate-200"
        }`}
        aria-label="Mở lịch chọn ngày"
        aria-expanded={open}
      >
        <Calendar size={14} />
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-erp-date-calendar
            className="fixed z-[200]"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <ErpDateCalendar
              value={iso}
              min={min}
              max={max}
              onSelect={(v) => {
                setText(isoToVnDate(v));
                setInvalid(false);
                emit(v, true);
                setOpen(false);
              }}
              onClose={() => setOpen(false)}
            />
          </div>,
          document.body
        )}
    </div>
  );
}
