import { NextResponse } from "next/server";
import { loadProjectInTenant } from "@/lib/projects/api-tenant";
import { canEditProjectMeta, canViewProject } from "@/lib/projects/permissions";
import { listMembers, listPhases, ensureTaskDefaultPhase } from "@/lib/projects/repository";
import { listPhaseProgressLogs } from "@/lib/projects/phase-progress";
import { listProjectSubmissions } from "@/lib/projects/submissions";
import {
  listProjectFiles,
  listProjectMessages,
} from "@/lib/projects/workspace";
import { listProjectItems } from "@/lib/projects/repository";
import { listProjectContracts } from "@/lib/projects/contracts";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  const ctx = await loadProjectInTenant(id);
  if ("err" in ctx) return ctx.err;

  return ctx.run(async () => {
    const view = await canViewProject(id, ctx.user.id);
    if (!view.ok) {
      return NextResponse.json({ error: "Không có quyền xem" }, { status: 403 });
    }

    if (ctx.project.template === "task") {
      await ensureTaskDefaultPhase(id);
    }

    const [phases, members, messages, submissions, progressLogs, files, items, contracts, canEditMeta] =
      await Promise.all([
        listPhases(id),
        listMembers(id),
        listProjectMessages(id).catch(() => []),
        listProjectSubmissions(id).catch(() => []),
        listPhaseProgressLogs(id, undefined, 40).catch(() => []),
        listProjectFiles(id).catch(() => []),
        listProjectItems(id).catch(() => []),
        listProjectContracts(id).catch(() => []),
        canEditProjectMeta(id, ctx.user.id),
      ]);

    return NextResponse.json({
      project: ctx.project,
      phases,
      members,
      messages,
      submissions,
      progressLogs,
      files,
      items,
      contracts,
      myRole: view.role,
      canEditMeta,
    });
  });
}
