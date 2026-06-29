import { createColumn, createRow, syncRowsWithColumns } from "./defaults";
import { guessColumnRole } from "./calc";
import type { ColumnRole, QuoteColumn, QuoteRow } from "./types";

/** Vai trò cột khi dán từ bảng dự thầu / Excel */
type PasteColumnRole = ColumnRole | "name" | "spec" | "skip";

function normalizeHeader(label: string): string {
  return label
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

/** Nhận diện header cột Excel (dự thầu, báo giá nội bộ…) */
export function inferPasteColumnRole(label: string): PasteColumnRole {
  const n = normalizeHeader(label);
  if (!n) return "skip";
  if (/^(stt|#|no\.?)$/.test(n)) return "index";
  if (/thanh tien du thau|gia thau|du thau/.test(n)) return "skip";
  if (/^200%|^\d+\s*%$/.test(n)) return "skip";
  if (/thong so|ky thuat|spec\b|mo ta chi tiet/.test(n)) return "spec";
  if (/danh muc|ten hang|hang hoa|category|mat hang|noi dung hang/.test(n)) return "name";
  if (/khoi luong|^kl\b/.test(n)) return "quantity";
  const base = guessColumnRole(label);
  if (base !== "custom") return base;
  if (/don vi|dvt|dvtinh/.test(n)) return "unit";
  return "custom";
}

export function isPasteHeaderRow(row: string[]): boolean {
  if (!row.length) return false;
  let hits = 0;
  for (const cell of row) {
    const role = inferPasteColumnRole(cell);
    if (role !== "custom" && role !== "skip") hits++;
  }
  return hits >= 2;
}

/**
 * Phân tích clipboard Excel/Sheets — hỗ trợ ô có xuống dòng trong dấu ngoặc kép.
 */
export function parseClipboardMatrix(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === "\t") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim().length > 0)) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim().length > 0)) rows.push(row);
  return rows;
}

function findOrCreateTargetColumn(
  columns: QuoteColumn[],
  role: PasteColumnRole
): QuoteColumn | null {
  if (role === "skip" || role === "index" || role === "lineTotal" || role === "vat") {
    return null;
  }

  if (role === "name") {
    const hit = columns.find(
      (c) =>
        c.role === "description" ||
        /ten hang|danh muc|hang hoa|noi dung/i.test(c.label)
    );
    if (hit) return hit;
    return createColumn("Tên hàng / danh mục", "description");
  }

  if (role === "spec") {
    const hit = columns.find((c) => /thong so|ky thuat|mo ta/i.test(normalizeHeader(c.label)));
    if (hit) return hit;
    return createColumn("Thông số kỹ thuật", "custom");
  }

  const byRole = columns.find((c) => c.role === role);
  if (byRole) return byRole;

  const labels: Partial<Record<ColumnRole, string>> = {
    description: "Nội dung / mô tả",
    unit: "ĐVT",
    quantity: "SL",
    unitPrice: "Đơn giá",
    custom: "Ghi chú",
  };
  if (role in labels) return createColumn(labels[role as ColumnRole]!, role as ColumnRole);
  return null;
}

function ensureColumnsForMappings(
  columns: QuoteColumn[],
  mappings: Array<{ src: number; role: PasteColumnRole }>
): QuoteColumn[] {
  const next = [...columns];
  const rolesNeeded = new Set(mappings.map((m) => m.role).filter((r) => r !== "skip"));

  for (const role of rolesNeeded) {
    if (findOrCreateTargetColumn(next, role)) continue;
    const col = findOrCreateTargetColumn([], role);
    if (!col) continue;
    if (role === "spec") {
      const lineIdx = next.findIndex((c) => c.role === "lineTotal");
      if (lineIdx >= 0) next.splice(lineIdx, 0, col);
      else next.push(col);
    } else {
      next.push(col);
    }
  }
  return next;
}

function applyMappedPaste(
  columns: QuoteColumn[],
  rows: QuoteRow[],
  startRow: number,
  mappings: Array<{ src: number; role: PasteColumnRole }>,
  matrix: string[][]
): { columns: QuoteColumn[]; rows: QuoteRow[] } {
  const nextColumns = ensureColumnsForMappings(columns, mappings);
  const resolveTarget = (role: PasteColumnRole): QuoteColumn | null =>
    findOrCreateTargetColumn(nextColumns, role);

  let nextRows = rows.map((r) => ({ ...r, cells: { ...r.cells } }));
  const targetRowCount = startRow + matrix.length;
  while (nextRows.length < targetRowCount) {
    nextRows.push(createRow(nextColumns));
  }
  nextRows = syncRowsWithColumns(nextRows, nextColumns);

  for (let ri = 0; ri < matrix.length; ri++) {
    const srcRow = matrix[ri];
    const rowValues: Partial<Record<PasteColumnRole, string>> = {};

    for (const m of mappings) {
      if (m.role === "skip") continue;
      const raw = srcRow[m.src]?.trim() ?? "";
      if (!raw) continue;
      const prev = rowValues[m.role];
      rowValues[m.role] = prev ? `${prev}\n${raw}` : raw;
    }

    const name = rowValues.name?.trim() ?? "";
    const spec = rowValues.spec?.trim() ?? "";
    const desc = rowValues.description?.trim() ?? "";

    const descCol = resolveTarget("name") ?? resolveTarget("description");
    if (descCol) {
      const parts = [name || desc, spec].filter(Boolean);
      nextRows[startRow + ri].cells[descCol.id] = parts.join(parts.length > 1 ? "\n\n" : "");
    }

    for (const role of ["unit", "quantity", "unitPrice"] as const) {
      const val = rowValues[role]?.trim();
      if (!val) continue;
      const col = resolveTarget(role);
      if (col) nextRows[startRow + ri].cells[col.id] = val;
    }
  }

  return { columns: nextColumns, rows: nextRows };
}

export function applyPasteToGrid(
  columns: QuoteColumn[],
  rows: QuoteRow[],
  startRow: number,
  startCol: number,
  matrix: string[][]
): { columns: QuoteColumn[]; rows: QuoteRow[] } {
  if (matrix.length === 0) return { columns, rows };

  if (isPasteHeaderRow(matrix[0])) {
    const mappings = matrix[0].map((cell, src) => ({
      src,
      role: inferPasteColumnRole(cell),
    }));
    return applyMappedPaste(columns, rows, startRow, mappings, matrix.slice(1));
  }

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
      if (!col || col.role === "lineTotal" || col.role === "index" || col.role === "vat") {
        continue;
      }
      nextRows[startRow + ri].cells[col.id] = matrix[ri][ci]?.trim() ?? "";
    }
  }

  return { columns: nextColumns, rows: nextRows };
}
