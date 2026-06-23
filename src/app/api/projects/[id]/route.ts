import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { runWithTenantCompany } from "@/lib/db/tenant-context";
import { resolveActiveCompanyForUser } from "@/lib/projects/companies";
import { canEditProject, canEditProjectMeta, canViewProject } from "@/lib/projects/permissions";
import {
  deleteProject,
  getProject,
  listMembers,
  listPhases,
  updateProject,
} from "@/lib/projects/repository";

async function resolveProject(req: Request) {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const url = new URL(req.url);
  const id = Number(url.pathname.split("/").filter(Boolean).at(-1));
  if (!Number.isFinite(id)) {
    return { error: NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 }) };
  }

  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) {
    return { error: NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 }) };
  }

  return { user, projectId: id, companyId: active.companyId };
}

export async function GET(req: Request) {
  const ctx = await resolveProject(req);
  if ("error" in ctx) return ctx.error;

  return runWithTenantCompany(ctx.companyId, async () => {
    const project = await getProject(ctx.projectId, ctx.companyId);
    if (!project) {
      return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });
    }
    const view = await canViewProject(project.id, ctx.user.id);
    if (!view.ok) {
      return NextResponse.json(
        { error: "Bạn không thuộc dự án này" },
        { status: 403 }
      );
    }
    const [phases, members] = await Promise.all([
      listPhases(project.id),
      listMembers(project.id),
    ]);
    return NextResponse.json({ project, phases, members, myRole: view.role });
  });
}

export async function PUT(req: Request) {
  const ctx = await resolveProject(req);
  if ("error" in ctx) return ctx.error;

  return runWithTenantCompany(ctx.companyId, async () => {
    const project = await getProject(ctx.projectId, ctx.companyId);
    if (!project) {
      return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });
    }
    const body = await req.json();
    const metaKeys = [
      "code",
      "name",
      "customerId",
      "contractValue",
      "contractSignedAt",
      "startDate",
      "expectedEndDate",
      "actualEndDate",
      "address",
      "notes",
      "supplierAddress",
      "exportCountry",
      "managerUserId",
    ] as const;
    const touchesMeta = metaKeys.some((k) => k in body);

    if (touchesMeta && !(await canEditProjectMeta(project.id, ctx.user.id))) {
      return NextResponse.json(
        { error: "Chỉ quản trị công ty mới được sửa thông tin dự án" },
        { status: 403 }
      );
    }
    if (!(await canEditProject(project.id, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền sửa" }, { status: 403 });
    }
    try {
      await updateProject(project.id, ctx.companyId, body);
      return NextResponse.json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi cập nhật";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  });
}

export async function DELETE(req: Request) {
  const ctx = await resolveProject(req);
  if ("error" in ctx) return ctx.error;

  return runWithTenantCompany(ctx.companyId, async () => {
    const project = await getProject(ctx.projectId, ctx.companyId);
    if (!project) {
      return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });
    }
    if (!(await canEditProject(project.id, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền xóa" }, { status: 403 });
    }
    await deleteProject(project.id, ctx.companyId);
    return NextResponse.json({ ok: true });
  });
}
