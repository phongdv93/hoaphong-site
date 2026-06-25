/** Khổ giấy A4 và lề in — đồng bộ preview web + PDF. */
export type QuotePageOrientation = "portrait" | "landscape";

/** Lề chuẩn (mm) — tương đương Word “Normal” ~1.5–2 cm */
export const PAGE_MARGIN_MM = {
  top: 12,
  right: 15,
  bottom: 14,
  left: 15,
} as const;

export const A4_PORTRAIT_MM = { width: 210, height: 297 } as const;
export const A4_LANDSCAPE_MM = { width: 297, height: 210 } as const;

export function normalizePageOrientation(
  value: string | undefined | null
): QuotePageOrientation {
  return value === "landscape" ? "landscape" : "portrait";
}

export function a4SizeMm(orientation: QuotePageOrientation) {
  return orientation === "landscape" ? A4_LANDSCAPE_MM : A4_PORTRAIT_MM;
}

export function pageMarginCss() {
  const m = PAGE_MARGIN_MM;
  return `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`;
}

export function contentAreaMm(orientation: QuotePageOrientation) {
  const size = a4SizeMm(orientation);
  const m = PAGE_MARGIN_MM;
  return {
    width: size.width - m.left - m.right,
    height: size.height - m.top - m.bottom,
  };
}
