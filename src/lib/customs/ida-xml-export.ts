import { readFileSync, existsSync } from "fs";
import path from "path";
import { toLocalDateString } from "@/lib/dates";
import type { DeclarationMeta } from "./declaration-meta";
import type { ImportDeclaration, ImportDeclarationLine } from "./types";

/** Phiên bản cấu trúc export — tăng khi đổi mapping theo mẫu HQ mới. */
export const IDA_XML_SCHEMA_VERSION = "2025.1-ecus-tabs";

const GOLDEN_SAMPLE_PATH = path.join(
  process.cwd(),
  "data",
  "customs",
  "golden-ida-sample.xml"
);

export interface IdaXmlExportOptions {
  /** Ghi chú nguồn (ERP reference). */
  referenceCode?: string;
}

export interface IdaXmlExportResult {
  xml: string;
  schemaVersion: string;
  warnings: string[];
  missingForPortal: string[];
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function el(tag: string, value: string | number | null | undefined, attrs?: Record<string, string>): string {
  const a = attrs
    ? " " +
      Object.entries(attrs)
        .map(([k, v]) => `${k}="${xmlEscape(v)}"`)
        .join(" ")
    : "";
  if (value == null || value === "") return `    <${tag}${a}/>`;
  return `    <${tag}${a}>${xmlEscape(String(value))}</${tag}>`;
}

/** Các chỉ tiêu ERP chưa có — cổng HQ có thể bắt nhập tay sau import. */
export function listIdaPortalGaps(
  decl: ImportDeclaration,
  meta: DeclarationMeta,
  lines: ImportDeclarationLine[]
): string[] {
  const gaps: string[] = [];
  if (!decl.declarantTaxCode?.trim()) gaps.push("Mã số thuế người khai (declarantTaxCode)");
  if (!decl.contractNo?.trim()) gaps.push("Số hợp đồng");
  if (!decl.invoiceDate) gaps.push("Ngày hóa đơn");
  if (!meta.valuationClassification) gaps.push("Phân loại khai trị giá");
  if (!meta.invoiceClassification) gaps.push("Phân loại hóa đơn");
  if (!meta.taxDeadlineCode) gaps.push("Mã thời hạn nộp thuế");
  for (const l of lines) {
    if (!l.importDutyCode) gaps.push(`Dòng ${l.lineNo}: mã thuế NK`);
    if (!l.vatDutyCode) gaps.push(`Dòng ${l.lineNo}: mã thuế GTGT`);
  }
  return gaps;
}

/**
 * XML IDA theo nhóm tab ECUS/VNACCS (Thông tin chung → Đơn vị XNK → Vận đơn → Hóa đơn → Hàng).
 * Đối chiếu tài liệu B05 / XML mapping TCHQ — đặt file mẫu tại data/customs/golden-ida-sample.xml để so khớp.
 */
export function buildIdaEcusXml(
  decl: ImportDeclaration,
  meta: DeclarationMeta,
  lines: ImportDeclarationLine[],
  options?: IdaXmlExportOptions
): IdaXmlExportResult {
  const warnings: string[] = [];
  const missingForPortal = listIdaPortalGaps(decl, meta, lines);

  if (!decl.procedureTypeCode) warnings.push("Thiếu mã loại hình");
  if (!decl.customsOfficeCode) warnings.push("Thiếu mã HQ tiếp nhận");
  if (!lines.length) warnings.push("Chưa có dòng hàng");

  const invoiceDate = toLocalDateString(decl.invoiceDate);
  const arrivalDate = toLocalDateString(decl.expectedArrivalDate);
  const ref = options?.referenceCode ?? decl.referenceCode;

  const lineBlocks = lines
    .map(
      (l) => `      <DongHang>
${el("STT", l.lineNo)}
${el("MaHS", l.hsCode)}
${el("TenHang", l.description)}
${el("SoLuong", l.quantity)}
${el("MaDVT", l.unitCode)}
${el("DonGia", l.unitPrice)}
${el("MaTienTe", l.currency || decl.currency)}
${el("XuatXu", l.originCountry)}
${el("MaThueNK", l.importDutyCode)}
${el("MaThueGTGT", l.vatDutyCode)}
${el("GhiChu", l.notes)}
      </DongHang>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Hoa Phong ERP — Tờ khai nhập IDA (export)
  Schema: ${IDA_XML_SCHEMA_VERSION}
  Nghiệp vụ: IDA — Khai trước thông tin tờ khai nhập khẩu
  Import thử: https://e-declaration.customs.gov.vn:8443/#/eclare-ui/QLTKN/QLTKN_IDA
  Tài liệu chuẩn HQ: B05 MoTa_Message_KinhDoanh.xls, XML mapping (vnaccs.com/downloads)
  Cảnh báo ERP: ${warnings.length ? warnings.join("; ") : "không"}
  Thiếu trên ERP (nhập tay trên cổng nếu cần): ${missingForPortal.length ? missingForPortal.join("; ") : "không"}
-->
<ImportDeclarationMessage xmlns="urn:vn:customs:ida:export:${IDA_XML_SCHEMA_VERSION}" procedure="IDA" generator="HoaPhong-ERP">
  <MessageHeader>
${el("SchemaVersion", IDA_XML_SCHEMA_VERSION)}
${el("MessageType", "IDA")}
${el("ReferenceNo", ref)}
${el("CreatedAt", new Date().toISOString())}
  </MessageHeader>

  <ThongTinChung>
${el("MaLoaiHinh", decl.procedureTypeCode, { hqField: "Loai_hinh" })}
${el("PhanLoaiCaNhanToChuc", meta.partyClassification, { hqField: "Phan_loai" })}
${el("MaHaiQuan", decl.customsOfficeCode, { hqField: "Ma_HQ" })}
${el("MaPhuongThucVC", decl.transportModeCode, { hqField: "Ma_PTVC" })}
${el("NgayHangDen", arrivalDate, { hqField: "Ngay_hang_den" })}
${el("SoThamChieuNoiBo", decl.referenceCode)}
${el("MaKho", decl.warehouseCode, { hqField: "Ma_kho" })}
${el("MaCuaKhauNhap", decl.borderGateCode, { hqField: "Ma_CK" })}
${el("MaCangXepHang", decl.loadingPortCode, { hqField: "Ma_cang_xep" })}
${el("PhanLoaiKhaiTriGia", meta.valuationClassification, { hqField: "PL_KTG" })}
${el("PhanLoaiHoaDon", meta.invoiceClassification)}
${el("MaThoiHanNopThue", meta.taxDeadlineCode)}
${el("GhiChuThanhToan", meta.paymentRemark)}
  </ThongTinChung>

  <DonViXNK>
    <NguoiNhapKhau>
${el("MaSoThue", decl.importerTaxCode)}
${el("Ten", decl.importerName)}
${el("DiaChi", meta.importerAddress)}
${el("DienThoai", meta.importerPhone)}
    </NguoiNhapKhau>
    <NguoiKhai>
${el("MaSoThue", decl.declarantTaxCode)}
    </NguoiKhai>
    <NguoiXuatKhau>
${el("Ten", meta.exporterName)}
${el("DiaChi", meta.exporterAddress)}
${el("MaNuoc", meta.exporterCountry || decl.countryOfExport)}
${el("DienThoai", meta.exporterPhone)}
    </NguoiXuatKhau>
  </DonViXNK>

  <VanDon>
${el("SoVanDon", decl.billOfLadingNo)}
${el("TenPhuongTien", meta.transportMeansName)}
${el("SoKien", meta.packageCount)}
${el("TrongLuong", meta.grossWeightKg)}
${el("MaNuocXuatKhau", decl.countryOfExport)}
  </VanDon>

  <HoaDon>
${el("SoHoaDon", decl.invoiceNo)}
${el("NgayHoaDon", invoiceDate)}
${el("SoHopDong", decl.contractNo)}
${el("MaIncoterm", decl.incoterms)}
${el("MaTienTe", decl.currency)}
${el("TyGia", decl.exchangeRate)}
${el("TriGiaHoaDon", decl.totalInvoiceValue)}
${el("PhiVanChuyen", decl.freightAmount)}
${el("PhiBaoHiem", decl.insuranceAmount)}
${el("MaPTTT", decl.paymentMethodCode)}
  </HoaDon>

  <DanhSachHang>
${lineBlocks}
  </DanhSachHang>
</ImportDeclarationMessage>`;

  return {
    xml,
    schemaVersion: IDA_XML_SCHEMA_VERSION,
    warnings,
    missingForPortal,
  };
}

/** Nếu có file mẫu từ ECUS/cổng HQ — dùng để diff cấu trúc (dev). */
export function readGoldenIdaSample(): string | null {
  if (!existsSync(GOLDEN_SAMPLE_PATH)) return null;
  try {
    return readFileSync(GOLDEN_SAMPLE_PATH, "utf8");
  } catch {
    return null;
  }
}

export function goldenIdaSamplePath(): string {
  return GOLDEN_SAMPLE_PATH;
}
