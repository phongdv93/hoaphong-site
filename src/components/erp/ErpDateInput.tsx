"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const calendarRef = useRef<HTMLDivElement>(null);
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

  function positionCalendar() {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const w = 252;
    const left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8));
    const calH = calendarRef.current?.offsetHeight ?? 300;
    const gap = 4;
    const spaceBelow = window.innerHeight - r.bottom - gap;
    const spaceAbove = r.top - gap;
    const openBelow = spaceBelow >= calH || spaceBelow >= spaceAbove;
    let top = openBelow ? r.bottom + gap : r.top - calH - gap;
    top = Math.max(8, Math.min(top, window.innerHeight - calH - 8));
    setMenuPos({ top, left });
  }

  function openCalendar() {
    setOpen(true);
  }

  useLayoutEffect(() => {
    if (!open) return;
    positionCalendar();
    const id = requestAnimationFrame(() => positionCalendar());
    const onReflow = () => positionCalendar();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, value]);

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
    <div
      ref={rootRef}
      className={`relative flex items-stretch min-w-0 w-full min-h-[2.5rem] rounded-lg border border-white/15 bg-white/5 focus-within:ring-2 focus-within:ring-sky/30 focus-within:border-sky ${
        invalid ? "!border-rose-500/60" : ""
      } ${disabled ? "opacity-50" : ""} ${className}`}
    >
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
        className="flex-1 min-w-0 h-full border-0 bg-transparent px-3 py-2 text-inherit text-white placeholder:text-slate-muted/60 focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
      />
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && (open ? setOpen(false) : openCalendar())}
        className={`shrink-0 self-stretch flex items-center justify-center px-2 border-0 bg-transparent transition-colors disabled:cursor-not-allowed ${
          open ? "text-sky-light" : "text-slate-400 hover:text-slate-200"
        }`}
        aria-label="Mở lịch chọn ngày"
        aria-expanded={open}
      >
        <Calendar size={14} className="shrink-0" />
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={calendarRef}
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
