import { NextResponse } from "next/server";
import { requireMailboxAccess } from "@/lib/mail/access";
import { MailboxError, getMailboxMessage } from "@/lib/mail/mailbox";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { error } = await requireMailboxAccess();
  if (error) return error;

  const { uid: uidRaw } = await params;
  const uid = Number(uidRaw);
  if (!Number.isFinite(uid) || uid <= 0) {
    return NextResponse.json({ error: "UID không hợp lệ" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const mailbox = searchParams.get("mailbox") || "INBOX";

  try {
    const message = await getMailboxMessage(uid, { mailbox });
    return NextResponse.json(message);
  } catch (err) {
    if (err instanceof MailboxError) {
      const status = err.code === "not_found" ? 404 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error("[mail] get", err);
    return NextResponse.json({ error: "Không đọc được thư" }, { status: 500 });
  }
}
