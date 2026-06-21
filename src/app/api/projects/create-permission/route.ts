import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/platform/access";
import { resolveActiveCompanyForUser } from "@/lib/projects/companies";
import { canCreateProject } from "@/lib/projects/permissions";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) {
    return NextResponse.json({
      allowed: false,
      reason: "Chưa chọn công ty — dùng menu Công ty trên sidebar.",
    });
  }

  const allowed = await canCreateProject(active.companyId, user.id);
  if (allowed) {
    return NextResponse.json({ allowed: true, companyId: active.companyId });
  }

  const admin = await isPlatformAdmin(user.id);
  return NextResponse.json({
    allowed: false,
    companyId: active.companyId,
    reason: admin
      ? "Lỗi quyền nội bộ — thử F5 sau khi chọn đúng công ty."
      : "Chỉ Admin hoặc Quản lý công ty được tạo dự án. Liên hệ admin công ty hoặc Hoa Phong Premium.",
  });
}
