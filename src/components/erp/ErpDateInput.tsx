"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
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

/**
 * Ô ngày dd/mm/yyyy — lịch native phủ lên nút calendar (đổi tháng không đóng picker).
 */
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
  const nativeRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => isoToVnDate(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText(isoToVnDate(value));
    setInvalid(false);
  }, [value]);

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
    <div className="flex items-center gap-0.5 min-w-0 w-full">
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
      <div className="relative shrink-0 w-5 h-5 flex items-center justify-center">
        <Calendar size={13} className="text-slate-400 pointer-events-none" />
        <input
          ref={nativeRef}
          type="date"
          tabIndex={-1}
          disabled={disabled}
          aria-label="Chọn ngày"
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          value={iso}
          min={min}
          max={max}
          onChange={(e) => {
            const v = e.target.value;
            setText(isoToVnDate(v));
            setInvalid(false);
            emit(v, true);
          }}
        />
      </div>
    </div>
  );
}
