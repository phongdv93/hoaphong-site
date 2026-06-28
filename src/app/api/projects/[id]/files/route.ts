import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { runWithTenantCompany } from "@/lib/db/tenant-context";
import { resolveActiveCompanyForUser } from "@/lib/projects/companies";
import { canEditProject } from "@/lib/projects/permissions";
import { createProjectFileRecord } from "@/lib/projects/project-files";
import { getProject } from "@/lib/projects/repository";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idStr } = await params;
  const projectId = Number(idStr);
  if (!Number.isFinite(projectId)) {
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
    const body = await req.json();
    const sectionId = Number(body.sectionId);
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl : "";
    const fileSize = Number(body.fileSize) || 0;
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
    if (!Number.isFinite(sectionId) || !fileName || !fileUrl) {
      return NextResponse.json({ error: "Thiếu thông tin file" }, { status: 400 });
    }
    const fileId = await createProjectFileRecord({
      projectId,
      sectionId,
      fileName,
      fileUrl,
      fileSize,
      mimeType,
      uploadedBy: user.id,
    });
    return NextResponse.json({ id: fileId });
  });
}
