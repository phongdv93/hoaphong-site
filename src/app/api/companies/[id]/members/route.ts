import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getEffectiveCompanyRole } from "@/lib/access/company-context";
import { isHoaphongPremium } from "@/lib/platform/premium";
import {
  listCompanyMembers,
  removeCompanyMember,
  upsertCompanyMember,
} from "@/lib/projects/companies";
import type { CompanyMemberRole } from "@/lib/projects/types";

function parseId(req: Request): number | null {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = segs.indexOf("companies");
  const id = Number(segs[idx + 1]);
  return Number.isFinite(id) ? id : null;
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseId(req);
  if (!id) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

  const role = await getEffectiveCompanyRole(id, user.id);
  if (!role) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const rows = await listCompanyMembers(id);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseId(req);
  if (!id) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

  const myRole = await getEffectiveCompanyRole(id, user.id);
  if (myRole !== "admin" && !(await isHoaphongPremium(user.id))) {
    return NextResponse.json(
      { error: "Chỉ admin công ty được mời thành viên" },
      { status: 403 }
    );
  }

  const body = await req.json();
  let userId: number | null = body.userId ?? null;
  const email = (body.email as string | undefined)?.trim().toLowerCase();
  if (!userId && email) {
    const u = await query<{ id: number }>(
      `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`,
      [email]
    );
    if (u.length === 0) {
      return NextResponse.json(
        {
          error: `Chưa có tài khoản ${email} — dùng HR → Tạo tài khoản mới hoặc nhân viên tự đăng ký qua link công ty`,
        },
        { status: 404 }
      );
    }
    userId = u[0].id;
  }
  if (!userId) {
    return NextResponse.json({ error: "Cần userId hoặc email" }, { status: 400 });
  }
  const memberRole = (body.role as CompanyMemberRole) || "member";
  try {
    await upsertCompanyMember(id, userId, memberRole, { actorUserId: user.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseId(req);
  if (!id) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

  const role = await getEffectiveCompanyRole(id, user.id);
  if (role !== "admin") {
    return NextResponse.json({ error: "Chỉ admin được xóa thành viên" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = Number(searchParams.get("userId"));
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "userId không hợp lệ" }, { status: 400 });
  }
  if (userId === user.id) {
    return NextResponse.json(
      { error: "Không thể tự xóa khỏi công ty bằng đường này" },
      { status: 400 }
    );
  }
  try {
    await removeCompanyMember(id, userId, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
