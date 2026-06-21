import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { getBundle } from "@/lib/wood/repository";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;

  const { id } = await params;
  return ctx.run(async () => {
    const bundle = await getBundle(Number(id));
    if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(bundle);
  });
}
