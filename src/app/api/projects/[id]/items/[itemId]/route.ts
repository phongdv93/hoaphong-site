import { NextResponse } from "next/server";
import { runWithTenantCompany } from "@/lib/db/tenant-context";
import { getSessionUser } from "@/lib/auth";
import { resolveActiveCompanyForUser } from "@/lib/projects/companies";
import { canEditPhase } from "@/lib/projects/permissions";
import {
  deleteProjectItem,
  getProject,
  updateProjectItem,
} from "@/lib/projects/repository";

function parseIds(req: Request): { projectId: number | null; itemId: number | null } {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  const pIdx = segs.indexOf("projects");
  const iIdx = segs.indexOf("items");
  const projectId = Number(segs[pIdx + 1]);
  const itemId = Number(segs[iIdx + 1]);
  return {
    projectId: Number.isFinite(projectId) ? projectId : null,
    itemId: Number.isFinite(itemId) ? itemId : null,
  };
}

async function loadCtx(req: Request) {
  const user = await getSessionUser();
  if (!user) return { err: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { projectId, itemId } = parseIds(req);
  if (!projectId || !itemId) {
    return { err: NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 }) };
  }

  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) return { err: NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 }) };

  return { user, projectId, itemId, companyId: active.companyId };
}

export async function PUT(req: Request) {
  const ctx = await loadCtx(req);
  if ("err" in ctx) return ctx.err;
  const body = await req.json();

  return runWithTenantCompany(ctx.companyId, async () => {
    const project = await getProject(ctx.projectId, ctx.companyId);
    if (!project) {
      return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });
    }
    if (!(await canEditPhase(ctx.projectId, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    try {
      await updateProjectItem(ctx.itemId, body);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Cập nhật thất bại" },
        { status: 400 }
      );
    }
  });
}

export async function DELETE(req: Request) {
  const ctx = await loadCtx(req);
  if ("err" in ctx) return ctx.err;

  return runWithTenantCompany(ctx.companyId, async () => {
    const project = await getProject(ctx.projectId, ctx.companyId);
    if (!project) {
      return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });
    }
    if (!(await canEditPhase(ctx.projectId, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    await deleteProjectItem(ctx.itemId);
    return NextResponse.json({ ok: true });
  });
}
