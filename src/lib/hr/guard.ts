import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getEffectiveCompanyRole, isUltimateAdmin } from "@/lib/access/company-context";
import { hasModuleAccess } from "@/lib/platform/access";

export async function requireHrAdmin(companyId: number) {
  const user = await getSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const ultimate = await isUltimateAdmin(user.id);
  const role = await getEffectiveCompanyRole(companyId, user.id);

  if (!ultimate && role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Chỉ admin công ty được quản lý nhân sự" },
        { status: 403 }
      ),
    };
  }

  if (!ultimate && !(await hasModuleAccess(companyId, "hr"))) {
    return {
      error: NextResponse.json(
        { error: "Công ty chưa được mở module Nhân sự (HR)" },
        { status: 403 }
      ),
    };
  }

  return { user, ultimate, role };
}
