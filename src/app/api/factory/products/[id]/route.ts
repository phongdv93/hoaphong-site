import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import {
  deleteFactoryProduct,
  getFactoryProduct,
  getProductWithBom,
  updateFactoryProduct,
} from "@/lib/factory/products";
import type { FactoryProductPayload } from "@/lib/factory/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;

  const { id } = await params;
  const num = Number(id);
  if (!Number.isFinite(num)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  return ctx.run(async () => {
    const full = await getProductWithBom(num);
    if (!full) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(full);
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;

  const { id } = await params;
  const num = Number(id);
  if (!Number.isFinite(num)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  return ctx.run(async () => {
    const existing = await getFactoryProduct(num);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let body: FactoryProductPayload;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    try {
      await updateFactoryProduct(num, body);
      return NextResponse.json({ success: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lỗi lưu";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;

  const { id } = await params;
  const num = Number(id);
  if (!Number.isFinite(num)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  return ctx.run(async () => {
    const existing = await getFactoryProduct(num);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await deleteFactoryProduct(num);
    return NextResponse.json({ success: true });
  });
}
