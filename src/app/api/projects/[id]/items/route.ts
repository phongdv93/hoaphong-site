import { NextResponse } from "next/server";
import { runWithTenantCompany } from "@/lib/db/tenant-context";
import { getSessionUser } from "@/lib/auth";
import { resolveActiveCompanyForUser } from "@/lib/projects/companies";
import { canEditPhase } from "@/lib/projects/permissions";
import {
  copyProjectItemsFromProject,
  createProjectItem,
  createProjectItemsFromCatalogNames,
  deleteAllProjectItems,
  getProject,
  listProjectItems,
} from "@/lib/projects/repository";

function parseProjectId(req: Request): number | null {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = segs.indexOf("projects");
  const id = Number(segs[idx + 1]);
  return Number.isFinite(id) ? id : null;
}

async function loadCtx(req: Request) {
  const user = await getSessionUser();
  if (!user) return { err: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const projectId = parseProjectId(req);
  if (!projectId) return { err: NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 }) };

  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) return { err: NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 }) };

  return { user, projectId, companyId: active.companyId };
}

export async function GET(req: Request) {
  const ctx = await loadCtx(req);
  if ("err" in ctx) return ctx.err;

  return runWithTenantCompany(ctx.companyId, async () => {
    const project = await getProject(ctx.projectId, ctx.companyId);
    if (!project) {
      return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });
    }
    const items = await listProjectItems(ctx.projectId);
    return NextResponse.json(items);
  });
}

export async function POST(req: Request) {
  const ctx = await loadCtx(req);
  if ("err" in ctx) return ctx.err;
  const body = await req.json();

  return runWithTenantCompany(ctx.companyId, async () => {
    const project = await getProject(ctx.projectId, ctx.companyId);
    if (!project) {
      return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });
    }
    if (!(await canEditPhase(ctx.projectId, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const copyFrom = Number(body.copyFromProjectId);
    if (Number.isFinite(copyFrom) && copyFrom > 0) {
      try {
        const copied = await copyProjectItemsFromProject(ctx.projectId, copyFrom);
        return NextResponse.json({ copied });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Không sao chép được hạng mục";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    if (Array.isArray(body.rows)) {
      const result = await createProjectItemsFromCatalogNames({
        projectId: ctx.projectId,
        rows: body.rows.map(
          (r: { name?: string; description?: string; quantity?: number; unit?: string }) => ({
            name: String(r.name ?? "").trim(),
            description: r.description,
            quantity: r.quantity != null ? Number(r.quantity) : undefined,
            unit: r.unit,
          })
        ),
        baseSortOrder: body.baseSortOrder,
      });
      return NextResponse.json(result);
    }

    const factoryProductId = Number(body.factoryProductId);
    if (!Number.isFinite(factoryProductId) || factoryProductId <= 0) {
      return NextResponse.json(
        {
          error:
            "Chọn sản phẩm từ danh mục (ERP Báo giá → Danh mục SP → thêm vào dự án khi khách đặt hàng)",
        },
        { status: 400 }
      );
    }

    const id = await createProjectItem({
      projectId: ctx.projectId,
      factoryProductId,
      sortOrder: body.sortOrder,
      quantity: body.quantity != null ? Number(body.quantity) : undefined,
      quantityDone: body.quantityDone != null ? Number(body.quantityDone) : undefined,
      unit: body.unit,
    });
    return NextResponse.json({ id });
  });
}

export async function DELETE(req: Request) {
  const ctx = await loadCtx(req);
  if ("err" in ctx) return ctx.err;

  return runWithTenantCompany(ctx.companyId, async () => {
    const project = await getProject(ctx.projectId, ctx.companyId);
    if (!project) {
      return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });
    }
    if (!(await canEditPhase(ctx.projectId, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    const deleted = await deleteAllProjectItems(ctx.projectId);
    return NextResponse.json({ ok: true, deleted });
  });
}
