import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { tenantQueryOne } from "@/lib/db/tenant";
import { listSpecies } from "@/lib/wood/repository";

export async function GET() {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;
  return ctx.run(async () => NextResponse.json(await listSpecies()));
}

export async function POST(request: Request) {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;

  return ctx.run(async () => {
    const { code, name, pricePerM3 } = await request.json();
    const row = await tenantQueryOne<{ id: number }>(
      "INSERT INTO wood_species (code, name, price_per_m3) VALUES ($1,$2,$3) RETURNING id",
      [code, name, Number(pricePerM3) || 0]
    );
    return NextResponse.json({ id: row!.id });
  });
}
