import { NextResponse } from "next/server";
import { canEditProject } from "@/lib/projects/permissions";
import { getProject, restoreProject } from "@/lib/projects/repository";
import { requireActiveTenantCompany } from "@/lib/projects/with-active-tenant";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireActiveTenantCompany();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  return ctx.run(async () => {
    const project = await getProject(id, ctx.companyId);
    if (!project) {
      return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });
    }
    if (!(await canEditProject(project.id, ctx.userId))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    await restoreProject(id, ctx.companyId);
    return NextResponse.json({ ok: true });
  });
}
