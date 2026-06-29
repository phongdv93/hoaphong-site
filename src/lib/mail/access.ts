import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasModuleAccess, isPlatformAdmin } from "@/lib/platform/access";
import { hasUserModuleAccess } from "@/lib/platform/member-modules";
import { resolveActiveCompanyForUser } from "@/lib/projects/companies";

/** Quyền dùng hộp thư công ty — admin công ty hoặc module marketing */
export async function requireMailboxAccess() {
  const user = await getSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const admin = await isPlatformAdmin(user.id);
  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) {
    return {
      error: NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 }),
    };
  }

  if (!admin) {
    const moduleOn = await hasModuleAccess(active.companyId, "marketing");
    if (!moduleOn) {
      return {
        error: NextResponse.json(
          { error: "Công ty chưa bật module Marketing" },
          { status: 403 }
        ),
      };
    }
    const canUse =
      active.role === "admin" ||
      active.role === "manager" ||
      (await hasUserModuleAccess(
        active.companyId,
        user.id,
        "marketing",
        active.role
      ));
    if (!canUse) {
      return {
        error: NextResponse.json(
          { error: "Bạn chưa được cấp quyền hộp thư" },
          { status: 403 }
        ),
      };
    }
  }

  return { user, companyId: active.companyId, admin };
}
