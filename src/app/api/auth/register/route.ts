import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieOptions, COOKIE_NAME } from "@/lib/auth";
import { registerCompanyAccount } from "@/lib/auth/register-company";
import { ACTIVE_COMPANY_COOKIE, getCompany } from "@/lib/projects/companies";
import { TENANT_CODE_COOKIE } from "@/lib/tenant-host";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await registerCompanyAccount(body);

    const response = NextResponse.json({
      success: true,
      companyId: result.companyId,
      companyCode: result.companyCode,
      verifySummary: result.verifySummary,
    });

    response.cookies.set(COOKIE_NAME, result.token, authCookieOptions());
    response.cookies.set(ACTIVE_COMPANY_COOKIE, String(result.companyId), {
      httpOnly: false,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    const company = await getCompany(result.companyId);
    if (company?.subdomain) {
      response.cookies.set(TENANT_CODE_COOKIE, company.subdomain.toLowerCase(), {
        path: "/",
        sameSite: "lax" as const,
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return response;
  } catch (err) {
    console.error("[auth/register]", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Đăng ký thất bại";
    const status =
      message.includes("đã có tài khoản") ||
      message.includes("đã được đăng ký") ||
      message.includes("trùng")
        ? 409
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
