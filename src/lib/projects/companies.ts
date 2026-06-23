import { cookies } from "next/headers";

import {

  platformExecute,

  platformQuery,

  platformQueryOne,

  platformWithTransaction,

} from "@/lib/db/platform";

import { ensureCompanyHasTenant, provisionTenantDatabase } from "@/lib/db/provision";
import { syncTenantUser } from "@/lib/db/sync-tenant-user";
import { countTenantProjects } from "@/lib/db/tenant";

import { isUltimateAdmin } from "@/lib/access/company-context";

import { isHoaphongPremium, PREMIUM_ONLY_MESSAGE } from "@/lib/platform/premium";

import { seedDefaultModulesForCompany } from "@/lib/platform/access";
import { normalizeTaxCode } from "@/lib/company-verify/tax-code";

import type {

  Company,

  CompanyMember,

  CompanyMemberRole,

  CompanyMemberStatus,

  CompanyStatus,

  CompanySummary,

} from "./types";



const ACTIVE_COMPANY_COOKIE = "hoaphong_active_company";



function mapCompany(row: Record<string, unknown>): Company {

  return {

    id: row.id as number,

    code: row.code as string,

    subdomain: ((row.subdomain as string) || (row.code as string)).trim(),

    name: row.name as string,

    shortName: (row.short_name as string) ?? "",

    taxCode: (row.tax_code as string) ?? "",

    phone: (row.phone as string) ?? "",

    email: (row.email as string) ?? "",

    address: (row.address as string) ?? "",

    logoUrl: (row.logo_url as string) ?? "",

    websiteUrl: (row.website_url as string) ?? "",

    status: row.status as CompanyStatus,

    notes: (row.notes as string) ?? "",

    createdBy: (row.created_by as number | null) ?? null,

    tenantDbName: (row.tenant_db_name as string) ?? "",

    tenantDbUrl: (row.tenant_db_url as string | null) ?? null,

    createdAt: String(row.created_at),

    updatedAt: String(row.updated_at),

  };

}



function mapMember(row: Record<string, unknown>): CompanyMember {

  return {

    companyId: row.company_id as number,

    userId: row.user_id as number,

    userName: (row.user_name as string | undefined) ?? undefined,

    userEmail: (row.user_email as string | undefined) ?? undefined,

    userAvatarUrl: (row.user_avatar_url as string | null | undefined) ?? null,

    role: row.role as CompanyMemberRole,

    status: (row.status as CompanyMemberStatus | undefined) ?? "active",

    departmentId: (row.department_id as string | null | undefined) ?? null,

    joinedAt: String(row.joined_at),

  };

}



async function attachProjectCounts<T extends CompanySummary>(rows: T[]): Promise<T[]> {

  const out: T[] = [];

  for (const r of rows) {

    let projectCount = 0;

    if (r.tenantDbName) {

      try {

        projectCount = await countTenantProjects(r.id);

      } catch {

        projectCount = 0;

      }

    }

    out.push({ ...r, projectCount });

  }

  return out;

}



export async function listMyCompanies(userId: number): Promise<CompanySummary[]> {

  const rows = await platformQuery<Record<string, unknown>>(

    `SELECT c.*, m.role AS my_role,

            (SELECT COUNT(*) FROM company_members cm WHERE cm.company_id = c.id) AS member_count

     FROM companies c

     JOIN company_members m ON m.company_id = c.id AND m.user_id = $1 AND m.status = 'active'

     ORDER BY c.name`,

    [userId]

  );

  const mapped = rows.map((r) => ({

    ...mapCompany(r),

    myRole: r.my_role as CompanyMemberRole,

    memberCount: Number(r.member_count ?? 0),

    projectCount: 0,

  }));

  return attachProjectCounts(mapped);

}



export async function getCompany(id: number): Promise<Company | null> {

  const row = await platformQueryOne<Record<string, unknown>>(

    `SELECT * FROM companies WHERE id = $1`,

    [id]

  );

  return row ? mapCompany(row) : null;

}



export async function getCompanyByCode(code: string): Promise<Company | null> {
  const key = code.trim().toLowerCase();
  const digits = normalizeTaxCode(code);

  const row = await platformQueryOne<Record<string, unknown>>(
    `SELECT * FROM companies
     WHERE LOWER(code) = $1
        OR LOWER(subdomain) = $1
        OR ($2 <> '' AND REGEXP_REPLACE(tax_code, '[^0-9]', '', 'g') = $2)
     LIMIT 1`,
    [key, digits]
  );

  return row ? mapCompany(row) : null;
}



export async function getCompanyBySubdomain(subdomain: string): Promise<Company | null> {
  const key = subdomain.trim().toLowerCase();
  const digits = normalizeTaxCode(subdomain);

  const row = await platformQueryOne<Record<string, unknown>>(
    `SELECT * FROM companies
     WHERE LOWER(subdomain) = $1
        OR LOWER(code) = $1
        OR ($2 <> '' AND REGEXP_REPLACE(tax_code, '[^0-9]', '', 'g') = $2)
     LIMIT 1`,
    [key, digits]
  );

  return row ? mapCompany(row) : null;
}



async function resolveNewCompanyCode(input: {
  code?: string;
  name: string;
  taxCode?: string;
}): Promise<string> {
  if (input.code?.trim()) return input.code.trim();

  const mst = normalizeTaxCode(input.taxCode ?? "");
  if (mst.length >= 10) {
    const dup = await platformQueryOne<{ id: number }>(
      `SELECT id FROM companies
       WHERE code = $1 OR REGEXP_REPLACE(tax_code, '[^0-9]', '', 'g') = $1`,
      [mst]
    );
    if (dup) throw new Error("Mã số thuế đã được đăng ký cho công ty khác");
    return mst;
  }

  return nextCompanyCode(input.name);
}

async function nextCompanyCode(name: string): Promise<string> {

  const base =

    name

      .toLowerCase()

      .normalize("NFD")

      .replace(/[\u0300-\u036f]/g, "")

      .replace(/đ/g, "d")

      .replace(/[^a-z0-9]+/g, "-")

      .replace(/(^-|-$)/g, "")

      .slice(0, 24) || "cty";

  let candidate = base;

  for (let i = 2; ; i++) {

    const existing = await platformQueryOne<{ id: number }>(

      `SELECT id FROM companies WHERE code = $1`,

      [candidate]

    );

    if (!existing) return candidate;

    candidate = `${base}-${i}`;

  }

}



/** Tạo công ty + provision tenant DB. Thành viên & module chỉ khi actor là Hoa Phong Premium. */

export async function createCompany(input: {

  code?: string;

  name: string;

  shortName?: string;

  taxCode?: string;

  phone?: string;

  email?: string;

  address?: string;

  logoUrl?: string;

  notes?: string;

  createdBy: number;

  /** Đăng ký tự phục vụ tại /erp/register — không cần Hoa Phong Premium */
  selfService?: boolean;

}): Promise<number> {

  const code = await resolveNewCompanyCode(input);



  const id = await platformWithTransaction(async (client) => {

    const res = await client.query<{ id: number }>(

      `INSERT INTO companies

        (code, subdomain, name, short_name, tax_code, phone, email, address, logo_url, status, notes, created_by, tenant_db_name)

       VALUES ($1,$1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10,'') RETURNING id`,

      [

        code,

        input.name.trim(),

        input.shortName || "",

        input.taxCode || "",

        input.phone || "",

        input.email || "",

        input.address || "",

        input.logoUrl || "",

        input.notes || "",

        input.createdBy,

      ]

    );

    return res.rows[0].id;

  });



  await provisionTenantDatabase(id, code);



  if (input.selfService || (await isHoaphongPremium(input.createdBy))) {

    await upsertCompanyMember(id, input.createdBy, "admin", {
      actorUserId: input.createdBy,
      bypassPremium: Boolean(input.selfService),
    });

    await seedDefaultModulesForCompany(id, input.createdBy, {
      bypassPremium: Boolean(input.selfService),
    });

  }



  return id;

}



export async function updateCompany(

  id: number,

  input: Partial<Omit<Company, "id" | "createdAt" | "updatedAt" | "createdBy" | "tenantDbName" | "tenantDbUrl">>

): Promise<void> {

  const cur = await getCompany(id);

  if (!cur) throw new Error("Không tìm thấy công ty");

  await platformExecute(

    `UPDATE companies SET

       code=$1, name=$2, short_name=$3, tax_code=$4, phone=$5, email=$6,

       address=$7, logo_url=$8, website_url=$9, status=$10, notes=$11, updated_at=NOW()

     WHERE id=$12`,

    [

      input.code ?? cur.code,

      input.name ?? cur.name,

      input.shortName ?? cur.shortName,

      input.taxCode ?? cur.taxCode,

      input.phone ?? cur.phone,

      input.email ?? cur.email,

      input.address ?? cur.address,

      input.logoUrl ?? cur.logoUrl,

      input.websiteUrl ?? cur.websiteUrl,

      input.status ?? cur.status,

      input.notes ?? cur.notes,

      id,

    ]

  );

}



export async function listCompanyMembers(companyId: number): Promise<CompanyMember[]> {

  const rows = await platformQuery<Record<string, unknown>>(

    `SELECT m.*, u.name AS user_name, u.email AS user_email, u.avatar_url AS user_avatar_url

     FROM company_members m

     JOIN users u ON u.id = m.user_id

     WHERE m.company_id = $1

     ORDER BY

       CASE m.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END,

       CASE m.role WHEN 'admin' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END,

       u.name`,

    [companyId]

  );

  return rows.map(mapMember);

}



export async function getCompanyMembership(

  companyId: number,

  userId: number

): Promise<Pick<CompanyMember, "role" | "status" | "departmentId"> | null> {

  const row = await platformQueryOne<{

    role: CompanyMemberRole;

    status: CompanyMemberStatus;

    department_id: string | null;

  }>(

    `SELECT role, status, department_id FROM company_members WHERE company_id = $1 AND user_id = $2`,

    [companyId, userId]

  );

  if (!row) return null;

  return {

    role: row.role,

    status: row.status ?? "active",

    departmentId: row.department_id,

  };

}



export async function getCompanyRole(

  companyId: number,

  userId: number

): Promise<CompanyMemberRole | null> {

  const m = await getCompanyMembership(companyId, userId);

  if (!m || m.status !== "active") return null;

  return m.role;

}



export async function upsertCompanyMember(

  companyId: number,

  userId: number,

  role: CompanyMemberRole,

  opts?: { actorUserId?: number; bypassPremium?: boolean }

): Promise<void> {

  if (!opts?.bypassPremium) {
    const actorId = opts?.actorUserId;
    let allowed = false;
    if (actorId != null) {
      if (await isHoaphongPremium(actorId)) {
        allowed = true;
      } else {
        const actorRole = await getCompanyRole(companyId, actorId);
        if (actorRole === "admin") allowed = true;
      }
    }
    if (!allowed) {
      throw new Error(PREMIUM_ONLY_MESSAGE);
    }
  }

  await ensureCompanyHasTenant(companyId);

  await platformExecute(

    `INSERT INTO company_members (company_id, user_id, role, status)

     VALUES ($1,$2,$3,'active')

     ON CONFLICT (company_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active'`,

    [companyId, userId, role]

  );

  await syncTenantUser(companyId, userId);

}



export async function removeCompanyMember(

  companyId: number,

  userId: number,

  actorUserId: number

): Promise<void> {

  let allowed = false;

  if (await isHoaphongPremium(actorUserId)) {

    allowed = true;

  } else {

    const actorRole = await getCompanyRole(companyId, actorUserId);

    if (actorRole === "admin") allowed = true;

  }

  if (!allowed) {

    throw new Error(PREMIUM_ONLY_MESSAGE);

  }

  await platformExecute(

    `DELETE FROM company_member_modules WHERE company_id = $1 AND user_id = $2`,

    [companyId, userId]

  );

  await platformExecute(

    `DELETE FROM company_members WHERE company_id = $1 AND user_id = $2`,

    [companyId, userId]

  );

}



export async function getActiveCompanyId(): Promise<number | null> {

  const c = await cookies();

  const raw = c.get(ACTIVE_COMPANY_COOKIE)?.value;

  if (!raw) return null;

  const n = parseInt(raw, 10);

  return Number.isFinite(n) ? n : null;

}



export async function setActiveCompanyId(id: number | null): Promise<void> {

  const c = await cookies();

  if (id == null) {

    c.delete(ACTIVE_COMPANY_COOKIE);

    return;

  }

  c.set(ACTIVE_COMPANY_COOKIE, String(id), {

    httpOnly: false,

    sameSite: "lax",

    path: "/",

    maxAge: 60 * 60 * 24 * 365,

  });

}



export async function resolveActiveCompanyForUser(

  userId: number

): Promise<{ companyId: number; role: CompanyMemberRole } | null> {

  const ultimate = await isUltimateAdmin(userId);

  const cookieId = await getActiveCompanyId();



  if (cookieId) {

    const company = await getCompany(cookieId);

    if (company) {

      await ensureCompanyHasTenant(cookieId);

      if (ultimate) return { companyId: cookieId, role: "admin" };

      const role = await getCompanyRole(cookieId, userId);

      if (role) return { companyId: cookieId, role };

    }

  }



  if (ultimate) {

    const row = await platformQueryOne<{ id: number }>(

      `SELECT id FROM companies ORDER BY name LIMIT 1`

    );

    if (row) {

      await ensureCompanyHasTenant(row.id);

      return { companyId: row.id, role: "admin" };

    }

    return null;

  }



  const row = await platformQueryOne<{ company_id: number; role: CompanyMemberRole }>(

    `SELECT company_id, role FROM company_members WHERE user_id = $1 AND status = 'active' ORDER BY joined_at LIMIT 1`,

    [userId]

  );

  if (!row) return null;

  await ensureCompanyHasTenant(row.company_id);

  return { companyId: row.company_id, role: row.role };

}



export { ACTIVE_COMPANY_COOKIE };


