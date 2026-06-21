import { NextResponse } from "next/server";
import { runWithTenantCompany } from "@/lib/db/tenant-context";
import { getSessionUser } from "@/lib/auth";
import { resolveActiveCompanyForUser } from "@/lib/projects/companies";
import { canEditPhase } from "@/lib/projects/permissions";
import { getTenantPool } from "@/lib/db/tenant";
import { repairTableSequence } from "@/lib/db/repair-sequences";
import { createPhase, getProject, listPhases } from "@/lib/projects/repository";
import type { PhaseKind, Project } from "@/lib/projects/types";

function parseId(req: Request): number | null {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = segs.indexOf("projects");
  const id = Number(segs[idx + 1]);
  return Number.isFinite(id) ? id : null;
}

async function loadCtx(req: Request) {
  const user = await getSessionUser();
  if (!user) return { err: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const id = parseId(req);
  if (!id) return { err: NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 }) };

  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) return { err: NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 }) };

  return { user, projectId: id, companyId: active.companyId };
}

async function withProject<T>(
  ctx:
    | { err: NextResponse }
    | { user: { id: number }; projectId: number; companyId: number },
  fn: (project: Project) => Promise<T>
): Promise<T | NextResponse> {
  if ("err" in ctx) return ctx.err;
  return runWithTenantCompany(ctx.companyId, async () => {
    const project = await getProject(ctx.projectId, ctx.companyId);
    if (!project) {
      return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 }) as T;
    }
    return fn(project);
  });
}

export async function GET(req: Request) {
  const ctx = await loadCtx(req);
  if ("err" in ctx) return ctx.err;
  return withProject(ctx, async (project) => {
    const phases = await listPhases(project.id);
    return NextResponse.json(phases);
  });
}

export async function POST(req: Request) {
  const ctx = await loadCtx(req);
  if ("err" in ctx) return ctx.err;
  const body = await req.json();

  return withProject(ctx, async (project) => {
    if (!(await canEditPhase(project.id, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Tên công đoạn bắt buộc" }, { status: 400 });
    }
    try {
      await repairTableSequence(
        await getTenantPool(ctx.companyId),
        "project_phases"
      );
      const phaseId = await createPhase({
        projectId: project.id,
        kind: (body.kind as PhaseKind) || "custom",
        name: body.name.trim(),
        sortOrder:
          body.sortOrder != null && Number.isFinite(Number(body.sortOrder))
            ? Number(body.sortOrder)
            : undefined,
        startedAt: body.startedAt || null,
        deadlineAt: body.deadlineAt || null,
        assigneeUserId: body.assigneeUserId ?? null,
        notes: body.notes || "",
      });
      return NextResponse.json({ id: phaseId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Thêm công đoạn thất bại";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  });
}
