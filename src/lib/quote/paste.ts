import { createColumn, createRow, syncRowsWithColumns } from "./defaults";
import type { QuoteColumn, QuoteRow } from "./types";

/** Phân tích dữ liệu dán từ Excel / Google Sheets (tab hoặc xuống dòng). */
export function parseClipboardMatrix(text: string): string[][] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nonEmpty = lines.filter((line, i) => line.length > 0 || i < lines.length - 1);
  if (nonEmpty.length === 0) return [];

  const hasTab = nonEmpty.some((line) => line.includes("\t"));

  return nonEmpty.map((line) => {
    if (hasTab) return line.split("\t");
    if (line.includes(";")) return line.split(";");
    return [line];
  });
}

export function applyPasteToGrid(
  columns: QuoteColumn[],
  rows: QuoteRow[],
  startRow: number,
  startCol: number,
  matrix: string[][]
): { columns: QuoteColumn[]; rows: QuoteRow[] } {
  if (matrix.length === 0) return { columns, rows };

  const nextColumns = [...columns];
  let nextRows = rows.map((r) => ({ ...r, cells: { ...r.cells } }));

  const maxCols = Math.max(...matrix.map((r) => r.length));
  const targetColCount = startCol + maxCols;
  while (nextColumns.length < targetColCount) {
    nextColumns.push(createColumn(`Cột ${nextColumns.length + 1}`));
  }

  const targetRowCount = startRow + matrix.length;
  while (nextRows.length < targetRowCount) {
    nextRows.push(createRow(nextColumns));
  }

  nextRows = syncRowsWithColumns(nextRows, nextColumns);

  for (let ri = 0; ri < matrix.length; ri++) {
    for (let ci = 0; ci < matrix[ri].length; ci++) {
      const col = nextColumns[startCol + ci];
      if (!col || col.role === "lineTotal" || col.role === "index" || col.role === "vat") continue;
      nextRows[startRow + ri].cells[col.id] = matrix[ri][ci]?.trim() ?? "";
    }
  }

  return { columns: nextColumns, rows: nextRows };
}
