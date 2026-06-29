import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { getImapConfig } from "./imap-config";
import { getMailConfig } from "@/lib/mail";
import nodemailer from "nodemailer";

export class MailboxError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "MailboxError";
  }
}

export interface MailListItem {
  uid: number;
  subject: string;
  from: string;
  fromEmail: string;
  to: string;
  date: string;
  seen: boolean;
}

export interface MailDetail {
  uid: number;
  subject: string;
  from: string;
  fromEmail: string;
  to: string[];
  cc: string[];
  date: string;
  text: string;
  html: string;
  seen: boolean;
}

async function withImapClient<T>(fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const cfg = getImapConfig();
  if (!cfg.enabled) {
    throw new MailboxError(
      "imap_not_configured",
      "Chưa cấu hình IMAP (IMAP_HOST, IMAP_USER, IMAP_PASS trong .env)"
    );
  }

  const client = new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    logger: false,
  });

  await client.connect();
  try {
    return await fn(client);
  } finally {
    try {
      await client.logout();
    } catch {
      // ignore disconnect errors
    }
  }
}

function addressesFromField(
  field: import("mailparser").AddressObject | import("mailparser").AddressObject[] | undefined
): string[] {
  if (!field) return [];
  const list = Array.isArray(field) ? field : [field];
  const out: string[] = [];
  for (const item of list) {
    for (const addr of item.value ?? []) {
      if (addr.address) out.push(addr.address);
    }
  }
  return out;
}

function formatAddress(
  addr?: { name?: string; address?: string } | null
): { label: string; email: string } {
  if (!addr?.address) return { label: "", email: "" };
  return {
    label: addr.name?.trim() || addr.address,
    email: addr.address,
  };
}

export async function listMailboxMessages(opts?: {
  mailbox?: string;
  limit?: number;
}): Promise<{ messages: MailListItem[]; total: number; mailbox: string }> {
  const mailbox = opts?.mailbox?.trim() || "INBOX";
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 50));

  return withImapClient(async (client) => {
    const box = await client.mailboxOpen(mailbox);
    const total = box.exists ?? 0;
    if (total === 0) {
      return { messages: [], total: 0, mailbox };
    }

    const seqStart = Math.max(1, total - limit + 1);
    const items: MailListItem[] = [];

    for await (const msg of client.fetch(`${seqStart}:*`, {
      uid: true,
      envelope: true,
      flags: true,
    })) {
      const from = formatAddress(msg.envelope?.from?.[0]);
      items.push({
        uid: msg.uid!,
        subject: msg.envelope?.subject?.trim() || "(Không có tiêu đề)",
        from: from.label,
        fromEmail: from.email,
        to:
          msg.envelope?.to
            ?.map((t) => t.address)
            .filter(Boolean)
            .join(", ") || "",
        date: msg.envelope?.date?.toISOString() ?? "",
        seen: msg.flags?.has("\\Seen") ?? false,
      });
    }

    return { messages: items.reverse(), total, mailbox };
  });
}

export async function getMailboxMessage(
  uid: number,
  opts?: { mailbox?: string; markSeen?: boolean }
): Promise<MailDetail> {
  const mailbox = opts?.mailbox?.trim() || "INBOX";
  const markSeen = opts?.markSeen !== false;

  return withImapClient(async (client) => {
    await client.mailboxOpen(mailbox);
    const msg = await client.fetchOne(
      String(uid),
      { source: true, envelope: true, flags: true },
      { uid: true }
    );

    if (!msg || !msg.source) {
      throw new MailboxError("not_found", "Không tìm thấy thư");
    }

    const parsed = await simpleParser(msg.source);
    const from = formatAddress(msg.envelope?.from?.[0]);

    if (markSeen) {
      await client.messageFlagsAdd({ uid }, ["\\Seen"], { uid: true });
    }

    return {
      uid,
      subject: parsed.subject?.trim() || msg.envelope?.subject?.trim() || "(Không có tiêu đề)",
      from: from.label || (typeof parsed.from === "object" && parsed.from && "text" in parsed.from ? parsed.from.text : "") || "",
      fromEmail: from.email || addressesFromField(parsed.from)[0] || "",
      to: addressesFromField(parsed.to),
      cc: addressesFromField(parsed.cc),
      date: (parsed.date ?? msg.envelope?.date ?? new Date()).toISOString(),
      text: parsed.text?.trim() || "",
      html: typeof parsed.html === "string" ? parsed.html : "",
      seen: markSeen || (msg.flags?.has("\\Seen") ?? false),
    };
  });
}

export async function sendMailboxMessage(input: {
  to: string;
  cc?: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  inReplyTo?: string;
}) {
  const cfg = getMailConfig();
  if (!cfg.enabled) {
    throw new MailboxError(
      "smtp_not_configured",
      "Chưa cấu hình SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS trong .env)"
    );
  }

  const to = input.to.trim();
  if (!to) throw new MailboxError("invalid_to", "Người nhận bắt buộc");
  if (!input.subject.trim()) throw new MailboxError("invalid_subject", "Tiêu đề bắt buộc");
  if (!input.text.trim() && !input.html?.trim()) {
    throw new MailboxError("invalid_body", "Nội dung thư bắt buộc");
  }

  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    ...(cfg.port === 587 && !cfg.secure ? { requireTLS: true } : {}),
  });

  try {
    await transport.sendMail({
      from: cfg.from,
      to,
      cc: input.cc?.trim() || undefined,
      replyTo: input.replyTo?.trim() || cfg.from,
      inReplyTo: input.inReplyTo?.trim() || undefined,
      subject: input.subject.trim(),
      text: input.text,
      html: input.html ?? input.text.replace(/\n/g, "<br>"),
    });
    return { sent: true as const };
  } catch (err) {
    throw new MailboxError(
      "send_failed",
      err instanceof Error ? err.message : "Gửi thư thất bại"
    );
  }
}
