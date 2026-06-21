import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { queryOne } from "@/lib/db";
import {
  verifyPassword,
  createSession,
  authCookieOptions,
  COOKIE_NAME,
} from "@/lib/auth";
import {
  ACTIVE_COMPANY_COOKIE,
  getCompanyBySubdomain,
  setActiveCompanyId,
} from "@/lib/projects/companies";
import { getCompanyCodeFromHost, TENANT_CODE_COOKIE } from "@/lib/tenant-host";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    const user = await queryOne<{ id: number; email: string; password_hash: string }>(
      "SELECT id, email, password_hash FROM users WHERE LOWER(email) = $1",
      [email]
    );

    if (!user || !(await verifyPassword(body.password, user.password_hash))) {
      return NextResponse.json({ error: "Email hoặc mật khẩu không đúng" }, { status: 401 });
    }

    const token = await createSession(user.id, user.email);

    const c = await cookies();
    const code =
      getCompanyCodeFromHost(request.headers.get("host")) ??
      c.get(TENANT_CODE_COOKIE)?.value?.trim().toLowerCase() ??
      null;

    let activeCompanyId: number | null = null;
    if (code) {
      const company = await getCompanyBySubdomain(code);
      if (company) {
        activeCompanyId = company.id;
        await setActiveCompanyId(company.id);
      }
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, token, authCookieOptions());
    if (activeCompanyId != null) {
      response.cookies.set(ACTIVE_COMPANY_COOKIE, String(activeCompanyId), {
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
