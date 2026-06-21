export const DEFAULT_PRIMARY = "#1e5a9e";

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return [30, 90, 158];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function lightenRgb(rgb: [number, number, number], amount = 0.88): [number, number, number] {
  return rgb.map((c) => Math.round(c + (255 - c) * amount)) as [number, number, number];
}

export function normalizePrimary(hex?: string): string {
  if (!hex || !/^#[0-9a-fA-F]{3,8}$/.test(hex)) return DEFAULT_PRIMARY;
  return hex.length === 4 || hex.length === 7 ? hex : DEFAULT_PRIMARY;
}

export function primaryCssVars(hex: string) {
  const rgb = hexToRgb(hex);
  const light = lightenRgb(rgb, 0.92);
  const soft = lightenRgb(rgb, 0.85);
  return {
    "--quote-primary": hex,
    "--quote-primary-rgb": rgb.join(", "),
    "--quote-primary-light": `rgb(${light.join(", ")})`,
    "--quote-primary-soft": `rgb(${soft.join(", ")})`,
  } as Record<string, string>;
}
