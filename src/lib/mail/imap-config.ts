export interface ImapConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

export function getImapConfig(): ImapConfig {
  const host = process.env.IMAP_HOST?.trim() || process.env.SMTP_HOST?.trim() || "";
  const user = process.env.IMAP_USER?.trim() || process.env.SMTP_USER?.trim() || "";
  const pass = process.env.IMAP_PASS?.trim() || process.env.SMTP_PASS?.trim() || "";
  const port = Number(process.env.IMAP_PORT ?? "993");
  const secure = process.env.IMAP_SECURE !== "0";
  return {
    enabled: Boolean(host && user && pass),
    host,
    port,
    secure,
    user,
    pass,
  };
}

export function getMailboxStatus() {
  const imap = getImapConfig();
  const smtpUser = process.env.SMTP_USER?.trim() || imap.user;
  const smtpHost = process.env.SMTP_HOST?.trim() || "";
  const smtpPass = process.env.SMTP_PASS?.trim() || "";
  return {
    imapEnabled: imap.enabled,
    smtpEnabled: Boolean(smtpHost && smtpUser && smtpPass),
    address: smtpUser || imap.user || "",
    imapHost: imap.host,
    smtpHost,
  };
}
