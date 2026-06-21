import type { BoardInput } from "./types";
import type { WoodBoard } from "./types";

export interface BoardGridLayout {
  columnWidths: number[];
  /** Số thanh mỗi ô [hàng][cột] — hàng = lớp xếp trong kiện */
  rows: number[][];
}

const GRID_PREFIX = "__GRID__";

export function gridToBoardInputs(
  grid: BoardGridLayout,
  thicknessMm: number,
  lengthMm: number
): BoardInput[] {
  const boards: BoardInput[] = [];
  for (let r = 0; r < grid.rows.length; r++) {
    const row = grid.rows[r];
    for (let c = 0; c < grid.columnWidths.length; c++) {
      const qty = row[c] ?? 0;
      const w = grid.columnWidths[c];
      if (qty > 0 && w > 0) {
        boards.push({ widthMm: w, quantity: qty, thicknessMm, lengthMm });
      }
    }
  }
  return boards;
}

export function parseGridFromNotes(notes: string): BoardGridLayout | null {
  const line = notes.split("\n").find((l) => l.startsWith(GRID_PREFIX));
  if (!line) return null;
  try {
    return JSON.parse(line.slice(GRID_PREFIX.length)) as BoardGridLayout;
  } catch {
    return null;
  }
}

export function encodeGridInNotes(grid: BoardGridLayout, userNotes = ""): string {
  const payload = `${GRID_PREFIX}${JSON.stringify(grid)}`;
  return userNotes.trim() ? `${payload}\n${userNotes.trim()}` : payload;
}

/** Gom thanh theo lớp (posY) để hiển thị lưới khi không lưu grid */
export function boardsToDisplayGrid(boards: WoodBoard[]): BoardGridLayout {
  if (!boards.length) {
    return { columnWidths: [120], rows: [[0]] };
  }
  const layers = new Map<number, WoodBoard[]>();
  for (const b of boards) {
    const key = Math.round(b.posY * 10) / 10;
    if (!layers.has(key)) layers.set(key, []);
    layers.get(key)!.push(b);
  }
  const sortedLayers = [...layers.entries()].sort((a, b) => a[0] - b[0]);
  const widthSet = new Set<number>();
  for (const b of boards) widthSet.add(b.widthMm);
  const columnWidths = [...widthSet].sort((a, b) => b - a);
  const rows: number[][] = sortedLayers.map(([, layerBoards]) => {
    const row = columnWidths.map(() => 0);
    for (const b of layerBoards) {
      const c = columnWidths.indexOf(b.widthMm);
      if (c >= 0) row[c] += 1;
    }
    return row;
  });
  return { columnWidths, rows };
}

export function emptyGrid(cols = 4, rowCount = 3): BoardGridLayout {
  return {
    columnWidths: Array.from({ length: cols }, (_, i) => 80 + i * 20),
    rows: Array.from({ length: rowCount }, () => Array(cols).fill(0)),
  };
}
