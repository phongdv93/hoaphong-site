import type { SigningCertificateInfo } from "./types";

export interface SigningAgentHealth {
  ok: boolean;
  message: string;
  source: "agent" | "disabled";
}

export interface SignXmlResult {
  ok: boolean;
  message: string;
  signedXml?: string;
  cert?: {
    thumbprint: string;
    subject: string;
    issuer: string;
  };
}

function getAgentUrl(): string {
  return (process.env.CUSTOMS_SIGNING_AGENT_URL || "").trim().replace(/\/$/, "");
}

function buildHeaders(): Record<string, string> {
  const token = (process.env.CUSTOMS_SIGNING_AGENT_TOKEN || "").trim();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function listSigningCertificates(): Promise<SigningCertificateInfo[]> {
  const base = getAgentUrl();
  if (!base) return [];
  const res = await fetch(`${base}/certificates`, {
    method: "GET",
    headers: buildHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`Agent trả HTTP ${res.status}`);
  }
  const data = (await res.json()) as { items?: SigningCertificateInfo[] } | SigningCertificateInfo[];
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}

export async function checkSigningAgentHealth(): Promise<SigningAgentHealth> {
  const base = getAgentUrl();
  if (!base) {
    return {
      ok: false,
      message: "Chưa cấu CUSTOMS_SIGNING_AGENT_URL.",
      source: "disabled",
    };
  }
  try {
    const res = await fetch(`${base}/health`, {
      method: "GET",
      headers: buildHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return {
        ok: false,
        message: `Agent lỗi HTTP ${res.status}: ${text.slice(0, 160)}`,
        source: "agent",
      };
    }
    return {
      ok: true,
      message: text || "Signing agent hoạt động.",
      source: "agent",
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Không kết nối được signing agent.",
      source: "agent",
    };
  }
}

export async function signXmlWithAgent(
  xml: string,
  thumbprint: string
): Promise<SignXmlResult> {
  const base = getAgentUrl();
  if (!base) {
    return { ok: false, message: "Chưa cấu CUSTOMS_SIGNING_AGENT_URL." };
  }
  const res = await fetch(`${base}/sign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildHeaders(),
    },
    body: JSON.stringify({ xml, thumbprint }),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      message: String(j.error ?? j.message ?? `Agent trả HTTP ${res.status}`),
    };
  }
  return {
    ok: Boolean(j.ok ?? true),
    message: String(j.message ?? "Ký XML thành công."),
    signedXml: typeof j.signedXml === "string" ? j.signedXml : undefined,
    cert:
      j.cert && typeof j.cert === "object"
        ? {
            thumbprint: String((j.cert as Record<string, unknown>).thumbprint ?? ""),
            subject: String((j.cert as Record<string, unknown>).subject ?? ""),
            issuer: String((j.cert as Record<string, unknown>).issuer ?? ""),
          }
        : undefined,
  };
}
