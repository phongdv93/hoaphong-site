"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isoToVnDate, toLocalDateString } from "@/lib/dates";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

function monthMatrix(year: number, month: number): Array<string | null> {
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<string | null> = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const m = String(month + 1).padStart(2, "0");
    const day = String(d).padStart(2, "0");
    cells.push(`${year}-${m}-${day}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function ErpDateCalendar({
  value,
  onSelect,
  min,
  max,
  onClose,
}: {
  value: string;
  onSelect: (iso: string) => void;
  min?: string;
  max?: string;
  onClose?: () => void;
}) {
  const selected = toLocalDateString(value) ?? "";
  const initial = selected ? new Date(`${selected}T12:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const rootRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const cells = useMemo(
    () => monthMatrix(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t)) onClose?.();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  function prevMonth() {
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function nextMonth() {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function disabled(iso: string) {
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  }

  return (
    <div
      ref={rootRef}
      className="z-[90] w-[252px] rounded-xl border border-white/15 shadow-2xl shadow-black/60 p-2"
      style={{
        background: "linear-gradient(180deg, #121d33 0%, #0c1426 100%)",
      }}
      role="dialog"
      aria-label="Chọn ngày"
    >
      <div className="flex items-center justify-between gap-1 mb-2 px-0.5">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 rounded-md hover:bg-white/10 text-slate-300"
          aria-label="Tháng trước"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-semibold text-white tabular-nums">
          Tháng {viewMonth + 1}/{viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 rounded-md hover:bg-white/10 text-slate-300"
          aria-label="Tháng sau"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-[10px] text-center text-slate-500 font-medium py-0.5"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((iso, i) => {
          if (!iso) {
            return <div key={`e-${i}`} className="h-8" />;
          }
          const isToday = iso === today;
          const isSelected = iso === selected;
          const off = disabled(iso);
          return (
            <button
              key={iso}
              type="button"
              disabled={off}
              title={isoToVnDate(iso)}
              onClick={() => {
                onSelect(iso);
                onClose?.();
              }}
              className={`h-8 rounded-md text-xs tabular-nums transition-colors ${
                off
                  ? "text-slate-600 cursor-not-allowed"
                  : isSelected
                    ? "bg-sky text-white font-semibold"
                    : isToday
                      ? "bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/40 hover:bg-rose-500/30"
                      : "text-slate-200 hover:bg-white/10"
              }`}
            >
              {Number(iso.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
