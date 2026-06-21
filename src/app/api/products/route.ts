import { NextResponse } from "next/server";
import { query, queryOne, slugify } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { Product } from "@/lib/types";

function mapRow(row: Record<string, unknown>): Product {
  return {
    id: row.id as number,
    slug: row.slug as string,
    name: row.name as string,
    description: row.description as string,
    price: row.price as string,
    image: row.image as string,
    category: row.category as string,
    featured: row.featured as number,
    published: row.published as number,
    sortOrder: row.sort_order as number,
  };
}

export async function GET(request: Request) {
  const admin = new URL(request.url).searchParams.get("admin") === "1";
  const rows = admin
    ? await query("SELECT * FROM products ORDER BY sort_order, id")
    : await query("SELECT * FROM products WHERE published = 1 ORDER BY sort_order, id");
  return NextResponse.json(rows.map(mapRow));
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const slug = body.slug || slugify(body.name);
  const row = await queryOne<{ id: number }>(
    `INSERT INTO products (slug, name, description, price, image, category, featured, published, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [
      slug,
      body.name,
      body.description || "",
      body.price || "Liên hệ",
      body.image || "",
      body.category || "Khác",
      body.featured ? 1 : 0,
      body.published !== false ? 1 : 0,
      body.sortOrder || 0,
    ]
  );
  return NextResponse.json({ id: row!.id });
}
