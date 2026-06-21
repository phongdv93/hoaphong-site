import { tenantExecute, tenantQuery, tenantQueryOne } from "@/lib/db/tenant";
import { toLocalDateString } from "@/lib/dates";
import { decryptSecret, encryptSecret } from "./credentials-crypto";
import type {
  CustomsVnaccsProfile,
  ImportDeclaration,
  ImportDeclarationInput,
  ImportDeclarationLine,
  TransmissionLog,
  VnaccsProfileInput,
  VnaccsProcedure,
} from "./types";
import {
  getGatewayUrl,
  isSimulatedMode,
  testVnaccsConnection,
  transmitDeclaration,
  type VnaccsConnectionConfig,
} from "./vnaccs/client";
import {
  buildImportDeclarationPreflightReport,
  summarizePreflightChecks,
  validateImportDeclaration,
} from "./validation";
import { isVnaccsProfileConfigured } from "./profile";
import { verifyExternalReferences } from "./external-verify";
import { parseDeclarationMeta } from "./declaration-meta";
import { resolveIdaPreset } from "./ida-presets";

function mapProfile(row: Record<string, unknown>): CustomsVnaccsProfile {
  return {
    id: row.id as number,
    companyId: row.company_id as number,
    taxCode: String(row.tax_code ?? ""),
    companyName: String(row.company_name ?? ""),
    userCode: String(row.user_code ?? ""),
    terminalId: String(row.terminal_id ?? ""),
    hasUserPassword: Boolean(row.user_password_enc),
    hasTerminalAccessKey: Boolean(row.terminal_access_key_enc),
    declarantName: String(row.declarant_name ?? ""),
    declarantPhone: String(row.declarant_phone ?? ""),
    isTestMode: Boolean(row.is_test_mode),
    gatewayUrl: String(row.gateway_url ?? ""),
    signingCertThumbprint: String(row.signing_cert_thumbprint ?? ""),
    signingCertSubject: String(row.signing_cert_subject ?? ""),
    signingCertIssuer: String(row.signing_cert_issuer ?? ""),
    signingProvider: String(row.signing_provider ?? ""),
    lastConnectionOk: row.last_connection_ok == null ? null : Boolean(row.last_connection_ok),
    lastConnectionAt: row.last_connection_at ? String(row.last_connection_at) : null,
    lastConnectionMessage: String(row.last_connection_message ?? ""),
    updatedAt: String(row.updated_at),
  };
}

function taxFromNotes(notes: string): { importDutyCode: string; vatDutyCode: string } {
  const importDutyCode = notes.match(/duty=([A-Z0-9]+)/i)?.[1] ?? "";
  const vatDutyCode = notes.match(/vat=([A-Z0-9]+)/i)?.[1] ?? "";
  return { importDutyCode, vatDutyCode };
}

function mapLine(row: Record<string, unknown>): ImportDeclarationLine {
  const notes = String(row.notes ?? "");
  const fromNotes = taxFromNotes(notes);
  return {
    id: row.id as number,
    declarationId: row.declaration_id as number,
    lineNo: Number(row.line_no),
    hsCode: String(row.hs_code ?? ""),
    description: String(row.description ?? ""),
    quantity: Number(row.quantity),
    unitCode: String(row.unit_code ?? "PCE"),
    unitPrice: Number(row.unit_price),
    currency: String(row.currency ?? "USD"),
    originCountry: String(row.origin_country ?? ""),
    notes,
    importDutyCode: String(row.import_duty_code ?? fromNotes.importDutyCode),
    vatDutyCode: String(row.vat_duty_code ?? fromNotes.vatDutyCode),
  };
}

function mapDeclaration(row: Record<string, unknown>): ImportDeclaration {
  return {
    id: row.id as number,
    companyId: row.company_id as number,
    declarationNo: row.declaration_no ? String(row.declaration_no) : null,
    referenceCode: String(row.reference_code ?? ""),
    status: row.status as ImportDeclaration["status"],
    procedure: row.procedure as ImportDeclaration["procedure"],
    channel: row.channel as ImportDeclaration["channel"],
    procedureTypeCode: String(row.procedure_type_code ?? ""),
    importerTaxCode: String(row.importer_tax_code ?? ""),
    importerName: String(row.importer_name ?? ""),
    declarantTaxCode: String(row.declarant_tax_code ?? ""),
    customsOfficeCode: String(row.customs_office_code ?? ""),
    borderGateCode: String(row.border_gate_code ?? ""),
    loadingPortCode: String(row.loading_port_code ?? ""),
    transportModeCode: String(row.transport_mode_code ?? "1"),
    billOfLadingNo: String(row.bill_of_lading_no ?? ""),
    invoiceNo: String(row.invoice_no ?? ""),
    invoiceDate: toLocalDateString(row.invoice_date),
    contractNo: String(row.contract_no ?? ""),
    incoterms: String(row.incoterms ?? "CIF"),
    currency: String(row.currency ?? "USD"),
    exchangeRate: Number(row.exchange_rate ?? 1),
    totalInvoiceValue: Number(row.total_invoice_value ?? 0),
    freightAmount: Number(row.freight_amount ?? 0),
    insuranceAmount: Number(row.insurance_amount ?? 0),
    countryOfExport: String(row.country_of_export ?? ""),
    countryOfOrigin: String(row.country_of_origin ?? ""),
    expectedArrivalDate: toLocalDateString(row.expected_arrival_date),
    warehouseCode: String(row.warehouse_code ?? ""),
    paymentMethodCode: String(row.payment_method_code ?? "L"),
    idaRegistrationNo: row.ida_registration_no ? String(row.ida_registration_no) : null,
    customsMessage: String(row.customs_message ?? ""),
    submittedAt: row.submitted_at ? String(row.submitted_at) : null,
    acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
    createdBy: (row.created_by as number | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    meta: parseDeclarationMeta(row.declaration_meta),
  };
}

async function getProfileSecrets(
  companyId: number
): Promise<VnaccsConnectionConfig | null> {
  const row = await tenantQueryOne<Record<string, unknown>>(
    `SELECT * FROM customs_vnaccs_profiles WHERE company_id = $1`,
    [companyId],
    companyId
  );
  if (!row) return null;
  const profileRow = await tenantQueryOne<{ gateway_url: string }>(
    `SELECT gateway_url FROM customs_vnaccs_profiles WHERE company_id = $1`,
    [companyId],
    companyId
  );
  const savedGateway = String(profileRow?.gateway_url ?? "").trim();
  return {
    gatewayUrl: savedGateway || getGatewayUrl(),
    userCode: String(row.user_code ?? ""),
    userPassword: row.user_password_enc
      ? decryptSecret(String(row.user_password_enc))
      : "",
    terminalId: String(row.terminal_id ?? ""),
    terminalAccessKey: row.terminal_access_key_enc
      ? decryptSecret(String(row.terminal_access_key_enc))
      : "",
    testMode: Boolean(row.is_test_mode),
  };
}

async function ensureDeclarationColumns(companyId: number): Promise<void> {
  try {
    await tenantExecute(
      `ALTER TABLE customs_import_declarations ADD COLUMN IF NOT EXISTS loading_port_code TEXT NOT NULL DEFAULT ''`,
      [],
      companyId
    );
    await tenantExecute(
      `ALTER TABLE customs_import_declarations ADD COLUMN IF NOT EXISTS declaration_meta JSONB NOT NULL DEFAULT '{}'`,
      [],
      companyId
    );
    await tenantExecute(
      `ALTER TABLE customs_import_declaration_lines ADD COLUMN IF NOT EXISTS import_duty_code TEXT NOT NULL DEFAULT ''`,
      [],
      companyId
    );
    await tenantExecute(
      `ALTER TABLE customs_import_declaration_lines ADD COLUMN IF NOT EXISTS vat_duty_code TEXT NOT NULL DEFAULT ''`,
      [],
      companyId
    );
  } catch {
    /* bảng chưa tạo */
  }
}

async function ensureCustomsProfileColumns(companyId: number): Promise<void> {
  try {
    await tenantExecute(
      `ALTER TABLE customs_vnaccs_profiles ADD COLUMN IF NOT EXISTS gateway_url TEXT NOT NULL DEFAULT ''`,
      [],
      companyId
    );
    await tenantExecute(
      `ALTER TABLE customs_vnaccs_profiles ADD COLUMN IF NOT EXISTS signing_cert_thumbprint TEXT NOT NULL DEFAULT ''`,
      [],
      companyId
    );
    await tenantExecute(
      `ALTER TABLE customs_vnaccs_profiles ADD COLUMN IF NOT EXISTS signing_cert_subject TEXT NOT NULL DEFAULT ''`,
      [],
      companyId
    );
    await tenantExecute(
      `ALTER TABLE customs_vnaccs_profiles ADD COLUMN IF NOT EXISTS signing_cert_issuer TEXT NOT NULL DEFAULT ''`,
      [],
      companyId
    );
    await tenantExecute(
      `ALTER TABLE customs_vnaccs_profiles ADD COLUMN IF NOT EXISTS signing_provider TEXT NOT NULL DEFAULT ''`,
      [],
      companyId
    );
  } catch {
    /* bảng chưa tạo — cần chạy schema-tenant.sql trên DB tenant */
  }
}

export async function getVnaccsProfile(
  companyId: number
): Promise<CustomsVnaccsProfile | null> {
  await ensureCustomsProfileColumns(companyId);
  const row = await tenantQueryOne<Record<string, unknown>>(
    `SELECT * FROM customs_vnaccs_profiles WHERE company_id = $1`,
    [companyId],
    companyId
  );
  return row ? mapProfile(row) : null;
}

export async function upsertVnaccsProfile(
  companyId: number,
  input: VnaccsProfileInput
): Promise<CustomsVnaccsProfile> {
  const existing = await tenantQueryOne<{ id: number }>(
    `SELECT id FROM customs_vnaccs_profiles WHERE company_id = $1`,
    [companyId],
    companyId
  );

  const pwdEnc = input.userPassword ? encryptSecret(input.userPassword) : undefined;
  const keyEnc = input.terminalAccessKey
    ? encryptSecret(input.terminalAccessKey)
    : undefined;

  if (!existing) {
    if (!input.userPassword?.trim() || !input.terminalAccessKey?.trim()) {
      throw new Error(
        "Lần đầu cần nhập đủ Password VNACCS và Terminal Access Key — sau đó hệ thống giữ mãi, không cần nhập lại."
      );
    }
  }

  const gatewayUrl = (input.gatewayUrl ?? "").trim();
  const signingCertThumbprint = (input.signingCertThumbprint ?? "").trim();
  const signingCertSubject = (input.signingCertSubject ?? "").trim();
  const signingCertIssuer = (input.signingCertIssuer ?? "").trim();
  const signingProvider = (input.signingProvider ?? "").trim();

  if (existing) {
    await tenantExecute(
      `UPDATE customs_vnaccs_profiles SET
         tax_code = $1, company_name = $2, user_code = $3,
         user_password_enc = COALESCE($4, user_password_enc),
         terminal_id = $5,
         terminal_access_key_enc = COALESCE($6, terminal_access_key_enc),
         declarant_name = $7, declarant_phone = $8,
         is_test_mode = $9, gateway_url = $10,
         signing_cert_thumbprint = $11, signing_cert_subject = $12,
         signing_cert_issuer = $13, signing_provider = $14,
         updated_at = NOW()
       WHERE company_id = $15`,
      [
        input.taxCode.trim(),
        input.companyName.trim(),
        input.userCode.trim(),
        pwdEnc ?? null,
        input.terminalId.trim(),
        keyEnc ?? null,
        input.declarantName ?? "",
        input.declarantPhone ?? "",
        input.isTestMode ?? false,
        gatewayUrl,
        signingCertThumbprint,
        signingCertSubject,
        signingCertIssuer,
        signingProvider,
        companyId,
      ],
      companyId
    );
  } else {
    await tenantExecute(
      `INSERT INTO customs_vnaccs_profiles
       (company_id, tax_code, company_name, user_code, user_password_enc, terminal_id,
        terminal_access_key_enc, declarant_name, declarant_phone, is_test_mode, gateway_url,
        signing_cert_thumbprint, signing_cert_subject, signing_cert_issuer, signing_provider)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        companyId,
        input.taxCode.trim(),
        input.companyName.trim(),
        input.userCode.trim(),
        encryptSecret(input.userPassword!.trim()),
        input.terminalId.trim(),
        encryptSecret(input.terminalAccessKey!.trim()),
        input.declarantName ?? "",
        input.declarantPhone ?? "",
        input.isTestMode ?? false,
        gatewayUrl,
        signingCertThumbprint,
        signingCertSubject,
        signingCertIssuer,
        signingProvider,
      ],
      companyId
    );
  }

  const profile = (await getVnaccsProfile(companyId))!;
  const cfg = await getProfileSecrets(companyId);
  if (cfg) {
    const test = await testVnaccsConnection(cfg);
    await tenantExecute(
      `UPDATE customs_vnaccs_profiles SET
         last_connection_ok = $1, last_connection_at = NOW(),
         last_connection_message = $2, updated_at = NOW()
       WHERE company_id = $3`,
      [test.ok, test.message, companyId],
      companyId
    );
  }
  return (await getVnaccsProfile(companyId)) ?? profile;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  simulated: boolean;
}

/** Kiểm tra kết nối gateway / chế độ mô phỏng; ghi kết quả vào profile. */
export async function testVnaccsProfileConnection(
  companyId: number,
  draft?: Partial<VnaccsProfileInput>
): Promise<ConnectionTestResult> {
  const profile = await getVnaccsProfile(companyId);
  const saved = await getProfileSecrets(companyId);

  const userCode = draft?.userCode?.trim() || saved?.userCode || profile?.userCode || "";
  const terminalId = draft?.terminalId?.trim() || saved?.terminalId || profile?.terminalId || "";
  const gatewayUrl =
    (draft?.gatewayUrl ?? "").trim() ||
    saved?.gatewayUrl ||
    getGatewayUrl();
  const testMode = draft?.isTestMode ?? profile?.isTestMode ?? true;

  const userPassword = draft?.userPassword?.trim() || saved?.userPassword || "";
  const terminalAccessKey = draft?.terminalAccessKey?.trim() || saved?.terminalAccessKey || "";

  if (!userCode || !terminalId) {
    return {
      ok: false,
      message: "Thiếu User Code hoặc Terminal ID.",
      simulated: false,
    };
  }
  if (!userPassword || !terminalAccessKey) {
    return {
      ok: false,
      message:
        "Chưa có Password / Terminal Access Key trong DB. Lưu cấu hình lần đầu hoặc nhập tạm để test.",
      simulated: false,
    };
  }

  const cfg: VnaccsConnectionConfig = {
    gatewayUrl,
    userCode,
    userPassword,
    terminalId,
    terminalAccessKey,
    testMode,
  };

  const simulated = isSimulatedMode(cfg);
  const test = await testVnaccsConnection(cfg);

  if (profile) {
    await tenantExecute(
      `UPDATE customs_vnaccs_profiles SET
         last_connection_ok = $1, last_connection_at = NOW(),
         last_connection_message = $2, updated_at = NOW()
       WHERE company_id = $3`,
      [test.ok, test.message, companyId],
      companyId
    );
  }

  return { ok: test.ok, message: test.message, simulated };
}

export async function listImportDeclarations(
  companyId: number
): Promise<ImportDeclaration[]> {
  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT * FROM customs_import_declarations
     WHERE company_id = $1
     ORDER BY updated_at DESC, id DESC`,
    [companyId],
    companyId
  );
  return rows.map(mapDeclaration);
}

export async function getImportDeclaration(
  id: number,
  companyId: number
): Promise<ImportDeclaration | null> {
  await ensureDeclarationColumns(companyId);
  const row = await tenantQueryOne<Record<string, unknown>>(
    `SELECT * FROM customs_import_declarations WHERE id = $1 AND company_id = $2`,
    [id, companyId],
    companyId
  );
  if (!row) return null;
  const decl = mapDeclaration(row);
  const lines = await listDeclarationLines(id, companyId);
  return { ...decl, lines };
}

async function listDeclarationLines(
  declarationId: number,
  companyId: number
): Promise<ImportDeclarationLine[]> {
  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT l.* FROM customs_import_declaration_lines l
     JOIN customs_import_declarations d ON d.id = l.declaration_id
     WHERE l.declaration_id = $1 AND d.company_id = $2
     ORDER BY l.line_no`,
    [declarationId, companyId],
    companyId
  );
  return rows.map(mapLine);
}

function nextRefCode(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const t = String(Date.now()).slice(-4);
  return `NK-${y}${m}${day}-${t}`;
}

export async function createImportDeclaration(
  companyId: number,
  input: ImportDeclarationInput,
  createdBy: number | null
): Promise<number> {
  const profile = await getVnaccsProfile(companyId);
  const row = await tenantQueryOne<{ id: number }>(
    `INSERT INTO customs_import_declarations (
       company_id, reference_code, importer_tax_code, importer_name,
       declarant_tax_code, procedure_type_code, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [
      companyId,
      input.referenceCode?.trim() || nextRefCode(),
      input.importerTaxCode?.trim() || profile?.taxCode || "",
      input.importerName?.trim() || profile?.companyName || "",
      input.declarantTaxCode?.trim() || profile?.taxCode || "",
      input.procedureTypeCode?.trim() || "A11",
      createdBy,
    ],
    companyId
  );
  const id = row!.id;
  if (input.lines?.length) {
    await replaceLines(id, companyId, input.lines);
  }
  return id;
}

export async function createImportDeclarationFromPreset(
  companyId: number,
  presetId: string,
  createdBy: number | null
): Promise<number> {
  const profile = await getVnaccsProfile(companyId);
  const preset = resolveIdaPreset(presetId, {
    taxCode: profile?.taxCode,
    companyName: profile?.companyName,
  });
  if (!preset) throw new Error("Mẫu tờ khai không tồn tại");
  const id = await createImportDeclaration(companyId, preset.input, createdBy);
  await updateImportDeclaration(id, companyId, {
    ...preset.input,
    meta: preset.meta,
    lines: preset.input.lines,
  });
  return id;
}

export async function updateImportDeclaration(
  id: number,
  companyId: number,
  input: ImportDeclarationInput
): Promise<void> {
  await ensureDeclarationColumns(companyId);
  const cur = await getImportDeclaration(id, companyId);
  if (!cur) throw new Error("Không tìm thấy tờ khai");
  if (!["draft", "validated", "rejected"].includes(cur.status)) {
    throw new Error("Tờ khai đã gửi — không sửa được");
  }

  await tenantExecute(
    `UPDATE customs_import_declarations SET
       reference_code = COALESCE($1, reference_code),
       procedure_type_code = COALESCE($2, procedure_type_code),
       importer_tax_code = COALESCE($3, importer_tax_code),
       importer_name = COALESCE($4, importer_name),
       declarant_tax_code = COALESCE($5, declarant_tax_code),
       customs_office_code = COALESCE($6, customs_office_code),
       border_gate_code = COALESCE($7, border_gate_code),
       loading_port_code = COALESCE($8, loading_port_code),
       transport_mode_code = COALESCE($9, transport_mode_code),
       bill_of_lading_no = COALESCE($10, bill_of_lading_no),
       invoice_no = COALESCE($11, invoice_no),
       invoice_date = COALESCE($12, invoice_date),
       contract_no = COALESCE($13, contract_no),
       incoterms = COALESCE($14, incoterms),
       currency = COALESCE($15, currency),
       exchange_rate = COALESCE($16, exchange_rate),
       total_invoice_value = COALESCE($17, total_invoice_value),
       freight_amount = COALESCE($18, freight_amount),
       insurance_amount = COALESCE($19, insurance_amount),
       country_of_export = COALESCE($20, country_of_export),
       country_of_origin = COALESCE($21, country_of_origin),
       expected_arrival_date = COALESCE($22, expected_arrival_date),
       warehouse_code = COALESCE($23, warehouse_code),
       payment_method_code = COALESCE($24, payment_method_code),
       declaration_meta = COALESCE($25::jsonb, declaration_meta),
       status = 'draft',
       updated_at = NOW()
     WHERE id = $26 AND company_id = $27`,
    [
      input.referenceCode ?? null,
      input.procedureTypeCode ?? null,
      input.importerTaxCode ?? null,
      input.importerName ?? null,
      input.declarantTaxCode ?? null,
      input.customsOfficeCode ?? null,
      input.borderGateCode ?? null,
      input.loadingPortCode ?? null,
      input.transportModeCode ?? null,
      input.billOfLadingNo ?? null,
      input.invoiceNo ?? null,
      toLocalDateString(input.invoiceDate),
      input.contractNo ?? null,
      input.incoterms ?? null,
      input.currency ?? null,
      input.exchangeRate ?? null,
      input.totalInvoiceValue ?? null,
      input.freightAmount ?? null,
      input.insuranceAmount ?? null,
      input.countryOfExport ?? null,
      input.countryOfOrigin ?? null,
      toLocalDateString(input.expectedArrivalDate),
      input.warehouseCode ?? null,
      input.paymentMethodCode ?? null,
      input.meta ? JSON.stringify(input.meta) : null,
      id,
      companyId,
    ],
    companyId
  );

  if (input.lines) {
    await replaceLines(id, companyId, input.lines);
  }
}

async function replaceLines(
  declarationId: number,
  companyId: number,
  lines: Omit<ImportDeclarationLine, "id" | "declarationId">[]
): Promise<void> {
  await tenantExecute(
    `DELETE FROM customs_import_declaration_lines
     WHERE declaration_id = $1`,
    [declarationId],
    companyId
  );
  let n = 1;
  for (const l of lines) {
    await tenantExecute(
      `INSERT INTO customs_import_declaration_lines
       (declaration_id, line_no, hs_code, description, quantity, unit_code, unit_price, currency, origin_country, notes, import_duty_code, vat_duty_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        declarationId,
        l.lineNo || n,
        l.hsCode,
        l.description,
        l.quantity,
        l.unitCode || "PCE",
        l.unitPrice,
        l.currency || "USD",
        l.originCountry || "",
        l.notes || "",
        l.importDutyCode ?? taxFromNotes(l.notes || "").importDutyCode,
        l.vatDutyCode ?? taxFromNotes(l.notes || "").vatDutyCode,
      ],
      companyId
    );
    n++;
  }
  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  await tenantExecute(
    `UPDATE customs_import_declarations SET total_invoice_value = $1, updated_at = NOW()
     WHERE id = $2`,
    [total, declarationId],
    companyId
  );
}

export async function validateDeclarationRecord(
  id: number,
  companyId: number
): Promise<string[]> {
  const decl = await getImportDeclaration(id, companyId);
  if (!decl) return ["Không tìm thấy tờ khai"];
  return validateImportDeclaration(decl, decl.lines ?? []);
}

export async function getDeclarationPreflightReport(
  id: number,
  companyId: number
) {
  const decl = await getImportDeclaration(id, companyId);
  if (!decl) throw new Error("Không tìm thấy tờ khai");
  const base = buildImportDeclarationPreflightReport(decl, decl.lines ?? []);
  const externalChecks = await verifyExternalReferences(decl);
  return summarizePreflightChecks([...base.checks, ...externalChecks]);
}

export async function markDeclarationValidated(id: number, companyId: number): Promise<void> {
  const errors = await validateDeclarationRecord(id, companyId);
  if (errors.length) throw new Error(errors.join("; "));
  await tenantExecute(
    `UPDATE customs_import_declarations SET status = 'validated', updated_at = NOW()
     WHERE id = $1 AND company_id = $2`,
    [id, companyId],
    companyId
  );
}

export async function transmitImportDeclaration(
  id: number,
  companyId: number,
  procedure: VnaccsProcedure
): Promise<ImportDeclaration> {
  const profile = await getVnaccsProfile(companyId);
  if (!isVnaccsProfileConfigured(profile)) {
    throw new Error(
      "Chưa cấu hình VNACCS đầy đủ. Vào ERP → Xuất nhập khẩu → Cấu hình VNACCS và lưu một lần."
    );
  }
  const cfg = await getProfileSecrets(companyId);
  if (!cfg) throw new Error("Chưa cấu hình VNACCS — vào Cấu hình VNACCS");

  const decl = await getImportDeclaration(id, companyId);
  if (!decl) throw new Error("Không tìm thấy tờ khai");
  const lines = decl.lines ?? [];

  const errors = validateImportDeclaration(decl, lines);
  if (errors.length) throw new Error(errors.join("; "));

  if (procedure === "IDC" && !decl.idaRegistrationNo) {
    throw new Error("Cần gửi IDA và có số đăng ký trước khi khai IDC");
  }

  await tenantExecute(
    `UPDATE customs_import_declarations SET status = 'transmitting', procedure = $1, updated_at = NOW()
     WHERE id = $2`,
    [procedure, id],
    companyId
  );

  const result = await transmitDeclaration(cfg, procedure, decl, lines);

  await tenantExecute(
    `INSERT INTO customs_transmission_logs
     (declaration_id, procedure, success, request_summary, response_summary, customs_ref_no, error_message)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      id,
      procedure,
      result.success,
      `${procedure} ${decl.referenceCode}`,
      result.message.slice(0, 2000),
      result.idaRegistrationNo || result.declarationNo || null,
      result.success ? "" : result.message,
    ],
    companyId
  );

  if (!result.success) {
    await tenantExecute(
      `UPDATE customs_import_declarations SET status = 'rejected', customs_message = $1, updated_at = NOW()
       WHERE id = $2`,
      [result.message, id],
      companyId
    );
    throw new Error(result.message);
  }

  const simulated = isSimulatedMode(cfg);
  await tenantExecute(
    `UPDATE customs_import_declarations SET
       status = $1,
       declaration_no = COALESCE($2, declaration_no),
       ida_registration_no = COALESCE($3, ida_registration_no),
       channel = $4,
       customs_message = $5,
       submitted_at = NOW(),
       accepted_at = CASE WHEN $1 = 'accepted' THEN NOW() ELSE accepted_at END,
       updated_at = NOW()
     WHERE id = $6`,
    [
      simulated ? "accepted" : "submitted",
      result.declarationNo || null,
      result.idaRegistrationNo || null,
      result.channel ?? "unknown",
      result.message + (simulated ? " [MÔ PHỎNG]" : ""),
      id,
    ],
    companyId
  );

  return (await getImportDeclaration(id, companyId))!;
}

export async function listTransmissionLogs(
  declarationId: number,
  companyId: number
): Promise<TransmissionLog[]> {
  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT t.* FROM customs_transmission_logs t
     JOIN customs_import_declarations d ON d.id = t.declaration_id
     WHERE t.declaration_id = $1 AND d.company_id = $2
     ORDER BY t.created_at DESC`,
    [declarationId, companyId],
    companyId
  );
  return rows.map((row) => ({
    id: row.id as number,
    declarationId: row.declaration_id as number,
    procedure: row.procedure as TransmissionLog["procedure"],
    success: Boolean(row.success),
    httpStatus: row.http_status == null ? null : Number(row.http_status),
    requestSummary: String(row.request_summary ?? ""),
    responseSummary: String(row.response_summary ?? ""),
    customsRefNo: row.customs_ref_no ? String(row.customs_ref_no) : null,
    errorCode: row.error_code ? String(row.error_code) : null,
    errorMessage: String(row.error_message ?? ""),
    createdAt: String(row.created_at),
  }));
}

export async function deleteImportDeclaration(id: number, companyId: number): Promise<void> {
  const cur = await getImportDeclaration(id, companyId);
  if (!cur) throw new Error("Không tìm thấy tờ khai");
  if (!["draft", "validated", "rejected"].includes(cur.status)) {
    throw new Error("Chỉ xóa được tờ khai nháp / bị từ chối");
  }
  await tenantExecute(
    `DELETE FROM customs_import_declarations WHERE id = $1 AND company_id = $2`,
    [id, companyId],
    companyId
  );
}
