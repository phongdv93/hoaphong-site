import type { WoodBoard } from "./types";

/** Kích thước khung kiện chuẩn (mm) */
export const BUNDLE_WIDTH_MM = 1800;
export const BUNDLE_HEIGHT_MM = 1400;
export const BUNDLE_LENGTH_MM = 3200;
export const BOARD_THICKNESS_INCH_MM = 25.4;
export const BOARD_GAP_MM = 28;

export interface LayoutInput {
  widthMm: number;
  thicknessMm: number;
  lengthMm: number;
}

export interface LayoutResult extends LayoutInput {
  posX: number;
  posY: number;
  posZ: number;
}

/**
 * Xếp thanh trong khung 1800 × 1400 × 3200 (rộng × cao × dài).
 * - Dài theo Z (mặt đầu gỗ ở hai đầu Z)
 * - Rộng theo X, chồng dày theo Y
 * - Khe hở BOARD_GAP_MM giữa các thanh
 */
export function computeBundleLayout(
  boards: LayoutInput[],
  bundleLengthMm: number = BUNDLE_LENGTH_MM,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    gapMm?: number;
  }
): LayoutResult[] {
  const maxW = options?.maxWidth ?? BUNDLE_WIDTH_MM;
  const maxH = options?.maxHeight ?? BUNDLE_HEIGHT_MM;
  const gap = options?.gapMm ?? BOARD_GAP_MM;

  const sorted = [...boards].sort((a, b) => b.widthMm - a.widthMm);
  const results: LayoutResult[] = [];
  let x = gap;
  let y = gap;
  let rowThickness = 0;

  for (const board of sorted) {
    const thick = board.thicknessMm || BOARD_THICKNESS_INCH_MM;
    const len = board.lengthMm || bundleLengthMm;
    const w = board.widthMm;

    if (x + w + gap > maxW) {
      x = gap;
      y += rowThickness + gap;
      rowThickness = 0;
    }

    if (y + thick + gap > maxH) {
      console.warn("Vượt chiều cao kiện — một số thanh có thể chồng sát trần khung");
    }

    results.push({
      widthMm: w,
      thicknessMm: thick,
      lengthMm: len,
      posX: x + w / 2,
      posY: y + thick / 2,
      posZ: len / 2,
    });

    x += w + gap;
    rowThickness = Math.max(rowThickness, thick);
  }

  return results;
}

export function bundleDimensions(_boards?: WoodBoard[]) {
  return {
    width: BUNDLE_WIDTH_MM,
    height: BUNDLE_HEIGHT_MM,
    depth: BUNDLE_LENGTH_MM,
  };
}

/** Sinh danh sách rộng đa dạng cho demo / nhập nhanh */
export function generateVariedBoardWidths(count = 48): { widthMm: number; quantity: number }[] {
  const base = [42, 48, 55, 62, 68, 75, 82, 88, 95, 102, 108, 115, 122, 128, 135, 142, 148, 155, 162, 168, 175, 182];
  const rows: { widthMm: number; quantity: number }[] = [];
  let i = 0;
  while (rows.length < count) {
    const w = base[i % base.length] + (i % 3) * 2;
    rows.push({ widthMm: w, quantity: 1 + (i % 2) });
    i++;
  }
  return rows;
}
