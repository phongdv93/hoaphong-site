import { NextResponse } from "next/server";
import { execute, slugify } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const slug = body.slug || slugify(body.name);
  const features = typeof body.features === "string" ? body.features : JSON.stringify(body.features || []);

  await execute(
    `UPDATE services SET slug=$1, name=$2, description=$3, icon=$4, features=$5, published=$6, sort_order=$7 WHERE id=$8`,
    [slug, body.name, body.description, body.icon, features, body.published ? 1 : 0, body.sortOrder || 0, id]
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await execute("DELETE FROM services WHERE id = $1", [id]);
  return NextResponse.json({ success: true });
}
