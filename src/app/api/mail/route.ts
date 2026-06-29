import { NextResponse } from "next/server";
import { requireMailboxAccess } from "@/lib/mail/access";
import { MailboxError, listMailboxMessages, sendMailboxMessage } from "@/lib/mail/mailbox";

export async function GET(req: Request) {
  const { error } = await requireMailboxAccess();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const mailbox = searchParams.get("mailbox") || "INBOX";
  const limit = Number(searchParams.get("limit") || "50");

  try {
    const data = await listMailboxMessages({ mailbox, limit });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof MailboxError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    console.error("[mail] list", err);
    return NextResponse.json({ error: "Không tải được hộp thư" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error } = await requireMailboxAccess();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  try {
    await sendMailboxMessage({
      to: String(body.to ?? ""),
      cc: body.cc ? String(body.cc) : undefined,
      subject: String(body.subject ?? ""),
      text: String(body.text ?? ""),
      html: body.html ? String(body.html) : undefined,
      replyTo: body.replyTo ? String(body.replyTo) : undefined,
      inReplyTo: body.inReplyTo ? String(body.inReplyTo) : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof MailboxError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    console.error("[mail] send", err);
    return NextResponse.json({ error: "Gửi thư thất bại" }, { status: 500 });
  }
}
