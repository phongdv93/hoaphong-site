/** Phát hiện paste nhầm cả file .xlsx (ZIP) vào textarea. */
export function looksLikeRawExcelPaste(text: string): boolean {
  const t = text.trimStart().slice(0, 800);
  return (
    t.startsWith("PK") &&
    (t.includes("[Content_Types].xml") || t.includes("xl/workbook.xml"))
  );
}

export interface ParsedMasterRow {
  code: string;
  name: string;
  extra: string;
}

function normHeader(cell: unknown): string {
  return String(cell ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function findColumnIndex(headers: string[], patterns: RegExp[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (patterns.some((p) => p.test(h))) return i;
  }
  return -1;
}

/** Ưu tiên cột tên đầy đủ (file Excel Bảng mã HQ). */
function findBestNameColumnIndex(headers: string[]): number {
  let bestIdx = -1;
  let bestScore = 0;
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    let score = 0;
    if (/ten.*don.*vi.*hai/.test(h)) score = 10;
    else if (/ten.*don.*vi/.test(h)) score = 8;
    else if (/ten.*hai.*quan/.test(h) && !/rut/.test(h)) score = 6;
    else if (/ten.*chi.*cuc/.test(h)) score = 5;
    else if (/^ten(\s|$)/.test(h) && !/rut/.test(h)) score = 3;
    if (/rut.*gon/.test(h)) score = 1;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** Chuyển ma trận ô (sheet đầu) → danh sách mã/tên. */
export function matrixToMasterRows(matrix: unknown[][]): ParsedMasterRow[] {
  if (!matrix.length) return [];

  const headerRow = matrix[0]?.map(normHeader) ?? [];
  const hasHeader = headerRow.some(
    (h) =>
      /^(stt|ma|code|ten|name)/.test(h) ||
      h.includes("ma hq") ||
      h.includes("ma hai quan") ||
      h.includes("chi cuc")
  );

  let codeIdx = 0;
  let nameIdx = 1;
  let extraIdx = 2;
  let startRow = 0;

  if (hasHeader) {
    startRow = 1;
    const codeCol = findColumnIndex(headerRow, [
      /^ma(\s|$)/,
      /^code$/,
      /ma\s*hq/,
      /ma\s*hai\s*quan/,
      /ma\s*chi\s*cuc/,
    ]);
    const nameCol = findBestNameColumnIndex(headerRow);
    const noteCol = findColumnIndex(headerRow, [/^ghi\s*chu/, /^extra/, /^mo\s*ta/]);
    const shortCol = findColumnIndex(headerRow, [/rut.*gon/, /ten.*rut/]);
    const extraCol = noteCol >= 0 ? noteCol : shortCol;
    if (codeCol >= 0) codeIdx = codeCol;
    if (nameCol >= 0) nameIdx = nameCol;
    if (extraCol >= 0 && extraCol !== codeIdx && extraCol !== nameCol) extraIdx = extraCol;
  }

  const out: ParsedMasterRow[] = [];
  for (let r = startRow; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row) continue;
    const code = String(row[codeIdx] ?? "").trim();
    const name = String(row[nameIdx] ?? "").trim();
    const extra = String(row[extraIdx] ?? "").trim();
    if (!code) continue;
    if (/^(stt|ma(\s|$)?|code|ten(\s|$)?|name)$/i.test(code) && !name) continue;
    out.push({ code, name, extra });
  }
  return out;
}

export function masterRowsToImportLines(rows: ParsedMasterRow[]): string {
  return rows.map((r) => [r.code, r.name, r.extra].join("\t")).join("\n");
}

/** File .htm / paste HTML từ customs.gov.vn (Bảng mã chuẩn). */
export function looksLikeHtmlTablePaste(text: string): boolean {
  const t = text.trim().slice(0, 2000).toLowerCase();
  return t.includes("<table") || (t.includes("<tr") && t.includes("<td"));
}

/** Đọc bảng HTML (file .htm Tổng cục HQ). Chạy phía client (DOMParser). */
export function parseHtmlToMasterRows(html: string): ParsedMasterRow[] {
  if (typeof DOMParser === "undefined") {
    throw new Error("Trình duyệt không hỗ trợ đọc HTML");
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  const tables = Array.from(doc.querySelectorAll("table"));
  if (!tables.length) {
    throw new Error("Không thấy bảng trong file HTML. Mở file .htm bằng trình duyệt, copy bảng rồi dán.");
  }

  let bestTable: HTMLTableElement | null = null;
  let bestScore = 0;
  for (const table of tables) {
    const trs = table.querySelectorAll("tr");
    const score = trs.length;
    if (score > bestScore) {
      bestScore = score;
      bestTable = table;
    }
  }
  if (!bestTable) {
    throw new Error("Bảng HTML trống");
  }

  const matrix: unknown[][] = [];
  for (const tr of bestTable.querySelectorAll("tr")) {
    const cells = tr.querySelectorAll("th, td");
    const row = Array.from(cells).map(
      (c) => (c.textContent ?? "").replace(/\s+/g, " ").trim()
    );
    if (row.some((c) => c.length > 0)) matrix.push(row);
  }

  const rows = matrixToMasterRows(matrix);
  if (!rows.length) {
    throw new Error(
      "Không tách được cột Mã/Tên. File có thể là trang danh sách — hãy mở link «Tải về» đúng dòng danh mục (vd: Mã Chi cục HQ)."
    );
  }
  return rows;
}
