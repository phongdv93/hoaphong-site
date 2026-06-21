import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getModuleById, PLATFORM_MODULES } from "@/lib/platform/catalog";
import { hasModuleAccess, upsertCompanyModule } from "@/lib/platform/access";
import { isHoaphongPremium, PREMIUM_ONLY_MESSAGE } from "@/lib/platform/premium";

function parseCompanyId(req: Request): number | null {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = segs.indexOf("companies");
  const id = Number(segs[idx + 1]);
  return Number.isFinite(id) ? id : null;
}

function canTrialEnable(moduleId: string): boolean {
  const mod = PLATFORM_MODULES.find((m) => m.id === moduleId);
  return Boolean(mod && (mod.defaultForNewCompany || mod.alwaysOn));
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = parseCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "ID công ty không hợp lệ" }, { status: 400 });
  }

  if (!(await isHoaphongPremium(user.id))) {
    return NextResponse.json({ error: PREMIUM_ONLY_MESSAGE }, { status: 403 });
  }

  const body = await req.json();
  const moduleId = (body.moduleId as string | undefined)?.trim();
  if (!moduleId || !getModuleById(moduleId)) {
    return NextResponse.json({ error: "moduleId không hợp lệ" }, { status: 400 });
  }
  if (!canTrialEnable(moduleId)) {
    return NextResponse.json(
      { error: "Module này cần Hoa Phong bật qua Platform" },
      { status: 400 }
    );
  }

  if (await hasModuleAccess(companyId, moduleId)) {
    return NextResponse.json({ ok: true, alreadyEnabled: true });
  }

  const today = new Date().toISOString().slice(0, 10);
  await upsertCompanyModule(
    companyId,
    moduleId,
    {
      enabled: true,
      startedAt: today,
      monthlyFee: 0,
      enabledBy: user.id,
      notes: "Bật bởi Hoa Phong Premium",
    },
    user.id
  );

  return NextResponse.json({ ok: true, moduleId });
}
