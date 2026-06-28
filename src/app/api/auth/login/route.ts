import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import {
  verifyPassword,
  createSession,
  authCookieOptions,
  COOKIE_NAME,
} from "@/lib/auth";
import { resolvePostLoginRedirect } from "@/lib/auth/post-login-redirect";
import { resolveTenantCompany } from "@/lib/tenant-context";
import {
  ACTIVE_COMPANY_COOKIE,
  setActiveCompanyId,
} from "@/lib/projects/companies";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const password = body.password;

    const user = await queryOne<{ id: number; email: string; password_hash: string }>(
      "SELECT id, email, password_hash FROM users WHERE LOWER(email) = $1",
      [email]
    );

    if (!user?.password_hash) {
      return NextResponse.json({ error: "Email hoặc mật khẩu không đúng" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Email hoặc mật khẩu không đúng" }, { status: 401 });
    }

    const token = await createSession(user.id, user.email);
    const tenant = await resolveTenantCompany();
    const redirect = await resolvePostLoginRedirect(user.id, {
      tenantCompanyId: tenant?.id,
    });

    if (redirect.activeCompanyId != null) {
      await setActiveCompanyId(redirect.activeCompanyId);
    }

    const response = NextResponse.json({
      success: true,
      redirect: redirect.url,
      label: redirect.label,
    });
    response.cookies.set(COOKIE_NAME, token, authCookieOptions());
    if (redirect.activeCompanyId != null) {
      response.cookies.set(ACTIVE_COMPANY_COOKIE, String(redirect.activeCompanyId), {
        httpOnly: false,
        sameSite: "lax" as const,
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  } catch (err) {
    console.error("[auth/login]", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
