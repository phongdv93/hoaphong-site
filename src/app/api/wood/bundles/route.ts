import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { createBundle, listBundles } from "@/lib/wood/repository";
import type { BoardInput } from "@/lib/wood/types";

export async function GET() {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;
  return ctx.run(async () => NextResponse.json(await listBundles()));
}

export async function POST(request: Request) {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;

  return ctx.run(async () => {
  try {
    const body = await request.json();
    const id = await createBundle({
      speciesId: body.speciesId,
      packingListNo: body.packingListNo,
      supplier: body.supplier,
      thicknessMm: Number(body.thicknessMm),
      lengthMm: Number(body.lengthMm),
      photoEndGrain: body.photoEndGrain,
      photoPackingList: body.photoPackingList,
      photosJson: body.photosJson,
      notes: body.notes,
      layoutGrid: body.layoutGrid,
      boards: body.boards as BoardInput[],
    });
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lỗi tạo kiện" }, { status: 400 });
  }
  });
}
