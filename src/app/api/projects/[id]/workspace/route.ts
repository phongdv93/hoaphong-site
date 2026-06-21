import { NextResponse } from "next/server";
import { loadProjectInTenant } from "@/lib/projects/api-tenant";
import { canViewProject } from "@/lib/projects/permissions";
import { listMembers, listPhases } from "@/lib/projects/repository";
import { listPhaseProgressLogs } from "@/lib/projects/phase-progress";
import { listProjectSubmissions } from "@/lib/projects/submissions";
import {
  listProjectFiles,
  listProjectItems,
  listProjectMessages,
} from "@/lib/projects/workspace";

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

    const [phases, members, messages, submissions, progressLogs, files, items] =
      await Promise.all([
        listPhases(id),
        listMembers(id),
        listProjectMessages(id).catch(() => []),
        listProjectSubmissions(id).catch(() => []),
        listPhaseProgressLogs(id, undefined, 40).catch(() => []),
        listProjectFiles(id).catch(() => []),
        listProjectItems(id).catch(() => []),
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
      myRole: view.role,
    });
  });
}
