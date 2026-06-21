import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getEffectiveCompanyRole, isUltimateAdmin } from "@/lib/access/company-context";
import { rejectCompanyMember } from "@/lib/hr/membership";
import { hasModuleAccess } from "@/lib/platform/access";
import { resolveActiveCompanyForUser } from "@/lib/projects/companies";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) {
    return NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 });
  }

  const ultimate = await isUltimateAdmin(user.id);
  const role = await getEffectiveCompanyRole(active.companyId, user.id);
  if (!ultimate && role !== "admin") {
    return NextResponse.json({ error: "Chỉ admin công ty được từ chối hồ sơ" }, { status: 403 });
  }
  if (!ultimate && !(await hasModuleAccess(active.companyId, "hr"))) {
    return NextResponse.json({ error: "Công ty chưa mở module HR" }, { status: 403 });
  }

  const { userId: userIdStr } = await params;
  const targetUserId = Number.parseInt(userIdStr, 10);
  if (!Number.isFinite(targetUserId)) {
    return NextResponse.json({ error: "userId không hợp lệ" }, { status: 400 });
  }

  try {
    await rejectCompanyMember(active.companyId, targetUserId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Từ chối thất bại";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
