import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getEffectiveCompanyRole } from "@/lib/access/company-context";
import { getCompany, updateCompany } from "@/lib/projects/companies";

async function parseId(req: Request): Promise<number | null> {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  const id = Number(segs.at(-1));
  return Number.isFinite(id) ? id : null;
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = await parseId(req);
  if (!id) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

  const role = await getEffectiveCompanyRole(id, user.id);
  if (!role) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const company = await getCompany(id);
  if (!company) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json({ company, myRole: role });
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = await parseId(req);
  if (!id) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

  const role = await getEffectiveCompanyRole(id, user.id);
  if (role !== "admin") {
    return NextResponse.json({ error: "Chỉ admin được sửa" }, { status: 403 });
  }

  const body = await req.json();
  try {
    await updateCompany(id, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi cập nhật";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
