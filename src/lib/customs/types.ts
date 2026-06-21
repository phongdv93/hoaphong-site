import type { DeclarationMeta } from "./declaration-meta";

/** Nghiệp vụ VNACCS — nhập khẩu */
export type VnaccsProcedure = "IDA" | "IDB" | "IDC" | "IDA01" | "IDE";

export type DeclarationStatus =
  | "draft"
  | "validated"
  | "transmitting"
  | "submitted"
  | "accepted"
  | "rejected"
  | "cancelled";

/** Luồng phân luồng HQ */
export type CustomsChannel = "green" | "yellow" | "red" | "unknown";

export interface CustomsVnaccsProfile {
  id: number;
  companyId: number;
  taxCode: string;
  companyName: string;
  userCode: string;
  terminalId: string;
  /** Đã cấu hình mật khẩu / access key (không trả plain text) */
  hasUserPassword: boolean;
  hasTerminalAccessKey: boolean;
  declarantName: string;
  declarantPhone: string;
  isTestMode: boolean;
  /** URL gateway riêng công ty (nếu có), ưu tiên hơn biến môi trường server */
  gatewayUrl: string;
  signingCertThumbprint: string;
  signingCertSubject: string;
  signingCertIssuer: string;
  signingProvider: string;
  lastConnectionOk: boolean | null;
  lastConnectionAt: string | null;
  lastConnectionMessage: string;
  updatedAt: string;
}

export interface ImportDeclarationLine {
  id: number;
  declarationId: number;
  lineNo: number;
  hsCode: string;
  description: string;
  quantity: number;
  unitCode: string;
  unitPrice: number;
  currency: string;
  originCountry: string;
  notes: string;
  importDutyCode: string;
  vatDutyCode: string;
}

export interface ImportDeclaration {
  id: number;
  companyId: number;
  declarationNo: string | null;
  /** Số tham chiếu nội bộ */
  referenceCode: string;
  status: DeclarationStatus;
  procedure: VnaccsProcedure;
  channel: CustomsChannel;
  /** Loại hình NK */
  procedureTypeCode: string;
  importerTaxCode: string;
  importerName: string;
  declarantTaxCode: string;
  customsOfficeCode: string;
  borderGateCode: string;
  /** Cảng / địa điểm xếp hàng tại nước xuất (UN/LOCODE hoặc mã cảng) */
  loadingPortCode: string;
  transportModeCode: string;
  billOfLadingNo: string;
  invoiceNo: string;
  invoiceDate: string | null;
  contractNo: string;
  incoterms: string;
  currency: string;
  exchangeRate: number;
  totalInvoiceValue: number;
  freightAmount: number;
  insuranceAmount: number;
  countryOfExport: string;
  countryOfOrigin: string;
  expectedArrivalDate: string | null;
  warehouseCode: string;
  paymentMethodCode: string;
  idaRegistrationNo: string | null;
  customsMessage: string;
  submittedAt: string | null;
  acceptedAt: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  meta: DeclarationMeta;
  lines?: ImportDeclarationLine[];
}

export interface TransmissionLog {
  id: number;
  declarationId: number;
  procedure: VnaccsProcedure;
  success: boolean;
  httpStatus: number | null;
  requestSummary: string;
  responseSummary: string;
  customsRefNo: string | null;
  errorCode: string | null;
  errorMessage: string;
  createdAt: string;
}

export interface ImportDeclarationInput {
  referenceCode?: string;
  procedure?: VnaccsProcedure;
  procedureTypeCode?: string;
  importerTaxCode?: string;
  importerName?: string;
  declarantTaxCode?: string;
  customsOfficeCode?: string;
  borderGateCode?: string;
  loadingPortCode?: string;
  transportModeCode?: string;
  billOfLadingNo?: string;
  invoiceNo?: string;
  invoiceDate?: string | null;
  contractNo?: string;
  incoterms?: string;
  currency?: string;
  exchangeRate?: number;
  totalInvoiceValue?: number;
  freightAmount?: number;
  insuranceAmount?: number;
  countryOfExport?: string;
  countryOfOrigin?: string;
  expectedArrivalDate?: string | null;
  warehouseCode?: string;
  paymentMethodCode?: string;
  meta?: DeclarationMeta;
  lines?: Omit<ImportDeclarationLine, "id" | "declarationId">[];
}

export type { DeclarationMeta };

export interface VnaccsProfileInput {
  taxCode: string;
  companyName: string;
  userCode: string;
  userPassword?: string;
  terminalId: string;
  terminalAccessKey?: string;
  declarantName?: string;
  declarantPhone?: string;
  isTestMode?: boolean;
  gatewayUrl?: string;
  signingCertThumbprint?: string;
  signingCertSubject?: string;
  signingCertIssuer?: string;
  signingProvider?: string;
}

export interface SigningCertificateInfo {
  thumbprint: string;
  subject: string;
  issuer: string;
  serialNumber: string;
  provider: string;
  notBefore: string;
  notAfter: string;
  hasPrivateKey: boolean;
}

export interface TransmitResult {
  success: boolean;
  procedure: VnaccsProcedure;
  declarationNo?: string;
  idaRegistrationNo?: string;
  channel?: CustomsChannel;
  message: string;
  rawResponse?: unknown;
}

export type PreflightSeverity = "error" | "warning" | "info";

export interface ImportDeclarationPreflightCheck {
  code: string;
  field?: string;
  severity: PreflightSeverity;
  message: string;
  detail?: string;
}

export interface ImportDeclarationPreflightReport {
  summary: {
    readyToSend: boolean;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  checks: ImportDeclarationPreflightCheck[];
}
