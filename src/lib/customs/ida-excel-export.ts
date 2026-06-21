import * as XLSX from "xlsx";
import type { ImportDeclaration, ImportDeclarationLine } from "./types";

/** Mẫu cột F6 ECUS — danh sách hàng tờ khai nhập (tham khảo HD ECUS5 VNACCS). */
const LINE_HEADERS = [
  "STT",
  "Mã HS",
  "Tên hàng",
  "Số lượng",
  "ĐVT",
  "Đơn giá",
  "Mã tiền",
  "Xuất xứ",
  "Mã thuế NK",
  "Mã thuế GTGT",
  "Ghi chú",
] as const;

export function buildIdaLinesExcelBuffer(
  decl: ImportDeclaration,
  lines: ImportDeclarationLine[]
): Buffer {
  const rows: (string | number)[][] = [LINE_HEADERS.slice()];
  for (const l of lines) {
    rows.push([
      l.lineNo,
      l.hsCode,
      l.description,
      l.quantity,
      l.unitCode,
      l.unitPrice,
      l.currency || decl.currency,
      l.originCountry,
      l.importDutyCode ?? "",
      l.vatDutyCode ?? "",
      l.notes ?? "",
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "HangHoa");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}
