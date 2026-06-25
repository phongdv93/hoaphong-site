"use client";

import type { ReactNode } from "react";
import {
  a4SizeMm,
  normalizePageOrientation,
  PAGE_MARGIN_MM,
  type QuotePageOrientation,
} from "@/lib/quote/page-spec";

/** Khung xem trước đúng tỉ lệ A4 + vùng lề in. */
export function A4PreviewFrame({
  orientation,
  children,
}: {
  orientation: QuotePageOrientation;
  children: ReactNode;
}) {
  const o = normalizePageOrientation(orientation);
  const size = a4SizeMm(o);
  const landscape = o === "landscape";
  const label = landscape ? "A4 ngang" : "A4 dọc";
  const marginLabel = `Lề ${PAGE_MARGIN_MM.top}–${PAGE_MARGIN_MM.left} mm`;

  return (
    <div className="quote-a4-viewport w-full flex flex-col items-center">
      <div className="flex flex-wrap items-center justify-center gap-2 mb-3 text-[10px] text-slate-400">
        <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-medium">{label}</span>
        <span>{size.width} × {size.height} mm</span>
        <span className="text-slate-500">·</span>
        <span>{marginLabel}</span>
      </div>
      <div
        className={`quote-a4-page ${landscape ? "quote-a4-page--landscape" : ""}`}
        style={{
          width: `${size.width}mm`,
          minHeight: `${size.height}mm`,
        }}
      >
        <div
          className="quote-a4-margins"
          style={{
            padding: `${PAGE_MARGIN_MM.top}mm ${PAGE_MARGIN_MM.right}mm ${PAGE_MARGIN_MM.bottom}mm ${PAGE_MARGIN_MM.left}mm`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
