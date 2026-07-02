import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { createFactoryProduct } from "@/lib/factory/products";
import type { FactoryProductPayload } from "@/lib/factory/types";

export async function POST(request: Request) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;

  const body = (await request.json()) as { items?: FactoryProductPayload[] };
  const items = Array.isArray(body.items) ? body.items : [];

  return ctx.run(async () => {
    const ids: number[] = [];
    const errors: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      try {
        const id = await createFactoryProduct(item);
        ids.push(id);
      } catch (e) {
        errors.push(`Dòng ${i + 1}: ${e instanceof Error ? e.message : "Lỗi"}`);
      }
    }
    return NextResponse.json({ ids, created: ids.length, errors });
  });
}
