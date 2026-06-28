import { NextResponse } from "next/server";
import { loadProjectInTenant } from "@/lib/projects/api-tenant";
import { canEditProject, canViewProject } from "@/lib/projects/permissions";
import {
  createProjectContract,
  isValidContractStatus,
  listProjectContracts,
} from "@/lib/projects/contracts";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  const ctx = await loadProjectInTenant(id);
  if ("err" in ctx) return ctx.err;

  return ctx.run(async () => {
    const view = await canViewProject(id, ctx.user.id);
    if (!view.ok) {
      return NextResponse.json({ error: "Không có quyền xem" }, { status: 403 });
    }
    const contracts = await listProjectContracts(id);
    return NextResponse.json({ contracts });
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  const ctx = await loadProjectInTenant(id);
  if ("err" in ctx) return ctx.err;

  const body = await req.json();
  return ctx.run(async () => {
    if (!(await canEditProject(id, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền sửa" }, { status: 403 });
    }
    const contractNo = String(body.contractNo ?? "").trim();
    if (!contractNo) {
      return NextResponse.json({ error: "Số hợp đồng bắt buộc" }, { status: 400 });
    }
    const status = String(body.status ?? "draft");
    if (!isValidContractStatus(status)) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
    }
    try {
      const contract = await createProjectContract({
        projectId: id,
        contractNo,
        title: String(body.title ?? ""),
        partyName: String(body.partyName ?? ""),
        value: Number(body.value ?? 0),
        signedAt: body.signedAt || null,
        status,
        notes: String(body.notes ?? ""),
        createdBy: ctx.user.id,
      });
      return NextResponse.json({ contract });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không tạo được hợp đồng";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  });
}
