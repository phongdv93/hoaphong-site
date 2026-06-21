import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { resolvePostLoginRedirect } from "@/lib/auth/post-login-redirect";
import { ACTIVE_COMPANY_COOKIE, setActiveCompanyId } from "@/lib/projects/companies";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const redirect = await resolvePostLoginRedirect(user.id);

  if (redirect.activeCompanyId != null) {
    await setActiveCompanyId(redirect.activeCompanyId);
  }

  const response = NextResponse.json(redirect);
  if (redirect.activeCompanyId != null) {
    response.cookies.set(ACTIVE_COMPANY_COOKIE, String(redirect.activeCompanyId), {
      httpOnly: false,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
