import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { queryOne } from "./db";
import type { AdminUser } from "./types";

const COOKIE_NAME = "hoaphong_admin";
const EXPIRY = "7d";

/** HTTP (VPS IP + ERP_HTTP=1) không dùng Secure cookie */
export function authCookieOptions() {
  const secure =
    process.env.NODE_ENV === "production" &&
    process.env.ERP_HTTP !== "1" &&
    process.env.ERP_HTTPS === "1";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function applyAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, authCookieOptions());
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || "hoaphong-dev-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: number, email: string): Promise<string> {
  return new SignJWT({ sub: String(userId), email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret());
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { userId: Number(payload.sub), email: payload.email as string };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifySession(token);
  if (!session) return null;

  const row = await queryOne<AdminUser>("SELECT id, email, name FROM users WHERE id = $1", [session.userId]);
  return row ?? null;
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, authCookieOptions());
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
