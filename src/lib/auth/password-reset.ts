import crypto from "crypto";
import { hashPassword } from "@/lib/auth";
import { platformExecute, platformQueryOne } from "@/lib/db/platform";
import { sendPasswordResetEmail } from "@/lib/mail";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 giờ — link
const OTP_TTL_MS = 15 * 60 * 1000; // 15 phút — mã OTP

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
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
): Promise<{
  resetUrl?: string;
  devOtp?: string;
  mailSent: boolean;
  mailError?: string;
}> {
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
  const otp = generateOtp();
  const otpHash = hashToken(otp);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await platformExecute(
    `UPDATE password_reset_tokens SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [user.id]
  );

  await platformExecute(
    `INSERT INTO password_reset_tokens (user_id, token_hash, otp_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [user.id, tokenHash, otpHash, expiresAt.toISOString()]
  );

  const resetUrl = buildPasswordResetUrl(rawToken, request);
  const mail = await sendPasswordResetEmail({
    to: user.email,
    name: user.name || user.email,
    resetUrl,
    otp,
    otpExpiresMinutes: Math.round(OTP_TTL_MS / 60000),
    expiresMinutes: 60,
  });

  const showDevOtp =
    !mail.sent && process.env.NODE_ENV !== "production";

  return {
    mailSent: mail.sent,
    resetUrl: mail.sent ? undefined : resetUrl,
    devOtp: showDevOtp ? otp : undefined,
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

export async function resetPasswordWithOtp(
  email: string,
  otp: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const normalized = email.trim().toLowerCase();
  const otpDigits = otp.replace(/\D/g, "");
  if (!normalized) {
    return { ok: false, reason: "Email không hợp lệ" };
  }
  if (!/^\d{6}$/.test(otpDigits)) {
    return { ok: false, reason: "Mã OTP phải gồm 6 chữ số" };
  }
  if (newPassword.length < 6) {
    return { ok: false, reason: "Mật khẩu phải có ít nhất 6 ký tự" };
  }

  const user = await platformQueryOne<{ id: number }>(
    `SELECT id FROM users WHERE LOWER(email) = $1`,
    [normalized]
  );
  if (!user) {
    return { ok: false, reason: "Mã OTP không đúng hoặc đã hết hạn" };
  }

  const otpHash = hashToken(otpDigits);
  const row = await platformQueryOne<{ id: number; user_id: number }>(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE user_id = $1
       AND otp_hash = $2
       AND used_at IS NULL
       AND expires_at > NOW()
       AND created_at > NOW() - INTERVAL '15 minutes'
     ORDER BY created_at DESC
     LIMIT 1`,
    [user.id, otpHash]
  );

  if (!row) {
    return { ok: false, reason: "Mã OTP không đúng hoặc đã hết hạn" };
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
