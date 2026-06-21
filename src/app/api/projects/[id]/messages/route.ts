import { NextResponse } from "next/server";
import { loadProjectInTenant } from "@/lib/projects/api-tenant";
import { canViewProject } from "@/lib/projects/permissions";
import { createProjectMessage } from "@/lib/projects/workspace";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  const ctx = await loadProjectInTenant(id);
  if ("err" in ctx) return ctx.err;

  const body = await req.json();
  const text = String(body.body ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Nội dung trống" }, { status: 400 });
  }

  return ctx.run(async () => {
    const view = await canViewProject(id, ctx.user.id);
    if (!view.ok) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    const message = await createProjectMessage(id, ctx.user.id, text);
    return NextResponse.json({ message });
  });
}
