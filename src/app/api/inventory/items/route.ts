import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { createInventoryItem, searchInventoryItems } from "@/lib/inventory/items";
import type { InventoryCategory } from "@/lib/inventory/items";

export async function GET(request: Request) {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;

  return ctx.run(async () => {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const cat = (searchParams.get("category") || "hardware") as InventoryCategory;
    const items = await searchInventoryItems(q, cat === "packaging" ? "packaging" : "hardware", 50);
    return NextResponse.json(items);
  });
}

export async function POST(request: Request) {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;

  return ctx.run(async () => {
    try {
      const body = await request.json();
      const r = await createInventoryItem({
        name: body.name,
        category: body.category || "hardware",
        unit: body.unit,
        code: body.code,
        notes: body.notes,
      });
      return NextResponse.json(r);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Lỗi" },
        { status: 400 }
      );
    }
  });
}
