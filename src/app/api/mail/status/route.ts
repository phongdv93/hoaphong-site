import { NextResponse } from "next/server";
import { requireMailboxAccess } from "@/lib/mail/access";
import { getMailboxStatus } from "@/lib/mail/imap-config";

export async function GET() {
  const { error } = await requireMailboxAccess();
  if (error) return error;
  return NextResponse.json(getMailboxStatus());
}
