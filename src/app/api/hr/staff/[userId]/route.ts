import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { platformQueryOne } from "@/lib/db/platform";
import { updateCompanyMemberSettings } from "@/lib/hr/membership";
import { removeStaffFromCompany } from "@/lib/hr/staff";
import { requireHrAdmin } from "@/lib/hr/guard";
import { getCompanyMembership, resolveActiveCompanyForUser } from "@/lib/projects/companies";
import type { CompanyMemberRole } from "@/lib/projects/types";

const ROLE_VALUES: CompanyMemberRole[] = ["admin", "manager", "member"];

async function countCompanyAdmins(companyId: number): Promise<number> {
  const row = await platformQueryOne<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM company_members
     WHERE company_id = $1 AND role = 'admin' AND status = 'active'`,
    [companyId]
  );
  return row?.c ?? 0;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) {
    return NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 });
  }

  const gate = await requireHrAdmin(active.companyId);
  if (gate.error) return gate.error;

  const { userId: userIdStr } = await params;
  const targetUserId = Number(userIdStr);
  if (!Number.isFinite(targetUserId)) {
    return NextResponse.json({ error: "userId không hợp lệ" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const role = body.role as CompanyMemberRole | undefined;
  const departmentId =
    body.departmentId === null
      ? null
      : typeof body.departmentId === "string"
      ? body.departmentId
      : undefined;
  const moduleIds = Array.isArray(body.moduleIds)
    ? (body.moduleIds as string[]).filter((x) => typeof x === "string")
    : undefined;

  if (role !== undefined && !ROLE_VALUES.includes(role)) {
    return NextResponse.json({ error: "Vai trò không hợp lệ" }, { status: 400 });
  }

  if (
    targetUserId === user.id &&
    role !== undefined &&
    role !== "admin" &&
    !gate.ultimate
  ) {
    const admins = await countCompanyAdmins(active.companyId);
    const current = await getCompanyMembership(active.companyId, user.id);
    if (current?.role === "admin" && admins <= 1) {
      return NextResponse.json(
        { error: "Không thể hạ quyền admin duy nhất của công ty" },
        { status: 400 }
      );
    }
  }

  try {
    await updateCompanyMemberSettings(active.companyId, targetUserId, {
      role,
      departmentId,
      moduleIds,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cập nhật thất bại";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) {
    return NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 });
  }

  const gate = await requireHrAdmin(active.companyId);
  if (gate.error) return gate.error;

  const { userId: userIdStr } = await params;
  const targetUserId = Number(userIdStr);
  if (!Number.isFinite(targetUserId)) {
    return NextResponse.json({ error: "userId không hợp lệ" }, { status: 400 });
  }

  try {
    await removeStaffFromCompany({
      companyId: active.companyId,
      targetUserId,
      actorUserId: user.id,
      actorIsPlatformAdmin: gate.ultimate,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Xóa thất bại";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
