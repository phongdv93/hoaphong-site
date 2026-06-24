import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { importQuoteLinesToCatalog } from "@/lib/factory/products";

const schema = z.object({
  quoteNumber: z.string().optional(),
  quoteName: z.string().optional(),
  lines: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        unit: z.string().optional(),
        price: z.string().optional(),
      })
    )
    .min(1, "Không có dòng hàng để lưu"),
});

export async function POST(request: Request) {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;

  return ctx.run(async () => {
    try {
      const body = schema.parse(await request.json());
      const quoteRef =
        body.quoteNumber?.trim() ||
        body.quoteName?.trim() ||
        `BG-${new Date().toISOString().slice(0, 10)}`;
      const result = await importQuoteLinesToCatalog(quoteRef, body.lines);
      return NextResponse.json({
        ok: true,
        ...result,
        message: `Đã lưu ${result.created} sản phẩm vào danh mục.`,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: err.errors[0]?.message ?? "Dữ liệu không hợp lệ" },
          { status: 400 }
        );
      }
      const msg = err instanceof Error ? err.message : "Lỗi lưu danh mục";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  });
}
