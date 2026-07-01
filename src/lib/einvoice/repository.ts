import { tenantExecute, tenantQuery, tenantQueryOne } from "@/lib/db/tenant";
import { toLocalDateString } from "@/lib/dates";
import { decryptSecret, encryptSecret } from "@/lib/customs/credentials-crypto";
import { getCompany } from "@/lib/projects/companies";
import {
  getMobifoneBaseUrl,
  mobifoneDownloadInvoicePdf,
  mobifoneGetInvoiceById,
  mobifoneListInvoices,
  mobifoneLogin,
  testMobifoneConnection,
} from "./client";
import { isMobifoneProfileConfigured } from "./profile";
import type {
  CompanyEinvoiceContext,
  EInvoiceRecord,
  MobifoneInvoiceProfile,
  MobifoneInvoiceRaw,
  MobifoneProfileInput,
} from "./types";

function mapProfile(
  row: Record<string, unknown>,
  taxCode: string
): MobifoneInvoiceProfile {
  const isTestMode = Boolean(row.is_test_mode);
  const apiBaseUrl = String(row.api_base_url ?? "");
  return {
    id: row.id as number,
    companyId: row.company_id as number,
    apiUsername: String(row.api_username ?? ""),
    hasApiPassword: Boolean(row.api_password_enc),
    apiBaseUrl,
    resolvedBaseUrl: getMobifoneBaseUrl(isTestMode, taxCode, apiBaseUrl),
    maDvcs: String(row.ma_dvcs ?? ""),
    isTestMode,
    lastConnectionOk: row.last_connection_ok == null ? null : Boolean(row.last_connection_ok),
    lastConnectionAt: row.last_connection_at ? String(row.last_connection_at) : null,
    lastConnectionMessage: String(row.last_connection_message ?? ""),
    lastSyncAt: row.last_sync_at ? String(row.last_sync_at) : null,
    lastSyncMessage: String(row.last_sync_message ?? ""),
    updatedAt: String(row.updated_at),
  };
}

function mapInvoice(row: Record<string, unknown>): EInvoiceRecord {
  return {
    id: row.id as number,
    companyId: row.company_id as number,
    direction: row.direction as EInvoiceRecord["direction"],
    mobifoneId: String(row.mobifone_id ?? ""),
    invoiceSeries: String(row.invoice_series ?? ""),
    invoiceNo: String(row.invoice_no ?? ""),
    invoiceDate: toLocalDateString(row.invoice_date),
    counterpartyName: String(row.counterparty_name ?? ""),
    counterpartyTaxCode: String(row.counterparty_tax_code ?? ""),
    totalBeforeTax: Number(row.total_before_tax ?? 0),
    totalTax: Number(row.total_tax ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    currency: String(row.currency ?? "VND"),
    statusText: String(row.status_text ?? ""),
    taxAuthorityCode: String(row.tax_authority_code ?? ""),
    lookupCode: String(row.lookup_code ?? ""),
    syncedAt: String(row.synced_at),
    updatedAt: String(row.updated_at),
  };
}

function mapInvoiceDetail(row: Record<string, unknown>): EInvoiceRecord {
  const base = mapInvoice(row);
  const raw = row.raw_json;
  if (raw && typeof raw === "object") {
    base.rawJson = raw as Record<string, unknown>;
  }
  return base;
}

function parseInvoiceDate(raw: MobifoneInvoiceRaw): string | null {
  const src = String(raw.tdlap ?? raw.nlap ?? "").trim();
  if (!src) return null;
  return src.slice(0, 10);
}

function mapRawToUpsert(
  companyId: number,
  raw: MobifoneInvoiceRaw
): {
  mobifoneId: string;
  values: unknown[];
} | null {
  const mobifoneId = String(raw.hdon_id ?? "").trim();
  if (!mobifoneId) return null;
  return {
    mobifoneId,
    values: [
      companyId,
      "out",
      mobifoneId,
      String(raw.khieu ?? ""),
      String(raw.shdon ?? ""),
      parseInvoiceDate(raw),
      String(raw.ten ?? ""),
      String(raw.mst ?? ""),
      Number(raw.tgtcthue ?? 0),
      Number(raw.tgtthue ?? 0),
      Number(raw.tgtttbso ?? 0),
      String(raw.dvtte ?? "VND"),
      String(raw.tthai ?? ""),
      String(raw.mccqthue ?? ""),
      String(raw.sbmat ?? ""),
      JSON.stringify(raw),
    ],
  };
}

export async function getCompanyEinvoiceContext(
  companyId: number
): Promise<CompanyEinvoiceContext | null> {
  const company = await getCompany(companyId);
  if (!company) return null;
  return {
    id: company.id,
    name: company.name,
    taxCode: company.taxCode,
    address: company.address,
    phone: company.phone,
    email: company.email,
  };
}

async function loadClientSecrets(companyId: number): Promise<{
  profile: MobifoneInvoiceProfile;
  password: string;
  taxCode: string;
} | null> {
  const row = await tenantQueryOne<Record<string, unknown>>(
    `SELECT * FROM mobifone_invoice_profiles WHERE company_id = $1`,
    [companyId],
    companyId
  );
  if (!row) return null;
  const company = await getCompany(companyId);
  if (!company?.taxCode?.trim()) return null;
  return {
    profile: mapProfile(row, company.taxCode.trim()),
    password: row.api_password_enc ? decryptSecret(String(row.api_password_enc)) : "",
    taxCode: company.taxCode.trim(),
  };
}

function buildClientConfig(
  profile: MobifoneInvoiceProfile,
  password: string,
  taxCode: string
) {
  return {
    baseUrl: profile.resolvedBaseUrl || getMobifoneBaseUrl(profile.isTestMode, taxCode, profile.apiBaseUrl),
    username: profile.apiUsername,
    password,
    taxCode,
    maDvcs: profile.maDvcs,
  };
}

async function loginClient(companyId: number) {
  const secrets = await loadClientSecrets(companyId);
  if (!secrets || !isMobifoneProfileConfigured(secrets.profile)) {
    throw new Error("Chưa cấu hình MobiFone Invoice — vào Cấu hình trước.");
  }
  const config = buildClientConfig(secrets.profile, secrets.password, secrets.taxCode);
  const login = await mobifoneLogin(config);
  if (!login.ok) throw new Error(login.message);
  return { secrets, config, login };
}

export async function getMobifoneProfile(
  companyId: number
): Promise<MobifoneInvoiceProfile | null> {
  const row = await tenantQueryOne<Record<string, unknown>>(
    `SELECT * FROM mobifone_invoice_profiles WHERE company_id = $1`,
    [companyId],
    companyId
  );
  if (!row) return null;
  const company = await getCompany(companyId);
  return mapProfile(row, company?.taxCode?.trim() ?? "");
}

export async function upsertMobifoneProfile(
  companyId: number,
  input: MobifoneProfileInput
): Promise<MobifoneInvoiceProfile> {
  const company = await getCompany(companyId);
  if (!company?.taxCode?.trim()) {
    throw new Error("Công ty chưa có mã số thuế — cập nhật hồ sơ công ty trước.");
  }
  if (!input.apiUsername?.trim()) {
    throw new Error("Nhập tài khoản MobiFone Invoice.");
  }

  const existing = await tenantQueryOne<{ id: number }>(
    `SELECT id FROM mobifone_invoice_profiles WHERE company_id = $1`,
    [companyId],
    companyId
  );

  const pwdEnc = input.apiPassword ? encryptSecret(input.apiPassword) : undefined;
  if (!existing && !input.apiPassword?.trim()) {
    throw new Error("Lần đầu cần nhập mật khẩu MobiFone — sau đó hệ thống giữ mãi.");
  }

  let maDvcs = "";
  if (input.apiPassword?.trim() || !existing) {
    const test = await testMobifoneProfileConnection(companyId, input);
    if (!test.ok) throw new Error(test.message);
    maDvcs = test.maDvcs ?? "";
  }

  if (existing) {
    await tenantExecute(
      `UPDATE mobifone_invoice_profiles SET
         api_username = $1,
         api_password_enc = COALESCE($2, api_password_enc),
         api_base_url = $3,
         ma_dvcs = CASE WHEN $4 <> '' THEN $4 ELSE ma_dvcs END,
         is_test_mode = $5,
         updated_at = NOW()
       WHERE company_id = $6`,
      [
        input.apiUsername.trim(),
        pwdEnc ?? null,
        (input.apiBaseUrl ?? "").trim(),
        maDvcs,
        input.isTestMode ?? false,
        companyId,
      ],
      companyId
    );
  } else {
    await tenantExecute(
      `INSERT INTO mobifone_invoice_profiles
       (company_id, api_username, api_password_enc, api_base_url, ma_dvcs, is_test_mode)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        companyId,
        input.apiUsername.trim(),
        encryptSecret(input.apiPassword!.trim()),
        (input.apiBaseUrl ?? "").trim(),
        maDvcs,
        input.isTestMode ?? true,
      ],
      companyId
    );
  }

  return (await getMobifoneProfile(companyId))!;
}

export async function testMobifoneProfileConnection(
  companyId: number,
  draft?: Partial<MobifoneProfileInput>
): Promise<{ ok: boolean; message: string; maDvcs?: string; simulated?: boolean }> {
  const company = await getCompany(companyId);
  if (!company?.taxCode?.trim()) {
    return { ok: false, message: "Công ty chưa có mã số thuế." };
  }

  const stored = await loadClientSecrets(companyId);
  const username = (draft?.apiUsername ?? stored?.profile.apiUsername ?? "").trim();
  const password = draft?.apiPassword?.trim() || stored?.password || "";
  const isTestMode = draft?.isTestMode ?? stored?.profile?.isTestMode ?? true;
  const apiBaseUrl = (draft?.apiBaseUrl ?? stored?.profile?.apiBaseUrl ?? "").trim();

  if (!username || !password) {
    return { ok: false, message: "Nhập tài khoản và mật khẩu MobiFone." };
  }

  const result = await testMobifoneConnection({
    baseUrl: getMobifoneBaseUrl(isTestMode, company.taxCode.trim(), apiBaseUrl),
    username,
    password,
    taxCode: company.taxCode.trim(),
    maDvcs: stored?.profile.maDvcs,
  });

  if (stored?.profile) {
    await tenantExecute(
      `UPDATE mobifone_invoice_profiles SET
         last_connection_ok = $1,
         last_connection_at = NOW(),
         last_connection_message = $2,
         ma_dvcs = CASE WHEN $3 <> '' THEN $3 ELSE ma_dvcs END,
         updated_at = NOW()
       WHERE company_id = $4`,
      [result.ok, result.message, result.maDvcs ?? "", companyId],
      companyId
    );
  }

  return result;
}

export async function syncMobifoneOutInvoices(
  companyId: number,
  fromDate: string,
  toDate: string
): Promise<{ synced: number; message: string }> {
  const { config, login } = await loginClient(companyId);

  const list = await mobifoneListInvoices(
    {
      ...config,
      token: login.data.token,
      maDvcs: login.data.maDvcs || config.maDvcs || "",
    },
    fromDate,
    toDate
  );
  if (!list.ok) {
    throw new Error(list.message);
  }

  let synced = 0;
  for (const raw of list.items) {
    const mapped = mapRawToUpsert(companyId, raw);
    if (!mapped) continue;
    await tenantExecute(
      `INSERT INTO e_invoices
       (company_id, direction, mobifone_id, invoice_series, invoice_no, invoice_date,
        counterparty_name, counterparty_tax_code, total_before_tax, total_tax, total_amount,
        currency, status_text, tax_authority_code, lookup_code, raw_json, synced_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,NOW(),NOW())
       ON CONFLICT (company_id, mobifone_id) DO UPDATE SET
         invoice_series = EXCLUDED.invoice_series,
         invoice_no = EXCLUDED.invoice_no,
         invoice_date = EXCLUDED.invoice_date,
         counterparty_name = EXCLUDED.counterparty_name,
         counterparty_tax_code = EXCLUDED.counterparty_tax_code,
         total_before_tax = EXCLUDED.total_before_tax,
         total_tax = EXCLUDED.total_tax,
         total_amount = EXCLUDED.total_amount,
         currency = EXCLUDED.currency,
         status_text = EXCLUDED.status_text,
         tax_authority_code = EXCLUDED.tax_authority_code,
         lookup_code = EXCLUDED.lookup_code,
         raw_json = EXCLUDED.raw_json,
         synced_at = NOW(),
         updated_at = NOW()`,
      mapped.values,
      companyId
    );
    synced += 1;
  }

  const message = `Đồng bộ ${synced} hóa đơn bán ra (${fromDate} → ${toDate}).`;
  await tenantExecute(
    `UPDATE mobifone_invoice_profiles SET
       last_sync_at = NOW(),
       last_sync_message = $1,
       ma_dvcs = CASE WHEN $2 <> '' THEN $2 ELSE ma_dvcs END,
       updated_at = NOW()
     WHERE company_id = $3`,
    [message, login.data.maDvcs, companyId],
    companyId
  );

  return { synced, message };
}

export async function listEInvoices(
  companyId: number,
  opts?: { direction?: string; limit?: number; offset?: number }
): Promise<EInvoiceRecord[]> {
  const direction = opts?.direction?.trim();
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500);
  const offset = Math.max(opts?.offset ?? 0, 0);

  const params: unknown[] = [companyId];
  let where = "WHERE company_id = $1";
  if (direction === "out" || direction === "in") {
    params.push(direction);
    where += ` AND direction = $${params.length}`;
  }
  params.push(limit, offset);

  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT * FROM e_invoices ${where}
     ORDER BY invoice_date DESC NULLS LAST, updated_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
    companyId
  );
  return rows.map(mapInvoice);
}

export async function getEInvoice(
  companyId: number,
  id: number
): Promise<EInvoiceRecord | null> {
  const row = await tenantQueryOne<Record<string, unknown>>(
    `SELECT * FROM e_invoices WHERE company_id = $1 AND id = $2`,
    [companyId, id],
    companyId
  );
  return row ? mapInvoiceDetail(row) : null;
}

export async function refreshEInvoiceFromMobifone(
  companyId: number,
  id: number
): Promise<EInvoiceRecord> {
  const existing = await getEInvoice(companyId, id);
  if (!existing) throw new Error("Không tìm thấy hóa đơn");

  const { config, login } = await loginClient(companyId);
  const remote = await mobifoneGetInvoiceById(
    {
      ...config,
      token: login.data.token,
      maDvcs: login.data.maDvcs || config.maDvcs || "",
    },
    existing.mobifoneId
  );
  if (!remote.ok) throw new Error(remote.message);

  const mapped = mapRawToUpsert(companyId, remote.invoice);
  if (!mapped) throw new Error("Dữ liệu hóa đơn không hợp lệ");

  await tenantExecute(
    `INSERT INTO e_invoices
     (company_id, direction, mobifone_id, invoice_series, invoice_no, invoice_date,
      counterparty_name, counterparty_tax_code, total_before_tax, total_tax, total_amount,
      currency, status_text, tax_authority_code, lookup_code, raw_json, synced_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,NOW(),NOW())
     ON CONFLICT (company_id, mobifone_id) DO UPDATE SET
       invoice_series = EXCLUDED.invoice_series,
       invoice_no = EXCLUDED.invoice_no,
       invoice_date = EXCLUDED.invoice_date,
       counterparty_name = EXCLUDED.counterparty_name,
       counterparty_tax_code = EXCLUDED.counterparty_tax_code,
       total_before_tax = EXCLUDED.total_before_tax,
       total_tax = EXCLUDED.total_tax,
       total_amount = EXCLUDED.total_amount,
       currency = EXCLUDED.currency,
       status_text = EXCLUDED.status_text,
       tax_authority_code = EXCLUDED.tax_authority_code,
       lookup_code = EXCLUDED.lookup_code,
       raw_json = EXCLUDED.raw_json,
       synced_at = NOW(),
       updated_at = NOW()`,
    mapped.values,
    companyId
  );

  return (await getEInvoice(companyId, id))!;
}

export async function downloadEInvoicePdf(
  companyId: number,
  id: number
): Promise<{ data: ArrayBuffer; contentType: string; filename: string }> {
  const inv = await getEInvoice(companyId, id);
  if (!inv) throw new Error("Không tìm thấy hóa đơn");

  const { config, login } = await loginClient(companyId);
  const pdf = await mobifoneDownloadInvoicePdf(
    {
      ...config,
      token: login.data.token,
      maDvcs: login.data.maDvcs || config.maDvcs || "",
    },
    inv.mobifoneId
  );
  if (!pdf.ok) throw new Error(pdf.message);

  const filename = `HĐ-${inv.invoiceSeries}-${inv.invoiceNo}.pdf`.replace(/[^\w.\-]+/g, "_");
  return { data: pdf.data, contentType: pdf.contentType, filename };
}
