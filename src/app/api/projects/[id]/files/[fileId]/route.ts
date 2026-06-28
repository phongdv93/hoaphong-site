import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { runWithTenantCompany } from "@/lib/db/tenant-context";
import { resolveActiveCompanyForUser } from "@/lib/projects/companies";
import { canEditProject } from "@/lib/projects/permissions";
import { deleteProjectFileRecord } from "@/lib/projects/project-files";
import { getProject } from "@/lib/projects/repository";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idStr, fileId: fileIdStr } = await params;
  const projectId = Number(idStr);
  const fileId = Number(fileIdStr);
  if (!Number.isFinite(projectId) || !Number.isFinite(fileId)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) return NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 });

  return runWithTenantCompany(active.companyId, async () => {
    const project = await getProject(projectId, active.companyId);
    if (!project) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    if (!(await canEditProject(project.id, user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    await deleteProjectFileRecord(fileId, projectId);
    return NextResponse.json({ ok: true });
  });
}
