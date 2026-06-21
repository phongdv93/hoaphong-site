import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { createCustomer, listCustomers } from "@/lib/marketing/customers";

export async function GET() {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;
  return ctx.run(async () => NextResponse.json(await listCustomers()));
}

export async function POST(request: Request) {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;

  return ctx.run(async () => {
  const body = await request.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Tên khách hàng bắt buộc" }, { status: 400 });
  }

  const id = await createCustomer({
    code: body.code,
    name: body.name.trim(),
    type: body.type || "le",
    taxCode: body.taxCode || "",
    phone: body.phone || "",
    email: body.email || "",
    address: body.address || "",
    contactPerson: body.contactPerson || "",
    contactPhone: body.contactPhone || "",
    notes: body.notes || "",
    status: body.status || "active",
  });

  return NextResponse.json({ id });
  });
}
