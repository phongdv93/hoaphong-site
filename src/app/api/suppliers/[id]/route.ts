import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { getSupplier, updateSupplier } from "@/lib/suppliers/repository";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;
  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  return ctx.run(async () => {
    const supplier = await getSupplier(ctx.companyId, id);
    if (!supplier) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    return NextResponse.json({ supplier });
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;
  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  const body = (await req.json()) as {
    name?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
  };

  return ctx.run(async () => {
    try {
      const supplier = await updateSupplier(ctx.companyId, id, body);
      return NextResponse.json({ supplier });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Cập nhật thất bại" },
        { status: 400 }
      );
    }
  });
}
