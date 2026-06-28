import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { runWithTenantCompany } from "@/lib/db/tenant-context";
import { resolveActiveCompanyForUser } from "@/lib/projects/companies";
import { canEditProject } from "@/lib/projects/permissions";
import {
  deleteProjectFileSection,
  updateProjectFileSection,
} from "@/lib/projects/project-files";
import { getProject } from "@/lib/projects/repository";

async function resolveCtx(idStr: string, sectionIdStr: string) {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const projectId = Number(idStr);
  const sectionId = Number(sectionIdStr);
  if (!Number.isFinite(projectId) || !Number.isFinite(sectionId)) {
    return { error: NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 }) };
  }
  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) {
    return { error: NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 }) };
  }
  return { user, projectId, sectionId, companyId: active.companyId };
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { id, sectionId } = await params;
  const ctx = await resolveCtx(id, sectionId);
  if ("error" in ctx) return ctx.error;

  return runWithTenantCompany(ctx.companyId, async () => {
    const project = await getProject(ctx.projectId, ctx.companyId);
    if (!project) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    if (!(await canEditProject(project.id, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "Thiếu tiêu đề" }, { status: 400 });
    await updateProjectFileSection(ctx.sectionId, ctx.projectId, title);
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { id, sectionId } = await params;
  const ctx = await resolveCtx(id, sectionId);
  if ("error" in ctx) return ctx.error;

  return runWithTenantCompany(ctx.companyId, async () => {
    const project = await getProject(ctx.projectId, ctx.companyId);
    if (!project) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    if (!(await canEditProject(project.id, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    await deleteProjectFileSection(ctx.sectionId, ctx.projectId);
    return NextResponse.json({ ok: true });
  });
}
