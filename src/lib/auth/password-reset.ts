import crypto from "crypto";
import { hashPassword } from "@/lib/auth";
import { platformExecute, platformQueryOne } from "@/lib/db/platform";
import { sendPasswordResetEmail } from "@/lib/mail";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 giờ

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function resolveAppOrigin(request?: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (env) return env.replace(/\/$/, "");
  if (request) {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  }
  return "http://localhost:3000";
}

export function buildPasswordResetUrl(token: string, request?: Request): string {
  const origin = resolveAppOrigin(request);
  return `${origin}/erp/dat-lai-mat-khau?token=${encodeURIComponent(token)}`;
}

/** Luôn trả ok — không tiết lộ email có tồn tại hay không */
export async function requestPasswordReset(
  email: string,
  request?: Request
): Promise<{ resetUrl?: string; mailSent: boolean; mailError?: string }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { mailSent: false };

  const user = await platformQueryOne<{ id: number; email: string; name: string }>(
    `SELECT id, email, name FROM users WHERE LOWER(email) = $1`,
    [normalized]
  );

  if (!user) {
    return { mailSent: false };
  }

  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await platformExecute(
    `UPDATE password_reset_tokens SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [user.id]
  );

  await platformExecute(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt.toISOString()]
  );

  const resetUrl = buildPasswordResetUrl(rawToken, request);
  const mail = await sendPasswordResetEmail({
    to: user.email,
    name: user.name || user.email,
    resetUrl,
    expiresMinutes: 60,
  });

  return {
    mailSent: mail.sent,
    resetUrl: mail.sent ? undefined : resetUrl,
    mailError: mail.sent ? undefined : ("error" in mail ? mail.error : mail.reason),
  };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const trimmed = token.trim();
  if (!trimmed || trimmed.length < 20) {
    return { ok: false, reason: "Link đặt lại mật khẩu không hợp lệ" };
  }
  if (newPassword.length < 6) {
    return { ok: false, reason: "Mật khẩu phải có ít nhất 6 ký tự" };
  }

  const tokenHash = hashToken(trimmed);
  const row = await platformQueryOne<{ id: number; user_id: number }>(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );

  if (!row) {
    return { ok: false, reason: "Link đã hết hạn hoặc đã được sử dụng" };
  }

  const passwordHash = await hashPassword(newPassword);
  await platformExecute(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
    passwordHash,
    row.user_id,
  ]);
  await platformExecute(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
    [row.id]
  );

  return { ok: true };
}
