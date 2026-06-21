import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { createPO, listPOs } from "@/lib/wood/repository";

export async function GET() {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;
  return ctx.run(async () => NextResponse.json(await listPOs()));
}

export async function POST(request: Request) {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;

  return ctx.run(async () => {
    const body = await request.json();
    const id = await createPO(body.poNumber, body.customerName, body.requiredVolumeM3, body.notes);
    return NextResponse.json({ id });
  });
}
