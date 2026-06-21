/** Tính thể tích thanh gỗ (mm → m³) */
export function boardVolumeM3(lengthMm: number, widthMm: number, thicknessMm: number): number {
  return (lengthMm * widthMm * thicknessMm) / 1e9;
}

export function formatM3(v: number, digits = 4): string {
  return `${v.toFixed(digits)} m³`;
}

export function formatMm(mm: number): string {
  if (mm >= 1000) return `${(mm / 1000).toFixed(2)} m`;
  return `${mm} mm`;
}
