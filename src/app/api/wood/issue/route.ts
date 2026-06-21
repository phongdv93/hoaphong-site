import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { issueBoard, issueBoards } from "@/lib/wood/repository";

export async function POST(request: Request) {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;

  return ctx.run(async () => {
    try {
      const body = await request.json();
      const poId = Number(body.poId);
      if (!poId) return NextResponse.json({ error: "Thiếu PO" }, { status: 400 });

      const boardIds: number[] = Array.isArray(body.boardIds)
        ? body.boardIds.map(Number).filter(Boolean)
        : body.boardId
          ? [Number(body.boardId)]
          : [];

      if (!boardIds.length) return NextResponse.json({ error: "Chưa chọn thanh" }, { status: 400 });

      if (boardIds.length === 1) {
        await issueBoard(boardIds[0], poId);
        return NextResponse.json({ success: true, issued: 1 });
      }

      const result = await issueBoards(boardIds, poId);
      if (!result.issued) {
        return NextResponse.json({ error: result.errors[0] || "Lỗi phát gỗ" }, { status: 400 });
      }
      return NextResponse.json({ success: true, issued: result.issued, errors: result.errors });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Lỗi phát gỗ" },
        { status: 400 }
      );
    }
  });
}
