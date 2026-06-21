import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { hasModuleAccess } from "@/lib/platform/access";
import { canManageCustoms } from "@/lib/projects/permissions";
import { CUSTOMS_MODULE_ID } from "@/lib/customs/constants";
import { signXmlWithAgent } from "@/lib/customs/signing-agent";

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
    const body = (await req.json().catch(() => ({}))) as {
      thumbprint?: string;
      sampleXml?: string;
    };
    const thumbprint = String(body.thumbprint ?? "").trim();
    if (!thumbprint) {
      return NextResponse.json({ error: "Thiếu thumbprint chứng thư." }, { status: 400 });
    }

    const sampleXml =
      body.sampleXml?.trim() ||
      `<VNACCS_TEST><CompanyId>${ctx.companyId}</CompanyId><Timestamp>${new Date().toISOString()}</Timestamp></VNACCS_TEST>`;

    const result = await signXmlWithAgent(sampleXml, thumbprint);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      message: result.message,
      cert: result.cert,
      signedXmlPreview: (result.signedXml ?? "").slice(0, 500),
    });
  });
}
