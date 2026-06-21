"use client";

import {
  looksLikeHtmlTablePaste,
  looksLikeRawExcelPaste,
  masterRowsToImportLines,
  matrixToMasterRows,
  parseHtmlToMasterRows,
  type ParsedMasterRow,
} from "./parse-master-spreadsheet";

export {
  looksLikeHtmlTablePaste,
  looksLikeRawExcelPaste,
  masterRowsToImportLines,
  type ParsedMasterRow,
};

export async function parseMasterDataFile(file: File): Promise<{
  rows: ParsedMasterRow[];
  lines: string;
  previewCount: number;
}> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".htm") || name.endsWith(".html")) {
    const html = await file.text();
    const rows = parseHtmlToMasterRows(html);
    return {
      rows,
      lines: masterRowsToImportLines(rows),
      previewCount: rows.length,
    };
  }

  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    const text = await file.text();
    const rows = parseDelimitedText(text);
    return {
      rows,
      lines: masterRowsToImportLines(rows),
      previewCount: rows.length,
    };
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      throw new Error("File Excel không có sheet nào");
    }
    const sheet = wb.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
    }) as unknown[][];
    const rows = matrixToMasterRows(matrix);
    if (!rows.length) {
      throw new Error(
        "Không đọc được dòng mã nào. Mở file Excel, chọn cột Mã + Tên rồi thử lại."
      );
    }
    return {
      rows,
      lines: masterRowsToImportLines(rows),
      previewCount: rows.length,
    };
  }

  throw new Error("Hỗ trợ file .htm, .html, .xlsx, .xls hoặc .csv");
}

/** Paste từ ô text: HTML bảng, TSV, hoặc từ chối Excel thô. */
export function parseMasterDataPaste(text: string): ParsedMasterRow[] {
  if (looksLikeRawExcelPaste(text)) {
    throw new Error(
      "Đây là file Excel thô. Dùng «Chọn file» hoặc mở Excel rồi copy bảng."
    );
  }
  if (looksLikeHtmlTablePaste(text)) {
    return parseHtmlToMasterRows(text);
  }
  return parseDelimitedText(text);
}

function parseDelimitedText(text: string): ParsedMasterRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines
    .map((line) => {
      const cols = line.split(/\t|;|\|/).map((c) => c.trim());
      return {
        code: cols[0] ?? "",
        name: cols[1] ?? "",
        extra: cols[2] ?? "",
      };
    })
    .filter((r) => r.code);
}
