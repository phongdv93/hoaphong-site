import { platformQuery, platformQueryOne } from "@/lib/db/platform";

export type RegistrationRequestStatus =
  | "pending"
  | "auto_approved"
  | "approved"
  | "rejected";

export interface RegistrationRequestRow {
  id: number;
  companyName: string;
  taxCode: string;
  phone: string;
  address: string;
  adminName: string;
  adminEmail: string;
  status: RegistrationRequestStatus;
  verifyDetails: Record<string, unknown>;
  rejectionReason: string | null;
  companyId: number | null;
  createdAt: string;
  processedAt: string | null;
}

export async function logRegistrationRequest(input: {
  companyName: string;
  taxCode: string;
  phone: string;
  address: string;
  adminName: string;
  adminEmail: string;
  status: RegistrationRequestStatus;
  verifyDetails: Record<string, unknown>;
  rejectionReason?: string;
  companyId?: number;
}): Promise<number> {
  const row = await platformQueryOne<{ id: number }>(
    `INSERT INTO company_registration_requests
      (company_name, tax_code, phone, address, admin_name, admin_email, status,
       verify_details, rejection_reason, company_id, processed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10, CASE WHEN $7 IN ('auto_approved','approved','rejected') THEN NOW() ELSE NULL END)
     RETURNING id`,
    [
      input.companyName,
      input.taxCode,
      input.phone,
      input.address,
      input.adminName,
      input.adminEmail.toLowerCase(),
      input.status,
      JSON.stringify(input.verifyDetails),
      input.rejectionReason ?? null,
      input.companyId ?? null,
    ]
  );
  return row!.id;
}

export async function hasDuplicateTaxRegistration(taxCode: string): Promise<{
  duplicate: boolean;
  reason?: string;
}> {
  const inCompany = await platformQueryOne<{ id: number; name: string; status: string }>(
    `SELECT id, name, status FROM companies
     WHERE REGEXP_REPLACE(tax_code, '[^0-9]', '', 'g') LIKE $1 || '%'
       AND TRIM(tax_code) <> ''
     LIMIT 1`,
    [taxCode]
  );
  if (inCompany) {
    return {
      duplicate: true,
      reason: `MST đã đăng ký công ty "${inCompany.name}" trên hệ thống`,
    };
  }

  const pending = await platformQueryOne<{ id: number }>(
    `SELECT id FROM company_registration_requests
     WHERE REGEXP_REPLACE(tax_code, '[^0-9]', '', 'g') = $1
       AND status IN ('pending', 'auto_approved', 'approved')
       AND created_at > NOW() - INTERVAL '30 days'
     LIMIT 1`,
    [taxCode]
  );
  if (pending) {
    return {
      duplicate: true,
      reason: "MST này đã có hồ sơ đăng ký gần đây trên hệ thống",
    };
  }

  return { duplicate: false };
}

export async function listRegistrationRequests(limit = 50): Promise<RegistrationRequestRow[]> {
  const rows = await platformQuery<Record<string, unknown>>(
    `SELECT id, company_name, tax_code, phone, address, admin_name, admin_email,
            status, verify_details, rejection_reason, company_id, created_at, processed_at
     FROM company_registration_requests
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({
    id: r.id as number,
    companyName: r.company_name as string,
    taxCode: r.tax_code as string,
    phone: r.phone as string,
    address: r.address as string,
    adminName: r.admin_name as string,
    adminEmail: r.admin_email as string,
    status: r.status as RegistrationRequestStatus,
    verifyDetails: (r.verify_details as Record<string, unknown>) ?? {},
    rejectionReason: (r.rejection_reason as string | null) ?? null,
    companyId: (r.company_id as number | null) ?? null,
    createdAt: String(r.created_at),
    processedAt: r.processed_at ? String(r.processed_at) : null,
  }));
}
