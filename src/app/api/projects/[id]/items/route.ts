import { NextResponse } from "next/server";
import { runWithTenantCompany } from "@/lib/db/tenant-context";
import { getSessionUser } from "@/lib/auth";
import { resolveActiveCompanyForUser } from "@/lib/projects/companies";
import { canEditPhase } from "@/lib/projects/permissions";
import {
  createProjectItem,
  deleteAllProjectItems,
  getProject,
  listProjectItems,
} from "@/lib/projects/repository";

function parseProjectId(req: Request): number | null {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = segs.indexOf("projects");
  const id = Number(segs[idx + 1]);
  return Number.isFinite(id) ? id : null;
}

async function loadCtx(req: Request) {
  const user = await getSessionUser();
  if (!user) return { err: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const projectId = parseProjectId(req);
  if (!projectId) return { err: NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 }) };

  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) return { err: NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 }) };

  return { user, projectId, companyId: active.companyId };
}

export async function GET(req: Request) {
  const ctx = await loadCtx(req);
  if ("err" in ctx) return ctx.err;

  return runWithTenantCompany(ctx.companyId, async () => {
    const project = await getProject(ctx.projectId, ctx.companyId);
    if (!project) {
      return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });
    }
    const items = await listProjectItems(ctx.projectId);
    return NextResponse.json(items);
  });
}

export async function POST(req: Request) {
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
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Tên hạng mục bắt buộc" }, { status: 400 });
    }
    const id = await createProjectItem({
      projectId: ctx.projectId,
      name: body.name.trim(),
      sortOrder: body.sortOrder,
      description: body.description,
      quantity: body.quantity != null ? Number(body.quantity) : undefined,
      quantityDone: body.quantityDone != null ? Number(body.quantityDone) : undefined,
      unit: body.unit,
    });
    return NextResponse.json({ id });
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
    const deleted = await deleteAllProjectItems(ctx.projectId);
    return NextResponse.json({ ok: true, deleted });
  });
}
