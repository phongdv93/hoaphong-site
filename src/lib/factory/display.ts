import type { FactoryProduct } from "@/lib/factory/types";

export const DEFAULT_PRODUCT_ORIGIN = "Việt Nam";

export function formatProductPrimaryCode(
  p: Pick<FactoryProduct, "rangeCode" | "woodCode" | "paintCode" | "customerBranchCode">
): string {
  const parts = [p.rangeCode, p.woodCode, p.paintCode, p.customerBranchCode].filter((x) => x?.trim());
  return parts.join(" · ") || "—";
}

export function formatDimensionsMm(lengthMm: number, depthMm: number, heightMm: number): string {
  if (!lengthMm && !depthMm && !heightMm) return "—";
  return `${lengthMm || 0} × ${depthMm || 0} × ${heightMm || 0} mm`;
}

export function shortDescription(text: string, max = 72): string {
  const t = (text ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "—";
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
}
