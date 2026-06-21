import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { getImportDeclaration } from "@/lib/customs/repository";
import { hasModuleAccess } from "@/lib/platform/access";
import { CUSTOMS_MODULE_ID } from "@/lib/customs/constants";
import { buildIdaEcusXml } from "@/lib/customs/ida-xml-export";
import { parseDeclarationMeta } from "@/lib/customs/declaration-meta";
import { attachmentContentDisposition } from "@/lib/customs/http-download";

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

    const meta = decl.meta ?? parseDeclarationMeta(null);
    const lines = decl.lines ?? [];
    const { xml, schemaVersion } = buildIdaEcusXml(decl, meta, lines);

    const safeRef = (decl.referenceCode || `ida-${id}`).replace(/[^\w.-]+/g, "_");
    const filename = `IDA_${safeRef}_${schemaVersion}.xml`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": attachmentContentDisposition(filename),
      },
    });
  });
}
