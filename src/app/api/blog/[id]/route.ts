import { NextResponse } from "next/server";
import { execute, slugify } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const slug = body.slug || slugify(body.title);

  await execute(
    `UPDATE blog_posts SET slug=$1, title=$2, excerpt=$3, content=$4, cover_image=$5, published=$6, updated_at=NOW() WHERE id=$7`,
    [slug, body.title, body.excerpt, body.content, body.coverImage, body.published ? 1 : 0, id]
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await execute("DELETE FROM blog_posts WHERE id = $1", [id]);
  return NextResponse.json({ success: true });
}
