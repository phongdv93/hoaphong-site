import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { getImportDeclaration } from "@/lib/customs/repository";
import { hasModuleAccess } from "@/lib/platform/access";
import { CUSTOMS_MODULE_ID } from "@/lib/customs/constants";
import { parseDeclarationMeta } from "@/lib/customs/declaration-meta";
import { attachmentContentDisposition } from "@/lib/customs/http-download";
import { buildToKhaiHQ7NWorkbook } from "@/lib/customs/to-khai-hq7n-export";

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

    try {
      const meta = decl.meta ?? parseDeclarationMeta(null);
      const { buffer, filename, warnings } = buildToKhaiHQ7NWorkbook(
        decl,
        meta,
        decl.lines ?? []
      );

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": attachmentContentDisposition(filename),
          "X-Customs-Export-Warnings": warnings.join("; ").replace(/[^\x00-\x7F]/g, "?").slice(0, 400),
        },
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Xuất ToKhaiHQ7N thất bại" },
        { status: 500 }
      );
    }
  });
}
