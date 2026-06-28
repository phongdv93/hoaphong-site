import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { runWithTenantCompany } from "@/lib/db/tenant-context";
import { resolveActiveCompanyForUser } from "@/lib/projects/companies";
import { canEditProject, canViewProject } from "@/lib/projects/permissions";
import {
  createProjectFileSection,
  listProjectFileSections,
} from "@/lib/projects/project-files";
import { getProject } from "@/lib/projects/repository";

async function resolveCtx(req: Request, idStr: string) {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return { error: NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 }) };
  }
  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) {
    return { error: NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 }) };
  }
  return { user, id, companyId: active.companyId };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const ctx = await resolveCtx(_req, idStr);
  if ("error" in ctx) return ctx.error;

  return runWithTenantCompany(ctx.companyId, async () => {
    const project = await getProject(ctx.id, ctx.companyId);
    if (!project) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    const view = await canViewProject(project.id, ctx.user.id);
    if (!view.ok) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    const sections = await listProjectFileSections(ctx.id);
    return NextResponse.json(sections);
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const ctx = await resolveCtx(req, idStr);
  if ("error" in ctx) return ctx.error;

  return runWithTenantCompany(ctx.companyId, async () => {
    const project = await getProject(ctx.id, ctx.companyId);
    if (!project) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    if (!(await canEditProject(project.id, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "Thiếu tiêu đề" }, { status: 400 });
    const sectionId = await createProjectFileSection(ctx.id, title);
    return NextResponse.json({ id: sectionId });
  });
}
