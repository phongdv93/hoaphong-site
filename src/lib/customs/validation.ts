import {
  INCOTERMS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PROCEDURE_TYPE_OPTIONS,
  TRANSPORT_MODE_OPTIONS,
} from "./constants";
import type {
  ImportDeclaration,
  ImportDeclarationLine,
  ImportDeclarationPreflightCheck,
  ImportDeclarationPreflightReport,
} from "./types";

export function validateImportDeclaration(
  decl: Partial<ImportDeclaration>,
  lines: ImportDeclarationLine[]
): string[] {
  const errors: string[] = [];

  if (!decl.importerTaxCode?.trim()) errors.push("Thiếu MST người nhập khẩu");
  if (!decl.importerName?.trim()) errors.push("Thiếu tên người nhập khẩu");
  if (!decl.procedureTypeCode?.trim()) errors.push("Thiếu mã loại hình");
  if (!decl.customsOfficeCode?.trim()) errors.push("Thiếu mã chi cục HQ");
  if (!decl.warehouseCode?.trim()) errors.push("Thiếu địa điểm lưu kho chờ thông quan");
  if (!decl.borderGateCode?.trim()) errors.push("Thiếu địa điểm dỡ hàng (cảng nhập)");
  if (!decl.loadingPortCode?.trim()) errors.push("Thiếu địa điểm xếp hàng (cảng xuất)");
  if (!decl.billOfLadingNo?.trim()) errors.push("Thiếu số vận đơn");
  if (!decl.invoiceNo?.trim()) errors.push("Thiếu số hóa đơn");
  if (!decl.currency?.trim()) errors.push("Thiếu loại tiền");
  if (!lines.length) errors.push("Cần ít nhất 1 dòng hàng hóa");

  lines.forEach((l, i) => {
    if (!l.hsCode?.trim()) errors.push(`Dòng ${i + 1}: thiếu mã HS`);
    if (!l.description?.trim()) errors.push(`Dòng ${i + 1}: thiếu mô tả hàng`);
    if (!(l.quantity > 0)) errors.push(`Dòng ${i + 1}: số lượng phải > 0`);
  });

  return errors;
}

const procedureTypeSet = new Set(PROCEDURE_TYPE_OPTIONS.map((x) => x.value));
const transportModeSet = new Set(TRANSPORT_MODE_OPTIONS.map((x) => x.value));
const paymentMethodSet = new Set(PAYMENT_METHOD_OPTIONS.map((x) => x.value));
const incotermsSet = new Set(INCOTERMS_OPTIONS);

function push(
  out: ImportDeclarationPreflightCheck[],
  check: ImportDeclarationPreflightCheck
): void {
  out.push(check);
}

export function buildImportDeclarationPreflightReport(
  decl: ImportDeclaration,
  lines: ImportDeclarationLine[]
): ImportDeclarationPreflightReport {
  const checks: ImportDeclarationPreflightCheck[] = [];
  const errors = validateImportDeclaration(decl, lines);
  for (const message of errors) {
    push(checks, {
      code: "REQUIRED",
      severity: "error",
      message,
    });
  }

  const importerTaxCode = decl.importerTaxCode.trim();
  if (importerTaxCode && !/^\d{10}(\d{3})?$/.test(importerTaxCode)) {
    push(checks, {
      code: "IMPORTER_TAX_FORMAT",
      field: "importerTaxCode",
      severity: "error",
      message: "MST người nhập khẩu không đúng định dạng (10 hoặc 13 số).",
    });
  }

  if (decl.invoiceDate && decl.invoiceDate > new Date().toISOString().slice(0, 10)) {
    push(checks, {
      code: "INVOICE_DATE_FUTURE",
      field: "invoiceDate",
      severity: "error",
      message: "Ngày hóa đơn không được lớn hơn ngày hiện tại.",
    });
  }

  if (!procedureTypeSet.has(decl.procedureTypeCode)) {
    push(checks, {
      code: "PROCEDURE_TYPE_UNKNOWN",
      field: "procedureTypeCode",
      severity: "warning",
      message: `Mã loại hình "${decl.procedureTypeCode}" chưa có trong danh mục chuẩn đang cấu hình.`,
      detail: "Nếu là mã mới theo công văn HQ, hãy cập nhật danh mục mã trong hệ thống.",
    });
  }

  if (!transportModeSet.has(decl.transportModeCode)) {
    push(checks, {
      code: "TRANSPORT_MODE_UNKNOWN",
      field: "transportModeCode",
      severity: "warning",
      message: `Mã phương thức vận chuyển "${decl.transportModeCode}" chưa hợp lệ.`,
    });
  }

  if (!paymentMethodSet.has(decl.paymentMethodCode)) {
    push(checks, {
      code: "PAYMENT_METHOD_UNKNOWN",
      field: "paymentMethodCode",
      severity: "warning",
      message: `Mã phương thức thanh toán "${decl.paymentMethodCode}" chưa hợp lệ.`,
    });
  }

  if (!incotermsSet.has((decl.incoterms || "").toUpperCase())) {
    push(checks, {
      code: "INCOTERMS_UNKNOWN",
      field: "incoterms",
      severity: "warning",
      message: `Incoterms "${decl.incoterms}" không nằm trong bộ Incoterms chuẩn.`,
    });
  }

  if (decl.countryOfExport && !/^[A-Z]{2}$/.test(decl.countryOfExport.trim().toUpperCase())) {
    push(checks, {
      code: "COUNTRY_EXPORT_FORMAT",
      field: "countryOfExport",
      severity: "warning",
      message: "Nước xuất khẩu nên dùng mã ISO alpha-2 (VD: CN, KR, US).",
    });
  }
  if (decl.countryOfOrigin && !/^[A-Z]{2}$/.test(decl.countryOfOrigin.trim().toUpperCase())) {
    push(checks, {
      code: "COUNTRY_ORIGIN_FORMAT",
      field: "countryOfOrigin",
      severity: "warning",
      message: "Xuất xứ hàng nên dùng mã ISO alpha-2 (VD: CN, VN, JP).",
    });
  }

  if (decl.customsOfficeCode && !/^[A-Z0-9]{2,6}$/.test(decl.customsOfficeCode)) {
    push(checks, {
      code: "CUSTOMS_OFFICE_FORMAT",
      field: "customsOfficeCode",
      severity: "warning",
      message: "Mã chi cục HQ có định dạng bất thường (nên là mã chữ-số ngắn).",
    });
  }

  lines.forEach((line, idx) => {
    const hs = line.hsCode.trim();
    if (hs && !/^\d{8}(\d{2})?$/.test(hs)) {
      push(checks, {
        code: "HS_FORMAT",
        field: `lines[${idx}].hsCode`,
        severity: "error",
        message: `Dòng ${idx + 1}: mã HS "${hs}" phải là 8 hoặc 10 chữ số.`,
      });
    }
    if (line.unitPrice < 0) {
      push(checks, {
        code: "UNIT_PRICE_NEGATIVE",
        field: `lines[${idx}].unitPrice`,
        severity: "error",
        message: `Dòng ${idx + 1}: đơn giá không được âm.`,
      });
    }
  });

  const linesTotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  if (Math.abs(linesTotal - Number(decl.totalInvoiceValue || 0)) > 1) {
    push(checks, {
      code: "TOTAL_MISMATCH",
      field: "totalInvoiceValue",
      severity: "warning",
      message: "Tổng tiền hóa đơn lệch với tổng dòng hàng.",
      detail: `Tổng dòng hàng: ${linesTotal.toFixed(2)} vs tờ khai: ${decl.totalInvoiceValue.toFixed(2)}.`,
    });
  }

  return summarizePreflightChecks(checks);
}

export function summarizePreflightChecks(
  checks: ImportDeclarationPreflightCheck[]
): ImportDeclarationPreflightReport {
  const errorCount = checks.filter((c) => c.severity === "error").length;
  const warningCount = checks.filter((c) => c.severity === "warning").length;
  const infoCount = checks.filter((c) => c.severity === "info").length;
  return {
    summary: {
      readyToSend: errorCount === 0,
      errorCount,
      warningCount,
      infoCount,
    },
    checks,
  };
}
