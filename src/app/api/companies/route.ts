import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listCompaniesForUser } from "@/lib/access/company-context";
import { isHoaphongPremium, PREMIUM_ONLY_MESSAGE } from "@/lib/platform/premium";
import { createCompany } from "@/lib/projects/companies";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await listCompaniesForUser(user.id);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Tên công ty bắt buộc" }, { status: 400 });
  }

  if (!(await isHoaphongPremium(user.id))) {
    return NextResponse.json({ error: PREMIUM_ONLY_MESSAGE }, { status: 403 });
  }

  try {
    const id = await createCompany({
      code: body.code,
      name: body.name.trim(),
      shortName: body.shortName,
      taxCode: body.taxCode,
      phone: body.phone,
      email: body.email,
      address: body.address,
      logoUrl: body.logoUrl,
      notes: body.notes,
      createdBy: user.id,
    });
    return NextResponse.json({ id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi tạo công ty";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
