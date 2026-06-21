import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getEffectiveCompanyRole, isUltimateAdmin } from "@/lib/access/company-context";
import { approveCompanyMember } from "@/lib/hr/membership";
import { hasModuleAccess } from "@/lib/platform/access";
import { resolveActiveCompanyForUser } from "@/lib/projects/companies";
import type { CompanyMemberRole } from "@/lib/projects/types";

export async function POST(
  req: Request,
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
    return NextResponse.json({ error: "Chỉ admin công ty được duyệt nhân sự" }, { status: 403 });
  }
  if (!ultimate && !(await hasModuleAccess(active.companyId, "hr"))) {
    return NextResponse.json({ error: "Công ty chưa mở module HR" }, { status: 403 });
  }

  const { userId: userIdStr } = await params;
  const targetUserId = Number.parseInt(userIdStr, 10);
  if (!Number.isFinite(targetUserId)) {
    return NextResponse.json({ error: "userId không hợp lệ" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const memberRole = (body.role as CompanyMemberRole | undefined) ?? "member";
  const departmentId = (body.departmentId as string | undefined) ?? null;
  const moduleIds = Array.isArray(body.moduleIds)
    ? (body.moduleIds as string[]).filter((x) => typeof x === "string")
    : undefined;

  try {
    await approveCompanyMember(active.companyId, targetUserId, {
      role: memberRole,
      departmentId,
      moduleIds,
      requestHost: req.headers.get("host") ?? undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Duyệt thất bại";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
