"use client";

import { useId, useState } from "react";
import { Maximize2, X } from "lucide-react";

export function ExpandableTextarea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
  previewChars = 120,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  previewChars?: number;
  className?: string;
}) {
  const id = useId();
  const [fullOpen, setFullOpen] = useState(false);
  const trimmed = value.trim();
  const showPreview = trimmed.length > previewChars && !fullOpen;

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <label htmlFor={id} className="block font-medium text-slate-400 text-xs">
          {label}
        </label>
        {trimmed ? (
          <button
            type="button"
            onClick={() => setFullOpen(true)}
            className="inline-flex items-center gap-1 text-[10px] text-sky/90 hover:text-sky shrink-0"
            title="Mở toàn màn hình"
          >
            <Maximize2 size={11} />
            Mở rộng
          </button>
        ) : null}
      </div>
      <textarea
        id={id}
        className="input-field py-2 text-sm min-h-0 resize-y w-full leading-relaxed"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
      />
      {showPreview ? (
        <button
          type="button"
          onClick={() => setFullOpen(true)}
          className="mt-1 w-full text-left text-[11px] text-slate-500 hover:text-slate-300 line-clamp-2"
        >
          {trimmed.slice(0, previewChars).replace(/\s+/g, " ")}…{" "}
          <span className="text-sky/90">xem đầy đủ</span>
        </button>
      ) : null}

      {fullOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70"
          onClick={() => setFullOpen(false)}
        >
          <div
            className="erp-card w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">{label}</h3>
              <button
                type="button"
                onClick={() => setFullOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex-1 min-h-0">
              <textarea
                className="input-field w-full h-full min-h-[50vh] text-sm leading-relaxed resize-none"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoFocus
              />
            </div>
            <div className="px-4 py-3 border-t border-white/10 flex justify-end">
              <button type="button" className="btn-primary text-sm py-1.5 px-4" onClick={() => setFullOpen(false)}>
                Xong
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
