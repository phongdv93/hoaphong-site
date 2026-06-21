import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { hasModuleAccess } from "@/lib/platform/access";
import { canManageCustoms } from "@/lib/projects/permissions";
import { CUSTOMS_MODULE_ID } from "@/lib/customs/constants";
import {
  findCustomsMasterByCode,
  importCustomsMasterData,
  searchCustomsMasterData,
  type CustomsMasterType,
} from "@/lib/customs/master-data";
import { ensureCustomsMasterDataSeeded } from "@/lib/customs/seed/ensure-seeded";
import { looksLikeRawExcelPaste } from "@/lib/customs/parse-master-spreadsheet";

const ALLOWED_TYPES: CustomsMasterType[] = [
  "customs_office",
  "border_gate",
  "import_port",
  "export_port",
  "warehouse",
  "transport_mode",
  "procedure_type",
];

function parseType(v: unknown): CustomsMasterType | null {
  const s = String(v ?? "");
  return (ALLOWED_TYPES as string[]).includes(s) ? (s as CustomsMasterType) : null;
}

export async function GET(req: Request) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;
  const url = new URL(req.url);
  const type = parseType(url.searchParams.get("type"));
  const q = url.searchParams.get("q") ?? "";
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "20")));
  if (!type) {
    return NextResponse.json({ error: "type không hợp lệ" }, { status: 400 });
  }

  return ctx.run(async () => {
    if (!(await hasModuleAccess(ctx.companyId, CUSTOMS_MODULE_ID))) {
      return NextResponse.json({ error: "Module chưa được bật" }, { status: 403 });
    }
    await ensureCustomsMasterDataSeeded(ctx.companyId);
    const exactCode = url.searchParams.get("exact")?.trim();
    if (exactCode) {
      const item = await findCustomsMasterByCode(ctx.companyId, type, exactCode);
      return NextResponse.json({
        verified: Boolean(item),
        item: item
          ? { code: item.code, name: item.name, extra: item.extra }
          : null,
      });
    }
    const items = await searchCustomsMasterData(ctx.companyId, type, q, limit);
    return NextResponse.json({ items, total: items.length });
  });
}

export async function POST(req: Request) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;
  const body = (await req.json().catch(() => ({}))) as {
    type?: CustomsMasterType;
    source?: string;
    versionTag?: string;
    lines?: string;
  };
  const type = parseType(body.type);
  if (!type) {
    return NextResponse.json({ error: "type không hợp lệ" }, { status: 400 });
  }

  return ctx.run(async () => {
    if (!(await hasModuleAccess(ctx.companyId, CUSTOMS_MODULE_ID))) {
      return NextResponse.json({ error: "Module chưa được bật" }, { status: 403 });
    }
    if (!(await canManageCustoms(ctx.companyId, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    const rawLines = String(body.lines ?? "");
    if (looksLikeRawExcelPaste(rawLines)) {
      return NextResponse.json(
        {
          error:
            "Bạn đang dán nhầm file Excel (.xlsx). Hãy dùng nút «Chọn file Excel» hoặc mở Excel → copy bảng mã/tên → dán vào đây.",
        },
        { status: 400 }
      );
    }
    const rows = rawLines
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (!rows.length) {
      return NextResponse.json({ error: "Không có dữ liệu để import" }, { status: 400 });
    }
    const items = rows.map((line) => {
      const cols = line.split(/\t|;|\|/).map((x) => x.trim());
      return { code: cols[0] ?? "", name: cols[1] ?? "", extra: cols[2] ?? "" };
    });
    const result = await importCustomsMasterData(
      ctx.companyId,
      type,
      items,
      body.source?.trim() || "customs-file",
      body.versionTag?.trim() || ""
    );
    return NextResponse.json(result);
  });
}

