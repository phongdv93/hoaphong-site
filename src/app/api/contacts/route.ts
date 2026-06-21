import { NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { ContactRequest } from "@/lib/types";

function mapRow(row: Record<string, unknown>): ContactRequest {
  return {
    id: row.id as number,
    name: row.name as string,
    email: row.email as string,
    phone: row.phone as string,
    subject: row.subject as string,
    message: row.message as string,
    status: row.status as ContactRequest["status"],
    createdAt: String(row.created_at),
  };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await query("SELECT * FROM contact_requests ORDER BY created_at DESC");
  return NextResponse.json(rows.map(mapRow));
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status } = await request.json();
  await execute("UPDATE contact_requests SET status = $1 WHERE id = $2", [status, id]);
  return NextResponse.json({ success: true });
}
