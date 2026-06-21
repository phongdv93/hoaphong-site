import { NextResponse } from "next/server";
import { loadProjectInTenant } from "@/lib/projects/api-tenant";
import { canSubmitToProject, canViewProject } from "@/lib/projects/permissions";
import {
  createProjectSubmission,
  listProjectSubmissions,
} from "@/lib/projects/submissions";
import type { ProjectSubmissionKind } from "@/lib/projects/types";

const KINDS: ProjectSubmissionKind[] = ["request", "report", "proposal"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = Number((await params).id);
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
    const submissions = await listProjectSubmissions(id).catch(() => []);
    return NextResponse.json({ submissions });
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  const ctx = await loadProjectInTenant(id);
  if ("err" in ctx) return ctx.err;

  const body = await req.json();
  return ctx.run(async () => {
    if (!(await canSubmitToProject(id, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền gửi" }, { status: 403 });
    }
    const kind = body.kind as ProjectSubmissionKind;
    if (!KINDS.includes(kind)) {
      return NextResponse.json({ error: "Loại phiếu không hợp lệ" }, { status: 400 });
    }
    try {
      const result = await createProjectSubmission({
        projectId: id,
        userId: ctx.user.id,
        kind,
        title: String(body.title ?? ""),
        summary: String(body.summary ?? ""),
        detail: String(body.detail ?? ""),
        phaseId: body.phaseId != null ? Number(body.phaseId) : null,
        postToChat: body.postToChat !== false,
      });
      return NextResponse.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi tạo phiếu";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  });
}
