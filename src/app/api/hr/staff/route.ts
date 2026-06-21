import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getEffectiveCompanyRole, isUltimateAdmin } from "@/lib/access/company-context";
import { createStaffForCompany } from "@/lib/hr/staff";
import { requireHrAdmin } from "@/lib/hr/guard";
import { getActiveModuleIds } from "@/lib/platform/access";
import { PLATFORM_MODULES } from "@/lib/platform/catalog";
import { listMemberModuleIds } from "@/lib/platform/member-modules";
import {
  getCompany,
  listCompanyMembers,
  resolveActiveCompanyForUser,
} from "@/lib/projects/companies";
import type { CompanyMemberRole } from "@/lib/projects/types";


export async function GET() {

  const user = await getSessionUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });



  const active = await resolveActiveCompanyForUser(user.id);

  if (!active) {

    return NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 });

  }



  const gate = await requireHrAdmin(active.companyId);

  if (gate.error) return gate.error;



  const company = await getCompany(active.companyId);

  const members = await listCompanyMembers(active.companyId);

  for (const m of members) {

    m.moduleIds = await listMemberModuleIds(active.companyId, m.userId);

  }



  const pending = members.filter((m) => m.status === "pending");

  const activeModuleIdSet = await getActiveModuleIds(active.companyId);

  const activeModules = PLATFORM_MODULES.filter((mod) => activeModuleIdSet.has(mod.id)).map(

    (mod) => ({ id: mod.id, name: mod.name })

  );



  const ultimate = await isUltimateAdmin(user.id);

  const role = await getEffectiveCompanyRole(active.companyId, user.id);

  return NextResponse.json({

    companyId: active.companyId,
    currentUserId: user.id,

    company: company

      ? {

          name: company.name,

          code: company.code,

          subdomain: company.subdomain,

        }

      : null,

    myRole: role,

    isPlatformAdmin: ultimate,

    members,

    pendingCount: pending.length,

    activeModules,

  });

}



export async function POST(req: Request) {

  const user = await getSessionUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });



  const active = await resolveActiveCompanyForUser(user.id);

  if (!active) {

    return NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 });

  }



  const gate = await requireHrAdmin(active.companyId);

  if (gate.error) return gate.error;

  const body = await req.json();
  const name = (body.name as string | undefined)?.trim();

  const email = (body.email as string | undefined)?.trim();

  const password = (body.password as string | undefined) ?? "";

  const role = (body.role as CompanyMemberRole | undefined) ?? "member";

  const moduleIds = Array.isArray(body.moduleIds)

    ? (body.moduleIds as string[]).filter((x) => typeof x === "string")

    : undefined;

  const sendEmail = body.sendEmail !== false;



  if (!name || !email) {

    return NextResponse.json({ error: "Cần tên và email" }, { status: 400 });

  }



  try {

    const created = await createStaffForCompany({
      companyId: active.companyId,
      name,
      email,
      password,
      role,
      moduleIds,
      actorUserId: user.id,
      sendEmail,
      requestHost: req.headers.get("host") ?? undefined,
    });

    return NextResponse.json({

      ...created,

      hint: created.invitedExisting
        ? created.emailSent
          ? "Đã thêm nhân viên (tài khoản có sẵn) — đã gửi email thông báo."
          : "Đã thêm nhân viên có sẵn — họ đăng nhập bằng mật khẩu cũ và chọn công ty trong menu."
        : created.emailSent
        ? "Đã gửi mật khẩu qua email nhân viên."
        : created.password
        ? "SMTP chưa cấu hình — sao chép mật khẩu bên dưới."
        : "Đã tạo tài khoản.",

    });

  } catch (err) {

    const message = err instanceof Error ? err.message : "Không tạo được nhân sự";

    return NextResponse.json({ error: message }, { status: 400 });

  }

}


