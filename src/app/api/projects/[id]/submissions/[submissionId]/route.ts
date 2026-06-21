import { NextResponse } from "next/server";
import { loadProjectInTenant } from "@/lib/projects/api-tenant";
import { canReviewSubmission, canViewProject } from "@/lib/projects/permissions";
import {
  getProjectSubmission,
  reviewProjectSubmission,
} from "@/lib/projects/submissions";

function parseIds(pathname: string): { id: number; submissionId: number } | null {
  const segs = pathname.split("/").filter(Boolean);
  const i = segs.indexOf("projects");
  const id = Number(segs[i + 1]);
  const submissionId = Number(segs[i + 3]);
  return Number.isFinite(id) && Number.isFinite(submissionId)
    ? { id, submissionId }
    : null;
}

export async function GET(req: Request) {
  const ids = parseIds(new URL(req.url).pathname);
  if (!ids) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

  const ctx = await loadProjectInTenant(ids.id);
  if ("err" in ctx) return ctx.err;

  return ctx.run(async () => {
    const view = await canViewProject(ids.id, ctx.user.id);
    if (!view.ok) {
      return NextResponse.json({ error: "Không có quyền xem" }, { status: 403 });
    }
    const submission = await getProjectSubmission(ids.submissionId, ids.id);
    if (!submission) {
      return NextResponse.json({ error: "Không tìm thấy phiếu" }, { status: 404 });
    }
    return NextResponse.json({ submission });
  });
}

export async function PATCH(req: Request) {
  const ids = parseIds(new URL(req.url).pathname);
  if (!ids) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

  const ctx = await loadProjectInTenant(ids.id);
  if ("err" in ctx) return ctx.err;

  const body = await req.json();
  return ctx.run(async () => {
    if (!(await canReviewSubmission(ids.id, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền duyệt" }, { status: 403 });
    }
    const status = body.status;
    if (status !== "approved" && status !== "rejected") {
      return NextResponse.json({ error: "Trạng thái duyệt không hợp lệ" }, { status: 400 });
    }
    try {
      const submission = await reviewProjectSubmission(
        ids.submissionId,
        ids.id,
        ctx.user.id,
        status,
        String(body.reviewNote ?? "")
      );
      return NextResponse.json({ submission });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi duyệt";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  });
}
