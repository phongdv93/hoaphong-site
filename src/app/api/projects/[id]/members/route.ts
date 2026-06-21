import { NextResponse } from "next/server";
import { getCompanyRole } from "@/lib/projects/companies";
import { loadProjectInTenant } from "@/lib/projects/api-tenant";
import { canManageMembers } from "@/lib/projects/permissions";
import { listMembers, removeMember, upsertMember } from "@/lib/projects/repository";
import type { ProjectMemberRole } from "@/lib/projects/types";

function parseId(req: Request): number | null {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = segs.indexOf("projects");
  const id = Number(segs[idx + 1]);
  return Number.isFinite(id) ? id : null;
}

export async function GET(req: Request) {
  const id = parseId(req);
  if (!id) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

  const ctx = await loadProjectInTenant(id);
  if ("err" in ctx) return ctx.err;

  return ctx.run(async () => {
    const rows = await listMembers(ctx.project.id);
    return NextResponse.json(rows);
  });
}

export async function POST(req: Request) {
  const id = parseId(req);
  if (!id) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

  const ctx = await loadProjectInTenant(id);
  if ("err" in ctx) return ctx.err;

  const body = await req.json();
  return ctx.run(async () => {
    if (!(await canManageMembers(ctx.project.id, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    const userId = Number(body.userId);
    const role = (body.role as ProjectMemberRole) || "member";
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "userId không hợp lệ" }, { status: 400 });
    }
    const companyRole = await getCompanyRole(ctx.companyId, userId);
    if (!companyRole) {
      return NextResponse.json(
        { error: "User chưa thuộc công ty — hãy mời vào công ty trước" },
        { status: 400 }
      );
    }
    await upsertMember(ctx.project.id, userId, role, ctx.companyId);
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  const id = parseId(req);
  if (!id) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

  const ctx = await loadProjectInTenant(id);
  if ("err" in ctx) return ctx.err;

  const { searchParams } = new URL(req.url);
  const userId = Number(searchParams.get("userId"));

  return ctx.run(async () => {
    if (!(await canManageMembers(ctx.project.id, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "userId không hợp lệ" }, { status: 400 });
    }
    await removeMember(ctx.project.id, userId);
    return NextResponse.json({ ok: true });
  });
}
