import { NextResponse } from "next/server";
import { loadProjectInTenant } from "@/lib/projects/api-tenant";
import { canEditProject } from "@/lib/projects/permissions";
import {
  deleteProjectContract,
  isValidContractStatus,
  updateProjectContract,
} from "@/lib/projects/contracts";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; contractId: string }> }
) {
  const { id: idStr, contractId: cidStr } = await params;
  const id = Number(idStr);
  const contractId = Number(cidStr);
  if (!Number.isFinite(id) || !Number.isFinite(contractId)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  const ctx = await loadProjectInTenant(id);
  if ("err" in ctx) return ctx.err;

  const body = await req.json();
  return ctx.run(async () => {
    if (!(await canEditProject(id, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền sửa" }, { status: 403 });
    }
    if (body.status != null && !isValidContractStatus(String(body.status))) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
    }
    try {
      await updateProjectContract(contractId, id, {
        contractNo: body.contractNo != null ? String(body.contractNo) : undefined,
        title: body.title != null ? String(body.title) : undefined,
        partyName: body.partyName != null ? String(body.partyName) : undefined,
        value: body.value != null ? Number(body.value) : undefined,
        signedAt: body.signedAt === undefined ? undefined : body.signedAt || null,
        status: body.status,
        notes: body.notes != null ? String(body.notes) : undefined,
      });
      return NextResponse.json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không cập nhật được";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; contractId: string }> }
) {
  const { id: idStr, contractId: cidStr } = await params;
  const id = Number(idStr);
  const contractId = Number(cidStr);
  if (!Number.isFinite(id) || !Number.isFinite(contractId)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  const ctx = await loadProjectInTenant(id);
  if ("err" in ctx) return ctx.err;

  return ctx.run(async () => {
    if (!(await canEditProject(id, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền xóa" }, { status: 403 });
    }
    await deleteProjectContract(contractId, id);
    return NextResponse.json({ ok: true });
  });
}
