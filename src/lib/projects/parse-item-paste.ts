/** Một dòng dán từ Excel/Sheets → một hạng mục. */
export interface ParsedProjectItemRow {
  name: string;
  description: string;
  quantity: number;
  unit: string;
}

/** Giới hạn cột khi dán (Google Sheets / Excel thường &lt; 40). */
export const MAX_PASTE_COLUMNS = 40;

export interface PasteImportStats {
  rowCount: number;
  columnCount: number;
  quantityColumnIndex: number | null;
  quantityColumnLabel: string | null;
  source: "html" | "plain" | "none";
  maxSupportedColumns: number;
}

/** Số cột / hàng ưu tiên khi bảng gộp một dòng Tab dài. */
const TYPICAL_COLS = [
  12, 11, 10, 9, 8, 7, 6, 5, 4, 3,
] as const;

/** Nhãn cột thường gặp cho số lượng / khối lượng (tiếng Việt + tiếng Anh). */
const QTY_HEADER_EXACT = new Set([
  "sl",
  "kl",
  "qty",
  "q ty",
  "q'ty",
  "quantity",
  "quant",
  "quant.",
  "amount",
  "count",
  "ct",
  "nr",
  "num",
  "pcs",
  "pk",
  "no",
  "nos",
  "vol",
  "volume",
  "mass",
  "weight",
  "so",
  "so luong",
  "so lg",
  "so luong yc",
  "so luong tt",
  "so luong thuc te",
  "khoi luong",
  "khoi lg",
  "khoi luong yc",
  "khoi luong tt",
  "kl yc",
  "sl yc",
  "qty yc",
  "qty tt",
  "sl tt",
  "kl tt",
  "soluong",
  "khoiluong",
  "s.l",
  "k.l",
  "s/l",
  "k/l",
]);

function normalizeQtyHeaderLabel(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[.'`´''"]/g, "")
    .replace(/\s+/g, " ");
}

/** Ô tiêu đề cột có phải cột số lượng / khối lượng không. */
export function isQuantityColumnHeader(label: string): boolean {
  const t = normalizeQtyHeaderLabel(label);
  if (!t || t.length > 48) return false;
  if (QTY_HEADER_EXACT.has(t)) return true;

  if (/^(so|số)(\s*luong|\s*lg|\s*lượng)(\s|$|\.|\/|_|-)/.test(t)) return true;
  if (/^(khoi|khối)(\s*luong|\s*lg|\s*lượng)(\s|$|\.|\/|_|-)/.test(t)) return true;
  if (/^(so|khoi|số|khối)\s*(luong|lg|lượng)$/.test(t)) return true;
  if (/^q\s*ty$|^qty\.?$|^quantity$|^quant(ity|ite)?$/.test(t)) return true;
  if (/^(sl|kl|qty|ct)(\.|\s|$|\/|_|-)/.test(t)) return true;
  if (/\b(so\s*luong|so\s*lg|khoi\s*luong|khoi\s*lg|quantity|qty)\b/.test(t)) return true;
  if (/\b(số\s*lượng|khối\s*lượng)\b/.test(label.trim().toLowerCase())) return true;

  return false;
}

function findQuantityColumnIndex(headerCells: string[]): number {
  let idx = -1;
  for (let i = 0; i < headerCells.length; i++) {
    if (isQuantityColumnHeader(headerCells[i] ?? "")) idx = i;
  }
  return idx;
}

function splitTsvFields(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuote && next === '"') {
        field += '"';
        i++;
        continue;
      }
      inQuote = !inQuote;
      continue;
    }

    if (ch === "\t" && !inQuote) {
      fields.push(field.replace(/\u00a0/g, " ").trim());
      field = "";
      continue;
    }

    field += ch;
  }

  fields.push(field.replace(/\u00a0/g, " ").trim());
  return fields;
}

function splitRow(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  if (trimmed.includes("\t")) {
    if (trimmed.includes('"')) return splitTsvFields(trimmed);
    return trimmed.split("\t").map((c) => c.trim());
  }
  if (trimmed.includes(";")) {
    return trimmed.split(";").map((c) => c.trim());
  }
  return [trimmed];
}

/** Giữ ô trống (cột ẩn Excel) — chỉ dùng khi gộp hàng. */
function splitRowRaw(line: string): string[] {
  if (line.includes('"')) return splitTsvFields(line);
  return line.split("\t").map((c) => c.replace(/\u00a0/g, " ").trim());
}

/** Tách hàng TSV — giữ xuống dòng trong ô Excel có dấu "…" */
function splitTsvRecords(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[] = [];
  let row = "";
  let inQuote = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    const next = normalized[i + 1];

    if (ch === '"') {
      if (inQuote && next === '"') {
        row += '"';
        i++;
        continue;
      }
      inQuote = !inQuote;
      row += ch;
      continue;
    }

    if (ch === "\n" && !inQuote) {
      const trimmed = row.trim();
      if (trimmed) rows.push(trimmed);
      row = "";
      continue;
    }

    row += ch;
  }

  const tail = row.trim();
  if (tail) rows.push(tail);
  return rows;
}

function splitPhysicalLines(text: string): string[] {
  if (text.includes('"')) return splitTsvRecords(text);
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function columnCount(line: string): number {
  return splitRowRaw(line).length;
}

function lastNonemptyIndex(cells: string[]): number {
  for (let i = cells.length - 1; i >= 0; i--) {
    if ((cells[i] ?? "").trim()) return i;
  }
  return -1;
}

function decodeHtmlCell(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

/** Google Sheets / Excel: mỗi &lt;tr&gt; = đúng một hàng bảng (ô xuống dòng = &lt;br&gt;, không tách dòng vật lý). */
function extractHtmlGrid(html: string): string[][] {
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  let best: string[][] = [];

  for (const tableHtml of tables) {
    const grid: string[][] = [];
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trM: RegExpExecArray | null;
    while ((trM = trRe.exec(tableHtml)) !== null) {
      const cells: string[] = [];
      const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellM: RegExpExecArray | null;
      while ((cellM = cellRe.exec(trM[1])) !== null) {
        cells.push(decodeHtmlCell(cellM[1]));
      }
      if (cells.some((c) => c.length > 0)) grid.push(cells);
    }
    if (grid.length > best.length) best = grid;
  }
  return best;
}

function gridToParsedRows(grid: string[][]): ParsedProjectItemRow[] {
  let qtyColIdx = -1;
  const rows: ParsedProjectItemRow[] = [];
  for (const cells of grid) {
    const compact = compactCells(cells);
    if (compact.length && isHeaderRow(compact)) {
      qtyColIdx = findQuantityColumnIndex(cells);
      continue;
    }
    const parsed = parseDataRow(cells, qtyColIdx);
    if (parsed) rows.push(parsed);
  }
  return rows;
}

export function parseSpreadsheetHtml(html: string): ParsedProjectItemRow[] {
  const grid = extractHtmlGrid(html);
  if (grid.length < 1) return [];
  return gridToParsedRows(grid);
}

function mergeContinuationLine(acc: string[], nextParts: string[], targetCols: number): string[] {
  const a = [...acc];
  while (a.length < targetCols) a.push("");

  const last = lastNonemptyIndex(a);
  const incomplete = a.length < targetCols || last < targetCols - 1;
  let startB = 0;

  if (incomplete && last >= 0 && (nextParts[0] ?? "").trim()) {
    a[last] = a[last] ? `${a[last]} ${nextParts[0]!.trim()}` : nextParts[0]!.trim();
    startB = 1;
  }

  const baseIdx = startB > 0 ? last + 1 : 0;
  for (let k = 0; k < nextParts.length - startB; k++) {
    const v = (nextParts[startB + k] ?? "").trim();
    if (!v) continue;
    const idx = baseIdx + k;
    while (a.length <= idx) a.push("");
    a[idx] = a[idx] ? `${a[idx]} ${v}` : v;
  }
  return a;
}

function extractSheetMeta(physical: string[]): {
  targetCols: number;
  qtyColIdx: number;
  dataLines: string[];
} {
  let targetCols = 0;
  let qtyColIdx = -1;
  const dataLines: string[] = [];

  for (const line of physical) {
    const parts = splitRowRaw(line);
    const compact = parts.map((p) => p.trim()).filter(Boolean);
    if (compact.length && isHeaderRow(compact)) {
      targetCols = Math.max(targetCols, parts.length);
      qtyColIdx = findQuantityColumnIndex(parts);
      continue;
    }
    dataLines.push(line);
  }

  if (!targetCols) {
    targetCols = Math.max(0, ...dataLines.map(columnCount));
  }
  return { targetCols, qtyColIdx, dataLines };
}

function rowHasQuantity(cells: string[], qtyColIdx: number): boolean {
  const first = (cells[0] ?? "").trim();
  if (/^danh\s*mục/i.test(first)) return false;

  if (qtyColIdx >= 0 && qtyColIdx < cells.length) {
    return looksNumeric(cells[qtyColIdx] ?? "");
  }
  const last = lastNonemptyIndex(cells);
  return last >= 1 && looksNumeric(cells[last] ?? "");
}

/**
 * Plain text: gộp dòng vật lý → hàng logic; chỉ tách hàng mới khi đã có Số lượng (cột SL).
 */
function mergePhysicalLines(physical: string[]): string[] {
  const anyTab = physical.some((l) => l.includes("\t"));
  if (!anyTab) return physical;

  const { targetCols, qtyColIdx, dataLines } = extractSheetMeta(physical);
  if (targetCols < 2) return dataLines;

  const logical: string[] = [];
  let acc: string[] = [];

  const flushAcc = () => {
    if (acc.some((c) => c.trim())) {
      logical.push(acc.join("\t"));
    }
    acc = [];
  };

  for (const line of dataLines) {
    if (!line.includes("\t")) {
      if (acc.length) {
        const li = lastNonemptyIndex(acc);
        if (li >= 0) acc[li] = `${acc[li]} ${line}`.trim();
      } else if (logical.length) {
        const prev = splitRowRaw(logical[logical.length - 1]);
        const li = lastNonemptyIndex(prev);
        if (li >= 0) {
          prev[li] = `${prev[li]} ${line}`.trim();
          logical[logical.length - 1] = prev.join("\t");
        }
      }
      continue;
    }

    const parts = splitRowRaw(line);
    if (!acc.length) {
      acc = [...parts];
    } else if (rowHasQuantity(acc, qtyColIdx)) {
      flushAcc();
      acc = [...parts];
    } else {
      acc = mergeContinuationLine(acc, parts, targetCols);
    }

    if (rowHasQuantity(acc, qtyColIdx) && (acc[0]?.trim() || lastNonemptyIndex(acc) > 0)) {
      flushAcc();
    }
  }
  if (acc.length && rowHasQuantity(acc, qtyColIdx)) flushAcc();

  return logical;
}

function compactCells(cells: string[]): string[] {
  return cells.map((c) => c.trim()).filter((c) => c.length > 0);
}

export function parseItemQuantity(raw: string): number {
  const t = raw.trim();
  if (!t) return 1;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) {
    return parseFloat(t.replace(/\./g, "").replace(",", ".")) || 1;
  }
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) {
    return parseFloat(t.replace(/,/g, "")) || 1;
  }
  const n = parseFloat(t.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 1;
  return n;
}

function looksNumeric(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  return /^-?[\d.,\s]+$/.test(t) && /\d/.test(t);
}

function isLikelyUnit(s: string): boolean {
  if (looksNumeric(s)) return false;
  const t = s.trim();
  if (t.length > 16 || /\d{2,}/.test(t)) return false;
  if (
    /^(cái|ca[iị]|bộ|bo|gói|goi|kg|g|m²|m2|m³|m3|mét|met|set|pcs|chai|cuộn|cuon|thùng|tấn|ton|lít|lit|hộp|hop)$/i.test(
      t
    )
  ) {
    return true;
  }
  return t.length <= 6 && /^[a-zA-ZÀ-ỹ]+$/i.test(t);
}

function isHeaderRow(parts: string[]): boolean {
  const first = (parts[0] ?? "").trim().toLowerCase();
  if (/^danh\s*mục|^stt$/.test(first)) return true;

  const joined = parts.join(" ").toLowerCase();
  const hasCatalogHeader = /danh mục hàng hóa|danh muc hang hoa/.test(joined);
  const hasBoqHeader =
    /đơn vị tính|don vi tinh|đơn giá mua|don gia mua|thành tiền|thanh tien|ký mã hiệu|ky ma hieu/.test(
      joined
    );
  const hasQtyHeaderLabel = parts.some(
    (c) => isQuantityColumnHeader(c) && !looksNumeric(c)
  );

  if (hasCatalogHeader || (hasBoqHeader && hasQtyHeaderLabel)) return true;

  if (
    /thông số kỹ thuật|thong so ky thuat|mã tham khảo|ma tham chieu|hãng sản xuất|hãng sx|nsx\/|xuất xứ|xuat xu/.test(
      joined
    ) &&
    hasQtyHeaderLabel
  ) {
    return true;
  }

  return false;
}

function isJunkFragmentRow(parts: string[]): boolean {
  const compact = compactCells(parts);
  if (!compact.length) return true;
  if (compact.length === 1) {
    const t = compact[0];
    if (t.length < 4 && !/lõi|loc|filter|van|bơm|máy|ống|thép|đồng|nhôm/i.test(t)) return true;
    if (looksNumeric(t)) return true;
  }
  const name = compact[0] ?? "";
  if (name.length < 2) return true;
  if (/^(xuất xứ|đơn vị|mã tham|thông số|hãng|nsx)/i.test(name) && compact.length <= 2) return true;
  return false;
}

function parseDataRow(cells: string[], qtyColIdx = -1): ParsedProjectItemRow | null {
  const raw = cells.map((c) => c.trim());
  const parts = compactCells(cells);
  if (!parts.length || isHeaderRow(parts) || isJunkFragmentRow(cells)) return null;

  if (parts.length === 1) {
    return { name: parts[0], description: "", quantity: 1, unit: "" };
  }

  const name = raw[0] ?? parts[0] ?? "";
  if (!name) return null;
  if (/^danh\s*mục(\s+hàng|\s+hóa)?$/i.test(name.trim())) return null;

  if (qtyColIdx >= 0 && qtyColIdx < raw.length && looksNumeric(raw[qtyColIdx] ?? "")) {
    const quantity = parseItemQuantity(raw[qtyColIdx]!);
    const descParts: string[] = [];
    let unit = "";
    for (let i = 1; i < raw.length; i++) {
      if (i === qtyColIdx || !raw[i]) continue;
      if (i === qtyColIdx - 1 && isLikelyUnit(raw[i]!)) {
        unit = raw[i]!;
        continue;
      }
      descParts.push(raw[i]!);
    }
    let description = descParts.join(" · ");
    if (unit) description = description ? `${description} · ${unit}` : unit;
    return { name, description, quantity, unit: "" };
  }

  const rest = [...parts];
  let quantity = 1;
  let unit = "";

  if (looksNumeric(rest[rest.length - 1])) {
    quantity = parseItemQuantity(rest.pop()!);
  }

  if (rest.length > 1 && isLikelyUnit(rest[rest.length - 1])) {
    unit = rest.pop()!;
  }

  const mid = rest.slice(1);
  let description = mid.join(" · ");
  if (unit) {
    description = description ? `${description} · ${unit}` : unit;
  }

  return { name, description, quantity, unit: "" };
}

function parseSingleLineTable(line: string): ParsedProjectItemRow[] {
  const flat = compactCells(splitRow(line));
  if (flat.length < 2) {
    const one = parseDataRow(flat);
    return one ? [one] : [];
  }

  for (const cols of TYPICAL_COLS) {
    if (flat.length >= cols * 2 && flat.length % cols === 0) {
      const rows: ParsedProjectItemRow[] = [];
      for (let i = 0; i < flat.length; i += cols) {
        const parsed = parseDataRow(flat.slice(i, i + cols));
        if (parsed) rows.push(parsed);
      }
      if (rows.length >= 2) return rows;
    }
  }

  for (let cols = Math.min(MAX_PASTE_COLUMNS, flat.length); cols >= 3; cols--) {
    if (flat.length >= cols * 2 && flat.length % cols === 0) {
      const rows: ParsedProjectItemRow[] = [];
      for (let i = 0; i < flat.length; i += cols) {
        const parsed = parseDataRow(flat.slice(i, i + cols));
        if (parsed) rows.push(parsed);
      }
      if (rows.length >= 2) return rows;
    }
  }
  return [];
}

function parsePlainText(text: string): ParsedProjectItemRow[] {
  const normalized = text.replace(/\u00a0/g, " ").trim();
  if (!normalized) return [];

  const physical = splitPhysicalLines(normalized);
  const { qtyColIdx } = extractSheetMeta(physical);
  const logical = mergePhysicalLines(physical);

  if (logical.length <= 1 && logical[0]?.includes("\t")) {
    const flat = splitRow(logical[0]);
    if (flat.length >= 9) {
      const fromTable = parseSingleLineTable(logical[0]);
      if (fromTable.length >= 2) return fromTable;
    }
  }

  const rows: ParsedProjectItemRow[] = [];
  for (const line of logical) {
    const parsed = parseDataRow(splitRow(line), qtyColIdx);
    if (parsed) rows.push(parsed);
  }
  return rows;
}

function statsFromGrid(grid: string[][], source: "html" | "plain"): PasteImportStats {
  let qtyColIdx: number | null = null;
  let qtyLabel: string | null = null;
  let colCount = 0;
  let rowCount = 0;

  for (const row of grid) {
    colCount = Math.max(colCount, row.length);
    const compact = compactCells(row);
    if (compact.length && isHeaderRow(compact)) {
      const idx = findQuantityColumnIndex(row);
      if (idx >= 0) {
        qtyColIdx = idx;
        qtyLabel = (row[idx] ?? "").trim() || null;
      }
      continue;
    }
    if (parseDataRow(row, qtyColIdx ?? -1)) rowCount++;
  }

  return {
    rowCount,
    columnCount: colCount,
    quantityColumnIndex: qtyColIdx,
    quantityColumnLabel: qtyLabel,
    source,
    maxSupportedColumns: MAX_PASTE_COLUMNS,
  };
}

/** Thống kê vùng dán — hiển thị cho user biết đã nhận bao nhiêu cột / cột SL. */
export function getPasteImportStats(plain: string, html?: string | null): PasteImportStats {
  const empty: PasteImportStats = {
    rowCount: 0,
    columnCount: 0,
    quantityColumnIndex: null,
    quantityColumnLabel: null,
    source: "none",
    maxSupportedColumns: MAX_PASTE_COLUMNS,
  };
  if (html?.trim()) {
    const grid = extractHtmlGrid(html);
    if (grid.length) return statsFromGrid(grid, "html");
  }
  const normalized = plain.replace(/\u00a0/g, " ").trim();
  if (!normalized) return empty;
  const physical = splitPhysicalLines(normalized);
  const logical = mergePhysicalLines(physical);
  const grid = logical.map((line) => splitRowRaw(line));
  if (!grid.length) return empty;
  return statsFromGrid(grid, "plain");
}

/**
 * Dán từ Excel / Google Sheets.
 * Ưu tiên clipboard HTML (mỗi &lt;tr&gt; = 1 hàng); fallback plain text.
 */
export function parseProjectItemPaste(plain: string, html?: string | null): ParsedProjectItemRow[] {
  if (html?.trim()) {
    const htmlRows = parseSpreadsheetHtml(html);
    if (htmlRows.length > 0) return htmlRows;
  }
  return parsePlainText(plain);
}
