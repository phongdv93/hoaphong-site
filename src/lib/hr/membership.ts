import { hashPassword } from "@/lib/auth";
import { getCompany, getCompanyMembership, listCompanyMembers } from "@/lib/projects/companies";
import { platformExecute, platformQueryOne, platformWithTransaction } from "@/lib/db/platform";
import { syncTenantUser } from "@/lib/db/sync-tenant-user";
import { sendEmployeeRegisteredEmail, sendMemberApprovedEmail } from "@/lib/mail";
import { getActiveModuleIds } from "@/lib/platform/access";
import { setMemberModuleIds } from "@/lib/platform/member-modules";
import { companyErpLoginUrl } from "@/lib/tenant-host";
import type { CompanyMember, CompanyMemberRole, CompanyMemberStatus } from "@/lib/projects/types";

export interface RegisterEmployeeInput {
  companyId: number;
  name: string;
  email: string;
  password: string;
  departmentId?: string;
  requestHost?: string;
}

export async function registerEmployeeForCompany(
  input: RegisterEmployeeInput
): Promise<{ userId: number; email: string; name: string; status: CompanyMemberStatus }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const password = input.password;

  if (!email || !name) throw new Error("Tên và email bắt buộc");
  if (password.length < 6) throw new Error("Mật khẩu phải ≥ 6 ký tự");

  const company = await getCompany(input.companyId);
  if (!company || company.status !== "active") {
    throw new Error("Công ty không tồn tại hoặc đã ngưng hoạt động");
  }

  const existingUser = await platformQueryOne<{ id: number }>(
    `SELECT id FROM users WHERE LOWER(email) = $1`,
    [email]
  );

  if (existingUser) {
    const membership = await getCompanyMembership(input.companyId, existingUser.id);
    if (membership) {
      if (membership.status === "pending") {
        throw new Error("Email này đã đăng ký và đang chờ admin duyệt");
      }
      if (membership.status === "active") {
        throw new Error("Email này đã là thành viên công ty — hãy đăng nhập");
      }
    }
  }

  let userId = existingUser?.id ?? 0;
  const passwordHash = await hashPassword(password);

  const hasActiveMembershipElsewhere = userId
    ? await platformQueryOne<{ ok: number }>(
        `SELECT 1 AS ok FROM company_members
         WHERE user_id = $1 AND status = 'active' AND company_id != $2
         LIMIT 1`,
        [userId, input.companyId]
      )
    : null;

  await platformWithTransaction(async (client) => {
    if (!userId) {
      const u = await client.query<{ id: number }>(
        `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id`,
        [email, passwordHash, name]
      );
      userId = u.rows[0].id;
    } else if (!hasActiveMembershipElsewhere) {
      // Tài khoản mồ côi / chỉ bị từ chối — cập nhật mật khẩu user chọn
      await client.query(`UPDATE users SET password_hash = $1, name = $2 WHERE id = $3`, [
        passwordHash,
        name,
        userId,
      ]);
    } else {
      await client.query(`UPDATE users SET name = $1 WHERE id = $2`, [name, userId]);
    }

    await client.query(
      `INSERT INTO company_members (company_id, user_id, role, status, department_id)
       VALUES ($1, $2, 'member', 'pending', $3)
       ON CONFLICT (company_id, user_id) DO UPDATE SET
         status = 'pending',
         department_id = COALESCE(EXCLUDED.department_id, company_members.department_id),
         role = CASE WHEN company_members.status = 'rejected' THEN 'member' ELSE company_members.role END`,
      [input.companyId, userId, input.departmentId || null]
    );
  });

  const loginUrl = companyErpLoginUrl(company.subdomain, input.requestHost);
  void sendEmployeeRegisteredEmail({
    to: email,
    name,
    companyName: company.name,
    loginUrl,
  });

  return { userId, email, name, status: "pending" };
}

export async function approveCompanyMember(
  companyId: number,
  userId: number,
  opts: {
    role?: CompanyMemberRole;
    departmentId?: string | null;
    moduleIds?: string[];
    requestHost?: string;
  }
): Promise<void> {
  const company = await getCompany(companyId);
  if (!company) throw new Error("Không tìm thấy công ty");

  const membership = await getCompanyMembership(companyId, userId);
  if (!membership) throw new Error("Không tìm thấy thành viên");
  if (membership.status === "active") throw new Error("Thành viên đã được duyệt");

  const user = await platformQueryOne<{ name: string; email: string }>(
    `SELECT name, email FROM users WHERE id = $1`,
    [userId]
  );

  await platformExecute(
    `UPDATE company_members
     SET status = 'active',
         role = COALESCE($3, role),
         department_id = COALESCE($4, department_id)
     WHERE company_id = $1 AND user_id = $2`,
    [companyId, userId, opts.role ?? null, opts.departmentId ?? null]
  );
  await syncTenantUser(companyId, userId);

  const role = opts.role ?? membership.role;
  if (role === "member" && opts.moduleIds) {
    await setMemberModuleIds(companyId, userId, opts.moduleIds);
  }

  if (user) {
    void sendMemberApprovedEmail({
      to: user.email,
      name: user.name,
      companyName: company.name,
      loginUrl: companyErpLoginUrl(company.subdomain, opts.requestHost),
    });
  }
}

export async function updateCompanyMemberSettings(
  companyId: number,
  targetUserId: number,
  opts: {
    role?: CompanyMemberRole;
    departmentId?: string | null;
    moduleIds?: string[];
  }
): Promise<void> {
  const membership = await getCompanyMembership(companyId, targetUserId);
  if (!membership) throw new Error("Không tìm thấy thành viên");
  if (membership.status !== "active") {
    throw new Error("Chỉ chỉnh quyền nhân viên đã được duyệt");
  }

  const nextRole = opts.role ?? membership.role;

  if (opts.role !== undefined) {
    await platformExecute(
      `UPDATE company_members SET role = $3 WHERE company_id = $1 AND user_id = $2`,
      [companyId, targetUserId, opts.role]
    );
  }

  if (opts.departmentId !== undefined) {
    await platformExecute(
      `UPDATE company_members SET department_id = $3 WHERE company_id = $1 AND user_id = $2`,
      [companyId, targetUserId, opts.departmentId]
    );
  }

  if (opts.moduleIds !== undefined || (opts.role !== undefined && nextRole !== "member")) {
    if (nextRole === "member") {
      const companyModules = await getActiveModuleIds(companyId);
      const ids = (opts.moduleIds ?? []).filter((id) => companyModules.has(id));
      await setMemberModuleIds(companyId, targetUserId, ids);
    } else {
      await setMemberModuleIds(companyId, targetUserId, []);
    }
  }

  await syncTenantUser(companyId, targetUserId);
}

export async function rejectCompanyMember(companyId: number, userId: number): Promise<void> {
  const membership = await getCompanyMembership(companyId, userId);
  if (!membership) throw new Error("Không tìm thấy thành viên");
  if (membership.status !== "pending") {
    throw new Error("Chỉ từ chối được hồ sơ đang chờ duyệt");
  }

  await platformExecute(
    `UPDATE company_members SET status = 'rejected' WHERE company_id = $1 AND user_id = $2`,
    [companyId, userId]
  );
}

export async function listMembersByStatus(
  companyId: number,
  status?: CompanyMemberStatus
): Promise<CompanyMember[]> {
  const all = await listCompanyMembers(companyId);
  if (!status) return all;
  return all.filter((m) => m.status === status);
}
