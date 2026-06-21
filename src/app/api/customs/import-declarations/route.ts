import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import {
  createImportDeclaration,
  createImportDeclarationFromPreset,
  listImportDeclarations,
} from "@/lib/customs/repository";
import { hasModuleAccess } from "@/lib/platform/access";
import { canManageCustoms } from "@/lib/projects/permissions";
import { CUSTOMS_MODULE_ID } from "@/lib/customs/constants";
import type { ImportDeclarationInput } from "@/lib/customs/types";

export async function GET() {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;

  return ctx.run(async () => {
    if (!(await hasModuleAccess(ctx.companyId, CUSTOMS_MODULE_ID))) {
      return NextResponse.json({ error: "Module chưa được bật" }, { status: 403 });
    }
    const items = await listImportDeclarations(ctx.companyId);
    return NextResponse.json({ items });
  });
}

export async function POST(req: Request) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;

  return ctx.run(async () => {
    if (!(await hasModuleAccess(ctx.companyId, CUSTOMS_MODULE_ID))) {
      return NextResponse.json({ error: "Module chưa được bật" }, { status: 403 });
    }
    if (!(await canManageCustoms(ctx.companyId, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    const body = (await req.json()) as ImportDeclarationInput & { preset?: string };
    const id = body.preset
      ? await createImportDeclarationFromPreset(ctx.companyId, body.preset, ctx.user.id)
      : await createImportDeclaration(ctx.companyId, body, ctx.user.id);
    return NextResponse.json({ id });
  });
}
