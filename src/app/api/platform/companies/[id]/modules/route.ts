import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform/guard";
import { listCompanyModules, upsertCompanyModule } from "@/lib/platform/access";
import { PLATFORM_MODULES } from "@/lib/platform/catalog";

function parseCompanyId(req: Request): number | null {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = segs.indexOf("companies");
  const id = Number(segs[i + 1]);
  return Number.isFinite(id) ? id : null;
}

export async function GET(req: Request) {
  const adminId = await requirePlatformAdmin();
  if (!adminId) return NextResponse.json({ error: "Cần Platform Admin" }, { status: 403 });

  const companyId = parseCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

  const subs = await listCompanyModules(companyId);
  // Trả về cả catalog để UI hiển thị các module chưa có row
  return NextResponse.json({ catalog: PLATFORM_MODULES, subscriptions: subs });
}

export async function PUT(req: Request) {
  const adminId = await requirePlatformAdmin();
  if (!adminId) return NextResponse.json({ error: "Cần Platform Admin" }, { status: 403 });

  const companyId = parseCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

  const body = await req.json();
  if (!body.moduleId) {
    return NextResponse.json({ error: "Thiếu moduleId" }, { status: 400 });
  }

  try {
    await upsertCompanyModule(
      companyId,
      body.moduleId,
      {
        enabled: body.enabled,
        startedAt: body.startedAt ?? null,
        expiresAt: body.expiresAt ?? null,
        monthlyFee: body.monthlyFee == null ? undefined : Number(body.monthlyFee),
        notes: body.notes,
        enabledBy: adminId,
      },
      adminId
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi cập nhật";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
