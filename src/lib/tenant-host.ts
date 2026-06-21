/** Cookie middleware ghi — mã công ty từ subdomain */

export const TENANT_CODE_COOKIE = "hoaphong_tenant_code";
export const TENANT_QUERY_PARAM = "tenant";

const DEFAULT_SUFFIX = "hoaphong.com.vn";

export function getErpHostSuffix(): string {
  return (process.env.ERP_HOST_SUFFIX || process.env.NEXT_PUBLIC_ERP_HOST_SUFFIX || DEFAULT_SUFFIX)
    .toLowerCase()
    .replace(/^\.+/, "");
}

function hostnameFromHost(host: string | null | undefined): string {
  return (host ?? "").split(":")[0].toLowerCase();
}

/** IPv4 — deploy VPS chưa có tên miền */
export function isIpHostname(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

/** Host gốc (không phải subdomain công ty) */
export function isApexHostname(hostname: string): boolean {
  const suffix = getErpHostSuffix();
  return (
    hostname === "localhost" ||
    isIpHostname(hostname) ||
    hostname === suffix ||
    hostname === `www.${suffix}`
  );
}

/** `localhost`, `*.localhost` — luôn HTTP (dev), kể cả `npm start` */
export function isLocalDevHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname.endsWith(".localhost");
}

/** Host gốc từ env — dùng khi API/mail không có request Host */
export function resolveErpBaseHost(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (raw) {
    try {
      return new URL(raw).host;
    } catch {
      // ignore
    }
  }
  return undefined;
}

function erpProtocol(hostname: string): "http" | "https" {
  if (isLocalDevHostname(hostname)) return "http";
  if (process.env.ERP_HTTP === "1") return "http";
  if (process.env.ERP_HTTPS === "1") return "https";
  if (process.env.NODE_ENV !== "production") return "http";
  return "https";
}

/** Trích mã công ty từ host: `cty-abc.hoaphong.com.vn` → `cty-abc` */
export function getCompanyCodeFromHost(host: string | null | undefined): string | null {
  if (!host) return null;

  const hostname = hostnameFromHost(host);
  const suffix = getErpHostSuffix();

  if (hostname === suffix || hostname === `www.${suffix}` || hostname === "localhost") {
    return null;
  }

  if (hostname.endsWith(`.${suffix}`)) {
    const sub = hostname.slice(0, -(suffix.length + 1));
    if (!sub || sub === "www" || sub.includes(".")) return null;
    return sub;
  }

  if (hostname.endsWith(".localhost")) {
    const sub = hostname.slice(0, -".localhost".length);
    if (sub && !sub.includes(".")) return sub;
  }

  return null;
}

/** Deploy bằng IP hoặc chưa có SSL wildcard — link theo path + ?tenant= */
export function usesPathBasedTenantUrls(requestHost?: string): boolean {
  const host = requestHost ?? resolveErpBaseHost() ?? "";
  if (process.env.ERP_USE_TENANT_QUERY === "1") return true;
  return isIpHostname(hostnameFromHost(host));
}

function appBaseOrigin(requestHost?: string): string {
  const host = requestHost ?? resolveErpBaseHost() ?? "";
  const hostname = hostnameFromHost(host);
  const port = host.includes(":") ? `:${host.split(":")[1]}` : "";
  const protocol = erpProtocol(hostname);
  return `${protocol}://${hostname}${port}`;
}

/** URL ERP theo subdomain của công ty (ưu tiên subdomain, fallback path khi dùng IP) */
export function companyErpOrigin(subdomainOrCode: string, requestHost?: string): string {
  const suffix = getErpHostSuffix();
  const host = requestHost ?? resolveErpBaseHost();
  const hostname = hostnameFromHost(host);

  if (host && (host.includes("localhost") || isLocalDevHostname(hostname))) {
    const port = host.includes(":") ? `:${host.split(":")[1]}` : ":3000";
    return `http://${subdomainOrCode}.localhost${port}`;
  }

  if (isIpHostname(hostname)) {
    return appBaseOrigin(requestHost);
  }

  const protocol = erpProtocol(hostname);
  return `${protocol}://${subdomainOrCode}.${suffix}`;
}

export function companyErpLoginUrl(subdomainOrCode: string, requestHost?: string): string {
  const base = companyErpOrigin(subdomainOrCode, requestHost);
  if (usesPathBasedTenantUrls(requestHost ?? resolveErpBaseHost())) {
    return `${base}/erp/login?${TENANT_QUERY_PARAM}=${encodeURIComponent(subdomainOrCode)}`;
  }
  return `${base}/erp/login`;
}

export function companyErpRegisterUrl(subdomainOrCode: string, requestHost?: string): string {
  const base = companyErpOrigin(subdomainOrCode, requestHost);
  if (usesPathBasedTenantUrls(requestHost ?? resolveErpBaseHost())) {
    return `${base}/erp/dang-ky?${TENANT_QUERY_PARAM}=${encodeURIComponent(subdomainOrCode)}`;
  }
  return `${base}/erp/dang-ky`;
}

/** Giữ ?tenant= khi deploy bằng IP (client hoặc server) */
export function tenantAwareErpPath(
  path: string,
  tenantCode: string | null | undefined,
  requestHost?: string
): string {
  if (!tenantCode?.trim()) return path;
  const host = requestHost ?? resolveErpBaseHost() ?? "";
  if (!usesPathBasedTenantUrls(host)) return path;
  const base = path.split("?")[0];
  const params = new URLSearchParams(path.includes("?") ? path.split("?")[1] : "");
  params.set(TENANT_QUERY_PARAM, tenantCode.trim().toLowerCase());
  return `${base}?${params.toString()}`;
}
