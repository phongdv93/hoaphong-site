import type { CellAnchor, ColumnRole } from "./types";

export type CellRange = {
  start: CellAnchor;
  end: CellAnchor;
};

export function normalizeCellRange(range: CellRange) {
  return {
    rowMin: Math.min(range.start.rowIndex, range.end.rowIndex),
    rowMax: Math.max(range.start.rowIndex, range.end.rowIndex),
    colMin: Math.min(range.start.colIndex, range.end.colIndex),
    colMax: Math.max(range.start.colIndex, range.end.colIndex),
  };
}

export function isCellInRange(rowIndex: number, colIndex: number, range: CellRange): boolean {
  const { rowMin, rowMax, colMin, colMax } = normalizeCellRange(range);
  return rowIndex >= rowMin && rowIndex <= rowMax && colIndex >= colMin && colIndex <= colMax;
}

export function isSingleCellRange(range: CellRange): boolean {
  const { rowMin, rowMax, colMin, colMax } = normalizeCellRange(range);
  return rowMin === rowMax && colMin === colMax;
}

export function pasteAnchorFromRange(range: CellRange): CellAnchor {
  const { rowMin, colMin } = normalizeCellRange(range);
  return { rowIndex: rowMin, colIndex: colMin };
}

export function isColumnEditable(role?: ColumnRole): boolean {
  return role !== "index" && role !== "lineTotal" && role !== "vat";
}

export function countEditableCellsInRange(
  range: CellRange,
  columnCount: number,
  roleAt: (colIndex: number) => ColumnRole | undefined
): number {
  const { rowMin, rowMax, colMin, colMax } = normalizeCellRange(range);
  let cols = 0;
  for (let ci = colMin; ci <= colMax && ci < columnCount; ci++) {
    if (isColumnEditable(roleAt(ci))) cols++;
  }
  return cols * (rowMax - rowMin + 1);
}

export function selectedRowCount(range: CellRange): number {
  const { rowMin, rowMax } = normalizeCellRange(range);
  return rowMax - rowMin + 1;
}
