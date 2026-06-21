import { NextResponse } from "next/server";
import { listRegistrationRequests } from "@/lib/company-verify/registration-log";
import { requirePlatformAdmin } from "@/lib/platform/guard";

export async function GET() {
  const adminId = await requirePlatformAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await listRegistrationRequests(100);
  return NextResponse.json(rows);
}
