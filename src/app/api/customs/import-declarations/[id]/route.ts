import { NextResponse } from "next/server";
import {
  deleteImportDeclaration,
  getImportDeclaration,
  markDeclarationValidated,
  updateImportDeclaration,
} from "@/lib/customs/repository";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { hasModuleAccess } from "@/lib/platform/access";
import { canManageCustoms } from "@/lib/projects/permissions";
import { CUSTOMS_MODULE_ID } from "@/lib/customs/constants";
import type { ImportDeclarationInput } from "@/lib/customs/types";

function parseId(params: { id: string }): number | null {
  const id = Number(params.id);
  return Number.isFinite(id) ? id : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;
  const { id: idStr } = await params;
  const id = parseId({ id: idStr });
  if (!id) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

  return ctx.run(async () => {
    if (!(await hasModuleAccess(ctx.companyId, CUSTOMS_MODULE_ID))) {
      return NextResponse.json({ error: "Module chưa được bật" }, { status: 403 });
    }
    const decl = await getImportDeclaration(id, ctx.companyId);
    if (!decl) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    return NextResponse.json(decl);
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;
  const { id: idStr } = await params;
  const id = parseId({ id: idStr });
  if (!id) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

  return ctx.run(async () => {
    if (!(await hasModuleAccess(ctx.companyId, CUSTOMS_MODULE_ID))) {
      return NextResponse.json({ error: "Module chưa được bật" }, { status: 403 });
    }
    if (!(await canManageCustoms(ctx.companyId, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    const body = (await req.json()) as ImportDeclarationInput & { action?: string };
    if (body.action === "validate") {
      await markDeclarationValidated(id, ctx.companyId);
      const decl = await getImportDeclaration(id, ctx.companyId);
      return NextResponse.json(decl);
    }
    const { action: _a, ...patch } = body;
    try {
      await updateImportDeclaration(id, ctx.companyId, patch as ImportDeclarationInput);
      const decl = await getImportDeclaration(id, ctx.companyId);
      return NextResponse.json(decl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lưu thất bại";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;
  const { id: idStr } = await params;
  const id = parseId({ id: idStr });
  if (!id) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

  return ctx.run(async () => {
    if (!(await hasModuleAccess(ctx.companyId, CUSTOMS_MODULE_ID))) {
      return NextResponse.json({ error: "Module chưa được bật" }, { status: 403 });
    }
    if (!(await canManageCustoms(ctx.companyId, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    try {
      await deleteImportDeclaration(id, ctx.companyId);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Xóa thất bại" },
        { status: 400 }
      );
    }
  });
}
