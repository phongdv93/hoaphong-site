import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import {
  createMarketingQuote,
  listMarketingQuotes,
} from "@/lib/marketing/quotes";
import { normalizeQuoteDocument } from "@/lib/quote/calc";
import type { QuoteDocument } from "@/lib/quote/types";

export async function GET() {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;
  return ctx.run(async () => NextResponse.json(await listMarketingQuotes()));
}

export async function POST(request: Request) {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;

  return ctx.run(async () => {
    let body: { document?: QuoteDocument };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (!body.document) {
      return NextResponse.json({ error: "Thiếu document" }, { status: 400 });
    }
    const doc = normalizeQuoteDocument(body.document as unknown as Record<string, unknown>);
    const id = await createMarketingQuote(doc, ctx.user.id);
    return NextResponse.json({ id });
  });
}
