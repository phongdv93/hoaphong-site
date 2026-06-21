import { NextResponse } from "next/server";
import { execute, slugify } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const slug = body.slug || slugify(body.name);

  await execute(
    `UPDATE products SET slug=$1, name=$2, description=$3, price=$4, image=$5, category=$6, featured=$7, published=$8, sort_order=$9 WHERE id=$10`,
    [
      slug,
      body.name,
      body.description,
      body.price,
      body.image,
      body.category,
      body.featured ? 1 : 0,
      body.published ? 1 : 0,
      body.sortOrder || 0,
      id,
    ]
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await execute("DELETE FROM products WHERE id = $1", [id]);
  return NextResponse.json({ success: true });
}
