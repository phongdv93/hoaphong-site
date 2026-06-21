import { hashPassword } from "@/lib/auth";

import {

  generateRandomPassword,

  sendMemberInvitedEmail,

  sendStaffCredentialsEmail,

} from "@/lib/mail";

import {

  getCompany,

  getCompanyMembership,

  removeCompanyMember,

  upsertCompanyMember,

} from "@/lib/projects/companies";

import { platformExecute, platformQueryOne, platformWithTransaction } from "@/lib/db/platform";

import { setMemberModuleIds } from "@/lib/platform/member-modules";

import { isPlatformAdmin } from "@/lib/platform/access";

import { companyErpLoginUrl } from "@/lib/tenant-host";

import type { CompanyMemberRole } from "@/lib/projects/types";



export interface CreateStaffInput {

  companyId: number;

  name: string;

  email: string;

  password: string;

  role?: CompanyMemberRole;

  moduleIds?: string[];

  actorUserId: number;

  /** false = không gửi mail (dev/test) */

  sendEmail?: boolean;

  /** Host request — link ERP đúng http/https (dev localhost) */

  requestHost?: string;

}



async function userHasActiveMembershipElsewhere(

  userId: number,

  excludeCompanyId: number

): Promise<boolean> {

  const row = await platformQueryOne<{ c: number }>(

    `SELECT COUNT(*)::int AS c FROM company_members

     WHERE user_id = $1 AND status = 'active' AND company_id != $2`,

    [userId, excludeCompanyId]

  );

  return (row?.c ?? 0) > 0;

}



export async function createStaffForCompany(

  input: CreateStaffInput

): Promise<{

  userId: number;

  email: string;

  name: string;

  role: CompanyMemberRole;

  password?: string;

  emailSent: boolean;

  loginUrl: string;

  /** Đã có tài khoản — chỉ thêm vào công ty này */

  invitedExisting?: boolean;

}> {

  const email = input.email.trim().toLowerCase();

  const name = input.name.trim();

  let password = input.password?.trim() ?? "";

  const role = input.role ?? "member";

  const autoPassword = password.length < 6;

  if (autoPassword) password = generateRandomPassword();



  if (!email || !name) {

    throw new Error("Tên và email bắt buộc");

  }



  const company = await getCompany(input.companyId);

  const loginUrl = company

    ? companyErpLoginUrl(company.subdomain, input.requestHost)

    : "/erp/login";



  const existing = await platformQueryOne<{ id: number; name: string }>(

    `SELECT id, name FROM users WHERE LOWER(email) = $1`,

    [email]

  );



  if (existing) {

    const membership = await getCompanyMembership(input.companyId, existing.id);

    if (membership?.status === "active") {

      throw new Error("Email này đã là nhân viên công ty này");

    }

    if (membership?.status === "pending") {

      throw new Error("Email này đang chờ duyệt tại công ty này");

    }



    const hasElsewhere = await userHasActiveMembershipElsewhere(

      existing.id,

      input.companyId

    );

    const adminSetPassword = (input.password?.trim().length ?? 0) >= 6;

    /** Admin công ty hoặc user chưa thuộc cty nào / admin nhập mật khẩu mới → gửi mật khẩu */
    const issueCredentials =
      role === "admin" || !hasElsewhere || adminSetPassword;



    if (issueCredentials) {

      if (!adminSetPassword) password = generateRandomPassword();

      else password = input.password!.trim();



      const passwordHash = await hashPassword(password);

      await platformExecute(

        `UPDATE users SET password_hash = $1, name = $2 WHERE id = $3`,

        [passwordHash, name, existing.id]

      );

    } else if (name !== existing.name?.trim()) {

      await platformExecute(`UPDATE users SET name = $1 WHERE id = $2`, [name, existing.id]);

    }



    await upsertCompanyMember(input.companyId, existing.id, role, {

      actorUserId: input.actorUserId,

    });



    if (role === "member" && input.moduleIds?.length) {

      await setMemberModuleIds(input.companyId, existing.id, input.moduleIds);

    }



    const displayName = name || existing.name?.trim() || email;

    let mailResult: { sent: boolean } = { sent: false };



    if (input.sendEmail !== false && company) {

      mailResult = issueCredentials

        ? await sendStaffCredentialsEmail({

            to: email,

            name: displayName,

            companyName: company.name,

            loginUrl,

            password,

          })

        : await sendMemberInvitedEmail({

            to: email,

            name: displayName,

            companyName: company.name,

            loginUrl,

          });

    }



    return {

      userId: existing.id,

      email,

      name: displayName,

      role,

      password: issueCredentials && !mailResult.sent ? password : undefined,

      emailSent: mailResult.sent,

      loginUrl,

      invitedExisting: !issueCredentials,

    };

  }



  const passwordHash = await hashPassword(password);

  let userId = 0;



  await platformWithTransaction(async (client) => {

    const u = await client.query<{ id: number }>(

      `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id`,

      [email, passwordHash, name]

    );

    userId = u.rows[0].id;

  });



  await upsertCompanyMember(input.companyId, userId, role, {

    actorUserId: input.actorUserId,

  });



  if (role === "member" && input.moduleIds?.length) {

    await setMemberModuleIds(input.companyId, userId, input.moduleIds);

  }



  let mailResult: { sent: boolean } = { sent: false };

  if (input.sendEmail !== false && company) {

    mailResult = await sendStaffCredentialsEmail({

      to: email,

      name,

      companyName: company.name,

      loginUrl,

      password,

    });

  }



  return {

    userId,

    email,

    name,

    role,

    password: mailResult.sent ? undefined : password,

    emailSent: mailResult.sent,

    loginUrl,

  };

}



export async function removeStaffFromCompany(input: {

  companyId: number;

  targetUserId: number;

  actorUserId: number;

  actorIsPlatformAdmin: boolean;

}): Promise<void> {

  if (input.targetUserId === input.actorUserId) {

    throw new Error("Không thể tự xóa khỏi công ty");

  }



  const membership = await getCompanyMembership(input.companyId, input.targetUserId);

  if (!membership || membership.status !== "active") {

    throw new Error("Nhân viên không tồn tại hoặc không còn hoạt động");

  }



  if (

    !input.actorIsPlatformAdmin &&

    (await isPlatformAdmin(input.targetUserId))

  ) {

    throw new Error("Không thể xóa tài khoản quản trị platform");

  }



  if (membership.role === "admin") {

    const row = await platformQueryOne<{ c: number }>(

      `SELECT COUNT(*)::int AS c FROM company_members

       WHERE company_id = $1 AND role = 'admin' AND status = 'active'`,

      [input.companyId]

    );

    if ((row?.c ?? 0) <= 1) {

      throw new Error("Không thể xóa admin duy nhất của công ty");

    }

  }



  await removeCompanyMember(input.companyId, input.targetUserId, input.actorUserId);

}


