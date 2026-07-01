import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { EINVOICE_MODULE_ID } from "@/lib/einvoice/constants";
import { listEInvoices } from "@/lib/einvoice/repository";
import { hasModuleAccess } from "@/lib/platform/access";

export async function GET(req: Request) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;

  return ctx.run(async () => {
    if (!(await hasModuleAccess(ctx.companyId, EINVOICE_MODULE_ID))) {
      return NextResponse.json({ error: "Module chưa được bật" }, { status: 403 });
    }

    const url = new URL(req.url);
    const direction = url.searchParams.get("direction") ?? undefined;
    const limit = Number(url.searchParams.get("limit") ?? 100);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    const items = await listEInvoices(ctx.companyId, { direction, limit, offset });
    return NextResponse.json({ items });
  });
}
