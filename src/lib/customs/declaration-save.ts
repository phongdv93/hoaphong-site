import type { DeclarationMeta } from "./declaration-meta";
import { toLocalDateString } from "@/lib/dates";
import type { ImportDeclaration, ImportDeclarationInput, ImportDeclarationLine } from "./types";

/** Payload PUT sạch — tránh gửi id/status và chuỗi rỗng làm hỏng cột DATE. */
export function buildDeclarationSavePayload(
  decl: ImportDeclaration,
  meta: DeclarationMeta,
  lines: ImportDeclarationLine[]
): ImportDeclarationInput {
  return {
    referenceCode: decl.referenceCode,
    procedure: decl.procedure,
    procedureTypeCode: decl.procedureTypeCode,
    importerTaxCode: decl.importerTaxCode,
    importerName: decl.importerName,
    declarantTaxCode: decl.declarantTaxCode,
    customsOfficeCode: decl.customsOfficeCode,
    borderGateCode: decl.borderGateCode,
    loadingPortCode: decl.loadingPortCode,
    transportModeCode: decl.transportModeCode,
    billOfLadingNo: decl.billOfLadingNo,
    invoiceNo: decl.invoiceNo,
    invoiceDate: toLocalDateString(decl.invoiceDate),
    contractNo: decl.contractNo,
    incoterms: decl.incoterms,
    currency: decl.currency,
    exchangeRate: decl.exchangeRate,
    totalInvoiceValue: decl.totalInvoiceValue,
    freightAmount: decl.freightAmount,
    insuranceAmount: decl.insuranceAmount,
    countryOfExport: decl.countryOfExport,
    countryOfOrigin: decl.countryOfOrigin,
    expectedArrivalDate: toLocalDateString(decl.expectedArrivalDate),
    warehouseCode: decl.warehouseCode,
    paymentMethodCode: decl.paymentMethodCode,
    meta,
    lines: lines.map((l, i) => ({
      lineNo: i + 1,
      hsCode: l.hsCode,
      description: l.description,
      quantity: l.quantity,
      unitCode: l.unitCode,
      unitPrice: l.unitPrice,
      currency: l.currency,
      originCountry: l.originCountry,
      notes: l.notes,
      importDutyCode: l.importDutyCode,
      vatDutyCode: l.vatDutyCode,
    })),
  };
}
