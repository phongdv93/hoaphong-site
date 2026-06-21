import { readFileSync, existsSync } from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { toLocalDateString } from "@/lib/dates";
import type { DeclarationMeta } from "./declaration-meta";
import type { ImportDeclaration, ImportDeclarationLine } from "./types";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "data",
  "customs",
  "templates",
  "ToKhaiHQ7N-sample-MORETTO.xlsx"
);

type Grid = (string | number)[][];

function formatDateVi(iso: string | null): string {
  if (!iso) return "";
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return "";
  return `${day}/${m}/${y}`;
}

/** Tìm ô nhãn (cột 3 thường gặp) và ghi giá trị vào cột valueCol. */
function setByLabel(
  grid: Grid,
  label: string,
  value: string | number,
  valueCol = 7
): boolean {
  const want = label.trim().toLowerCase();
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? "").trim().toLowerCase();
      if (cell === want) {
        row[valueCol] = value;
        return true;
      }
    }
  }
  return false;
}

/** Một số chỉ tiêu nằm cột 15 (mẫu MORETTO). */
function setByLabelCol15(grid: Grid, label: string, value: string | number): boolean {
  return setByLabel(grid, label, value, 15);
}

function setInSection(
  grid: Grid,
  sectionLabel: string,
  fieldLabel: string,
  value: string | number,
  valueCol = 7
): boolean {
  const section = sectionLabel.trim().toLowerCase();
  const field = fieldLabel.trim().toLowerCase();
  for (let r = 0; r < grid.length; r++) {
    if (String(grid[r]?.[3] ?? "").trim().toLowerCase() !== section) continue;
    for (let k = r + 1; k < Math.min(r + 12, grid.length); k++) {
      if (String(grid[k]?.[3] ?? "").trim().toLowerCase() === field) {
        grid[k][valueCol] = value;
        return true;
      }
    }
    return false;
  }
  return false;
}

function clearDeclarationNumber(grid: Grid): void {
  setByLabel(grid, "Số tờ khai", "");
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    if (row && String(row[3] ?? "").trim() === "Số tờ khai") {
      row[4] = "";
      row[7] = "";
    }
  }
}

function sheetToGrid(ws: XLSX.WorkSheet): Grid {
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as Grid;
}

function gridToSheet(grid: Grid, sheetName: string, wb: XLSX.WorkBook): void {
  const ws = XLSX.utils.aoa_to_sheet(grid);
  if (wb.SheetNames.includes(sheetName)) {
    const idx = wb.SheetNames.indexOf(sheetName);
    wb.Sheets[sheetName] = ws;
    wb.SheetNames[idx] = sheetName;
  } else {
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
}

function fillTkn(grid: Grid, decl: ImportDeclaration, meta: DeclarationMeta): string[] {
  const missed: string[] = [];

  clearDeclarationNumber(grid);

  if (!setByLabelCol15(grid, "Mã loại hình", decl.procedureTypeCode)) missed.push("Mã loại hình");
  if (meta.partyClassification && !setByLabel(grid, "Mã phân loại kiểm tra", meta.partyClassification)) {
    missed.push("Mã phân loại kiểm tra");
  }

  if (decl.customsOfficeCode) {
    if (!setByLabel(grid, "Tên cơ quan Hải quan tiếp nhận tờ khai", decl.customsOfficeCode)) {
      missed.push("HQ tiếp nhận");
    }
  }

  if (!setInSection(grid, "Người nhập khẩu", "Mã", decl.importerTaxCode)) {
    missed.push("MST người nhập");
  }
  if (!setInSection(grid, "Người nhập khẩu", "Tên", decl.importerName)) {
    missed.push("Tên người nhập");
  }
  if (meta.importerAddress) {
    setInSection(grid, "Người nhập khẩu", "Địa chỉ", meta.importerAddress);
  }
  if (meta.importerPhone) {
    setInSection(grid, "Người nhập khẩu", "Số điện thoại", meta.importerPhone);
  }

  if (meta.exporterName && !setInSection(grid, "Người xuất khẩu", "Tên", meta.exporterName)) {
    missed.push("Tên người xuất");
  }
  if (meta.exporterAddress) {
    setInSection(grid, "Người xuất khẩu", "Địa chỉ", meta.exporterAddress);
  }
  if (meta.exporterCountry || decl.countryOfExport) {
    setInSection(
      grid,
      "Người xuất khẩu",
      "Mã nước",
      meta.exporterCountry || decl.countryOfExport
    );
  }

  if (decl.billOfLadingNo) {
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r];
      if (String(row?.[3] ?? "").trim() === "Số vận đơn") {
        row[3] = 1;
        row[4] = decl.billOfLadingNo;
        break;
      }
    }
  }

  if (decl.borderGateCode) setByLabelCol15(grid, "Địa điểm dỡ hàng", decl.borderGateCode);
  if (decl.loadingPortCode) setByLabelCol15(grid, "Địa điểm xếp hàng", decl.loadingPortCode);
  if (decl.warehouseCode) setByLabelCol15(grid, "Địa điểm lưu kho", decl.warehouseCode);

  const arrival = formatDateVi(toLocalDateString(decl.expectedArrivalDate));
  if (arrival) setByLabelCol15(grid, "Ngày hàng đến", arrival);

  if (decl.invoiceNo) setByLabel(grid, "Số hóa đơn", decl.invoiceNo);
  const invDate = formatDateVi(toLocalDateString(decl.invoiceDate));
  if (invDate) setByLabel(grid, "Ngày phát hành", invDate);
  if (decl.paymentMethodCode) setByLabel(grid, "Phương thức thanh toán", decl.paymentMethodCode);

  if (decl.totalInvoiceValue) {
    const invLine = `${decl.incoterms || ""} - ${decl.currency} - ${decl.totalInvoiceValue}`;
    setByLabel(grid, "Tổng trị giá hóa đơn", invLine);
  }

  if (meta.grossWeightKg) setByLabel(grid, "Tổng trọng lượng hàng (Gross)", meta.grossWeightKg);
  if (meta.packageCount) setByLabel(grid, "Số lượng", meta.packageCount);

  if (meta.valuationClassification) {
    setByLabel(grid, "Mã phân loại khai trị giá", meta.valuationClassification);
  }
  if (meta.taxDeadlineCode) {
    setByLabel(grid, "Mã xác định thời hạn nộp thuế", meta.taxDeadlineCode);
  }

  return missed;
}

function fillHang(grid: Grid, decl: ImportDeclaration, lines: ImportDeclarationLine[]): void {
  let hangStart = -1;
  for (let r = 0; r < grid.length; r++) {
    if (String(grid[r]?.[11] ?? "").trim() === "Mã số hàng hóa") {
      hangStart = r + 1;
      break;
    }
  }
  if (hangStart < 0) return;

  const line = lines[0];
  if (!line) return;

  const row = grid[hangStart] || (grid[hangStart] = []);
  row[11] = line.hsCode;
  row[12] = line.description;
  row[20] = line.quantity;
  row[24] = line.unitCode;
  row[28] = line.unitPrice;
  row[32] = line.originCountry || decl.countryOfOrigin;
  if (line.importDutyCode) row[17] = line.importDutyCode;
}

export interface ToKhaiHQ7NExportResult {
  buffer: Buffer;
  filename: string;
  warnings: string[];
  templateUsed: boolean;
}

/**
 * Xuất file ToKhaiHQ7N_*.xlsx (thử nghiệm).
 * Template hiện tại là bản HQ trả về sau IDA — KHÔNG phải file import.
 * Khi có ToKhaiHQ7N-import-template.xlsx, đổi TEMPLATE_PATH và mapping.
 */
export function buildToKhaiHQ7NWorkbook(
  decl: ImportDeclaration,
  meta: DeclarationMeta,
  lines: ImportDeclarationLine[]
): ToKhaiHQ7NExportResult {
  const warnings: string[] = [];

  if (!existsSync(TEMPLATE_PATH)) {
    throw new Error(
      "Thiếu file mẫu data/customs/templates/ToKhaiHQ7N-sample-MORETTO.xlsx — copy từ Downloads."
    );
  }

  const wb = XLSX.read(readFileSync(TEMPLATE_PATH), { type: "buffer", cellStyles: true });

  if (wb.SheetNames.includes("TKN")) {
    const tknGrid = sheetToGrid(wb.Sheets.TKN);
    const missed = fillTkn(tknGrid, decl, meta);
    if (missed.length) warnings.push(`TKN chưa map: ${missed.join(", ")}`);
    gridToSheet(tknGrid, "TKN", wb);
  }

  if (wb.SheetNames.includes("HANG")) {
    const hangGrid = sheetToGrid(wb.Sheets.HANG);
    fillHang(hangGrid, decl, lines);
    gridToSheet(hangGrid, "HANG", wb);
  }

  const ref = (decl.referenceCode || "draft").replace(/[^\w.-]+/g, "_").slice(0, 40);
  const buf = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  const filename = `ToKhaiHQ7N_${ref}_HOAPHONG.xlsx`;

  return { buffer: buf, filename, warnings, templateUsed: true };
}

export function toKhaiHq7nTemplatePath(): string {
  return TEMPLATE_PATH;
}
