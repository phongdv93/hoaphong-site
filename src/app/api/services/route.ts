import { NextResponse } from "next/server";
import { query, queryOne, slugify } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { Service } from "@/lib/types";

function mapRow(row: Record<string, unknown>): Service {
  return {
    id: row.id as number,
    slug: row.slug as string,
    name: row.name as string,
    description: row.description as string,
    icon: row.icon as string,
    features: row.features as string,
    published: row.published as number,
    sortOrder: row.sort_order as number,
  };
}

export async function GET(request: Request) {
  const admin = new URL(request.url).searchParams.get("admin") === "1";
  const rows = admin
    ? await query("SELECT * FROM services ORDER BY sort_order, id")
    : await query("SELECT * FROM services WHERE published = 1 ORDER BY sort_order, id");
  return NextResponse.json(rows.map(mapRow));
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const slug = body.slug || slugify(body.name);
  const features = typeof body.features === "string" ? body.features : JSON.stringify(body.features || []);

  const row = await queryOne<{ id: number }>(
    `INSERT INTO services (slug, name, description, icon, features, published, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [
      slug,
      body.name,
      body.description || "",
      body.icon || "sparkles",
      features,
      body.published !== false ? 1 : 0,
      body.sortOrder || 0,
    ]
  );
  return NextResponse.json({ id: row!.id });
}
