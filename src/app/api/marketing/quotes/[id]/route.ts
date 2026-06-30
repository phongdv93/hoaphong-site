import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import {
  deleteMarketingQuote,
  getMarketingQuote,
  updateMarketingQuote,
} from "@/lib/marketing/quotes";
import { normalizeQuoteDocument } from "@/lib/quote/calc";
import {
  formatMissingQuoteColumnsMessage,
  getMissingQuoteRequiredColumns,
} from "@/lib/quote/required-columns";
import type { QuoteDocument } from "@/lib/quote/types";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const tenant = await requireActiveTenant();
  if (tenant.error) return tenant.error;
  const { id } = await ctx.params;
  const quoteId = Number(id);
  if (!Number.isFinite(quoteId)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }
  return tenant.run(async () => {
    const row = await getMarketingQuote(quoteId);
    if (!row) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    return NextResponse.json(row);
  });
}

export async function PUT(request: Request, ctx: RouteCtx) {
  const tenant = await requireActiveTenant();
  if (tenant.error) return tenant.error;
  const { id } = await ctx.params;
  const quoteId = Number(id);
  if (!Number.isFinite(quoteId)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  return tenant.run(async () => {
    let body: { document?: QuoteDocument };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (!body.document) {
      return NextResponse.json({ error: "Thiếu document" }, { status: 400 });
    }
    const exists = await getMarketingQuote(quoteId);
    if (!exists) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    const doc = normalizeQuoteDocument(body.document as unknown as Record<string, unknown>);
    const missing = getMissingQuoteRequiredColumns(doc);
    if (missing.length) {
      return NextResponse.json(
        { error: formatMissingQuoteColumnsMessage(missing) },
        { status: 400 }
      );
    }
    await updateMarketingQuote(quoteId, doc);
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const tenant = await requireActiveTenant();
  if (tenant.error) return tenant.error;
  const { id } = await ctx.params;
  const quoteId = Number(id);
  if (!Number.isFinite(quoteId)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }
  return tenant.run(async () => {
    await deleteMarketingQuote(quoteId);
    return NextResponse.json({ ok: true });
  });
}
