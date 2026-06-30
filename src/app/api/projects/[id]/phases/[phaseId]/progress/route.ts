import { NextResponse } from "next/server";
import { loadProjectInTenant } from "@/lib/projects/api-tenant";
import { recordPhaseProgressUpdate } from "@/lib/projects/phase-progress";
import { canEditPhase, canUpdatePhaseProgress } from "@/lib/projects/permissions";
import { listPhases } from "@/lib/projects/repository";
import type { PhaseStatus } from "@/lib/projects/types";

function parseIds(req: Request): { id: number; phaseId: number } | null {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = segs.indexOf("projects");
  const id = Number(segs[i + 1]);
  const phaseId = Number(segs[i + 3]);
  return Number.isFinite(id) && Number.isFinite(phaseId) ? { id, phaseId } : null;
}

const STATUSES: PhaseStatus[] = ["pending", "in_progress", "done", "delayed"];

export async function POST(req: Request) {
  const ids = parseIds(req);
  if (!ids) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

  const ctx = await loadProjectInTenant(ids.id);
  if ("err" in ctx) return ctx.err;

  const body = await req.json();
  return ctx.run(async () => {
    const canEdit = await canEditPhase(ids.id, ctx.user.id);
    const canProgress = await canUpdatePhaseProgress(ids.id, ctx.user.id);
    if (!canEdit && !canProgress) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const phases = await listPhases(ids.id);
    const phase = phases.find((p) => p.id === ids.phaseId);
    if (!phase) {
      return NextResponse.json({ error: "Không tìm thấy công đoạn" }, { status: 404 });
    }

    const photoUrls = Array.isArray(body.photoUrls)
      ? body.photoUrls.map(String).filter(Boolean)
      : [];

    const isTask = ctx.project.template === "task";

    if (!isTask && photoUrls.length === 0) {
      return NextResponse.json(
        { error: "Bắt buộc đính kèm ít nhất một ảnh minh chứng" },
        { status: 400 }
      );
    }

    const progressPercent = Math.min(100, Math.max(0, Number(body.progressPercent ?? 0)));
    const status = body.status as PhaseStatus;
    if (!STATUSES.includes(status)) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
    }

    try {
      const log = await recordPhaseProgressUpdate({
        projectId: ids.id,
        phaseId: ids.phaseId,
        userId: ctx.user.id,
        progressPercent,
        status,
        note: String(body.note ?? ""),
        photoUrls,
        photoOptional: isTask,
      });
      return NextResponse.json({ log });
    } catch (err) {
      const msg =
        err instanceof Error && err.message.trim()
          ? err.message
          : err instanceof Error
            ? err.name
            : "Lỗi lưu tiến độ";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  });
}
