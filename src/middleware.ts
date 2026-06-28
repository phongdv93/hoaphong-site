import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { ERP } from "@/lib/paths";
import {
  getCompanyCodeFromHost,
  isApexHostname,
  TENANT_CODE_COOKIE,
  TENANT_QUERY_PARAM,
} from "@/lib/tenant-host";

const COOKIE_NAME = "hoaphong_admin";
const TENANT_CODE_RE = /^[a-z0-9][a-z0-9-]{0,62}$/i;

const PUBLIC_ERP_PATHS = new Set([
  ERP.login,
  "/erp/dang-ky",
  "/erp/register",
  "/erp/quen-mat-khau",
  "/erp/dat-lai-mat-khau",
  "/erp/cho-duyet",
]);

/** Trang ERP công ty — giữ cookie tenant khi dùng IP + ?tenant= */
const TENANT_PRESERVE_PATHS = new Set([
  ERP.login,
  "/erp/dang-ky",
  "/erp/quen-mat-khau",
  "/erp/dat-lai-mat-khau",
  "/erp/cho-duyet",
]);

const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/register-employee",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/tenant",
];

function getSecret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || "hoaphong-dev-secret-change-in-production"
  );
}

function isPublicErpPath(pathname: string): boolean {
  if (PUBLIC_ERP_PATHS.has(pathname)) return true;
  return PUBLIC_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function setTenantCookie(response: NextResponse, code: string) {
  response.cookies.set(TENANT_CODE_COOKIE, code.toLowerCase(), {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}

function resolveTenantCode(request: NextRequest, pathname: string): string | null {
  const fromHost = getCompanyCodeFromHost(request.headers.get("host"));
  if (fromHost) return fromHost;

  const fromQuery = request.nextUrl.searchParams.get(TENANT_QUERY_PARAM)?.trim();
  if (fromQuery && TENANT_CODE_RE.test(fromQuery)) return fromQuery.toLowerCase();

  const fromPath = pathname.match(/^\/erp\/c\/([a-z0-9][a-z0-9-]{0,62})$/i);
  if (fromPath) return fromPath[1].toLowerCase();

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tenantCode = resolveTenantCode(request, pathname);

  if (pathname === "/" && tenantCode) {
    const loginUrl = new URL("/erp/login", request.url);
    if (!getCompanyCodeFromHost(request.headers.get("host"))) {
      loginUrl.searchParams.set(TENANT_QUERY_PARAM, tenantCode);
    }
    const redirect = NextResponse.redirect(loginUrl);
    setTenantCookie(redirect, tenantCode);
    return redirect;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (tenantCode) {
    setTenantCookie(response, tenantCode);
  } else {
    const hostname =
      request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
    if (isApexHostname(hostname) && request.cookies.has(TENANT_CODE_COOKIE)) {
      const preserve =
        TENANT_PRESERVE_PATHS.has(pathname) || pathname.startsWith("/erp/c/");
      if (!preserve) {
        response.cookies.delete(TENANT_CODE_COOKIE);
      }
    }
  }

  if (!pathname.startsWith("/erp") && !pathname.startsWith("/api/auth")) {
    return response;
  }

  if (pathname === ERP.login) {
    return response;
  }

  if (isPublicErpPath(pathname)) {
    return response;
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL(ERP.login, request.url));
  }
  try {
    await jwtVerify(token, getSecret());
  } catch {
    return NextResponse.redirect(new URL(ERP.login, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/", "/erp/:path*", "/api/auth/:path*"],
};
