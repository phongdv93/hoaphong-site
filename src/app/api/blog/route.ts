import { NextResponse } from "next/server";
import { query, queryOne, slugify } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { BlogPost } from "@/lib/types";

function mapRow(row: Record<string, unknown>): BlogPost {
  return {
    id: row.id as number,
    slug: row.slug as string,
    title: row.title as string,
    excerpt: row.excerpt as string,
    content: row.content as string,
    coverImage: row.cover_image as string,
    published: row.published as number,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const admin = searchParams.get("admin") === "1";

  const rows = admin
    ? await query("SELECT * FROM blog_posts ORDER BY created_at DESC")
    : await query("SELECT * FROM blog_posts WHERE published = 1 ORDER BY created_at DESC");

  return NextResponse.json(rows.map(mapRow));
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const slug = body.slug || slugify(body.title);

  const row = await queryOne<{ id: number }>(
    `INSERT INTO blog_posts (slug, title, excerpt, content, cover_image, published)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [slug, body.title, body.excerpt || "", body.content || "", body.coverImage || "", body.published ? 1 : 0]
  );

  return NextResponse.json({ id: row!.id, slug });
}
