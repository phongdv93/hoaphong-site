import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getEffectiveCompanyRole } from "@/lib/access/company-context";
import {
  getActiveCompanyId,
  getCompany,
  setActiveCompanyId,
} from "@/lib/projects/companies";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = await getActiveCompanyId();
  return NextResponse.json({ companyId: id });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const companyId = body.companyId == null ? null : Number(body.companyId);

  if (companyId !== null) {
    const company = await getCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: "Không tìm thấy công ty" }, { status: 404 });
    }
    const role = await getEffectiveCompanyRole(companyId, user.id);
    if (!role) {
      return NextResponse.json(
        { error: "Bạn không thuộc công ty này" },
        { status: 403 }
      );
    }
  }

  await setActiveCompanyId(companyId);
  return NextResponse.json({ companyId });
}
