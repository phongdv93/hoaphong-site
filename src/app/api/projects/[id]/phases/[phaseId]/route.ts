import { NextResponse } from "next/server";
import { loadProjectInTenant } from "@/lib/projects/api-tenant";
import { canEditPhase, canUpdatePhaseProgress } from "@/lib/projects/permissions";
import { deletePhase, updatePhase } from "@/lib/projects/repository";

function parseIds(req: Request): { id: number; phaseId: number } | null {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = segs.indexOf("projects");
  const id = Number(segs[i + 1]);
  const phaseId = Number(segs[i + 3]);
  return Number.isFinite(id) && Number.isFinite(phaseId) ? { id, phaseId } : null;
}

export async function PUT(req: Request) {
  const ids = parseIds(req);
  if (!ids) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

  const ctx = await loadProjectInTenant(ids.id);
  if ("err" in ctx) return ctx.err;

  const body = await req.json();
  return ctx.run(async () => {
    const canEdit = await canEditPhase(ctx.project.id, ctx.user.id);
    const canProgress = await canUpdatePhaseProgress(ctx.project.id, ctx.user.id);
    if (!canEdit && !canProgress) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    if (!canEdit && canProgress) {
      return NextResponse.json(
        {
          error:
            "Cập nhật tiến độ phải qua tab Tiến độ: đính kèm ảnh minh chứng và lưu",
        },
        { status: 403 }
      );
    }
    try {
      await updatePhase(ids.phaseId, body);
      return NextResponse.json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi cập nhật";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  });
}

export async function DELETE(req: Request) {
  const ids = parseIds(req);
  if (!ids) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

  const ctx = await loadProjectInTenant(ids.id);
  if ("err" in ctx) return ctx.err;

  return ctx.run(async () => {
    if (!(await canEditPhase(ctx.project.id, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    await deletePhase(ids.phaseId);
    return NextResponse.json({ ok: true });
  });
}
