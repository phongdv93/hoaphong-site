export type EInvoiceDirection = "out" | "in";

export interface MobifoneInvoiceProfile {
  id: number;
  companyId: number;
  apiUsername: string;
  hasApiPassword: boolean;
  maDvcs: string;
  isTestMode: boolean;
  lastConnectionOk: boolean | null;
  lastConnectionAt: string | null;
  lastConnectionMessage: string;
  lastSyncAt: string | null;
  lastSyncMessage: string;
  updatedAt: string;
}

export interface MobifoneProfileInput {
  apiUsername: string;
  apiPassword?: string;
  isTestMode?: boolean;
}

export interface CompanyEinvoiceContext {
  id: number;
  name: string;
  taxCode: string;
  address: string;
  phone: string;
  email: string;
}

export interface EInvoiceRecord {
  id: number;
  companyId: number;
  direction: EInvoiceDirection;
  mobifoneId: string;
  invoiceSeries: string;
  invoiceNo: string;
  invoiceDate: string | null;
  counterpartyName: string;
  counterpartyTaxCode: string;
  totalBeforeTax: number;
  totalTax: number;
  totalAmount: number;
  currency: string;
  statusText: string;
  taxAuthorityCode: string;
  syncedAt: string;
  updatedAt: string;
}

export interface MobifoneLoginResult {
  token: string;
  maDvcs: string;
  wbUserId?: string;
}

export interface MobifoneInvoiceRaw {
  hdon_id?: string;
  khieu?: string;
  shdon?: string;
  tdlap?: string;
  nlap?: string;
  ten?: string;
  mst?: string;
  tgtcthue?: number;
  tgtthue?: number;
  tgtttbso?: number;
  dvtte?: string;
  tthai?: string;
  mccqthue?: string;
  [key: string]: unknown;
}
