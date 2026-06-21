import type { DeclarationMeta } from "./declaration-meta";
import type { ImportDeclarationInput } from "./types";

export const IDA_PRESET_HQS4324 = "hqs4324-260508";

export interface IdaPresetBundle {
  id: string;
  label: string;
  input: ImportDeclarationInput;
  meta: DeclarationMeta;
}

/** Lô 1 — HQS4324 260508 (hướng dẫn khai HQ thực tế). */
export function getIdaPresetHqs4324(profile?: {
  taxCode?: string;
  companyName?: string;
}): IdaPresetBundle {
  const meta: DeclarationMeta = {
    partyClassification: "4",
    exporterName: "SHANGHAI HONGQING INDUSTRY CO. LTD.",
    exporterAddress: "",
    exporterCountry: "CN",
    exporterPhone: "",
    importerAddress: "Số 10, Đường TL13, Phường An Phú Đông, Tp.HCM",
    importerPhone: "0938373086",
    packageCount: 1,
    grossWeightKg: 3.3,
    paymentRemark: "PTTT: TT",
    invoiceClassification: "A",
    valuationClassification: "6",
    taxDeadlineCode: "D",
    transportMeansName: "HANG KHONG",
  };

  return {
    id: IDA_PRESET_HQS4324,
    label: "Lô HQS4324 260508 (FedEx / lọc khí)",
    input: {
      referenceCode: "HQS4324-260508",
      procedure: "IDA",
      procedureTypeCode: "A11",
      customsOfficeCode: "06DS",
      warehouseCode: "06DSEDA",
      borderGateCode: "SGN",
      loadingPortCode: "CNPVG",
      transportModeCode: "1",
      importerTaxCode: profile?.taxCode ?? "0318313318",
      importerName:
        profile?.companyName?.toUpperCase() ??
        "CÔNG TY TNHH THƯƠNG MẠI ĐẦU TƯ HOA PHONG",
      billOfLadingNo: "871784628955",
      invoiceNo: "HQS4324-260508",
      incoterms: "CPT",
      currency: "USD",
      exchangeRate: 1,
      countryOfExport: "CN",
      countryOfOrigin: "CN",
      expectedArrivalDate: "2026-05-19",
      paymentMethodCode: "KC",
      totalInvoiceValue: 1775,
      freightAmount: 0,
      insuranceAmount: 0,
      lines: [
        {
          lineNo: 1,
          hsCode: "8421399000",
          description:
            "Lõi lọc khí (bộ phận của máy thổi khí), model: MSL-125, cấp độ lọc: 05μm, áp suất làm việc: 1.0MPa, nhiệt độ chịu đựng: 70°C. Nhà SX: Kexing Hangzhou Blower. Hàng mới 100%",
          quantity: 5,
          unitCode: "PCE",
          unitPrice: 355,
          currency: "USD",
          originCountry: "CN",
          notes: "duty=B01;vat=V",
          importDutyCode: "B01",
          vatDutyCode: "V",
        },
      ],
    },
    meta,
  };
}

export function resolveIdaPreset(
  presetId: string,
  profile?: { taxCode?: string; companyName?: string }
): IdaPresetBundle | null {
  if (presetId === IDA_PRESET_HQS4324) return getIdaPresetHqs4324(profile);
  return null;
}
