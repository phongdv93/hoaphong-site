import crypto from "node:crypto";
import https from "node:https";
import { URL } from "node:url";

/** MobiFone Invoice dùng TLS cũ — Node fetch mặc định bị EPROTO trên VPS. */
const mobifoneHttpsAgent = new https.Agent({
  secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
});

function isMobifoneInvoiceHost(hostname: string): boolean {
  return hostname === "mobifoneinvoice.vn" || hostname.endsWith(".mobifoneinvoice.vn");
}

type FetchLikeResponse = {
  ok: boolean;
  status: number;
  headers: Headers;
  json(): Promise<unknown>;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
};

function httpsRequest(
  url: string,
  init: RequestInit & { signal?: AbortSignal }
): Promise<FetchLikeResponse> {
  const parsed = new URL(url);
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  const body =
    init.body == null
      ? undefined
      : typeof init.body === "string"
        ? init.body
        : init.body instanceof Buffer
          ? init.body
          : String(init.body);

  if (body != null && !headers.has("Content-Length")) {
    headers.set("Content-Length", String(Buffer.byteLength(body)));
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers: Object.fromEntries(headers.entries()),
        agent: mobifoneHttpsAgent,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const bodyBuffer = Buffer.concat(chunks);
          const status = res.statusCode ?? 0;
          const responseHeaders = new Headers();
          for (const [key, value] of Object.entries(res.headers)) {
            if (value == null) continue;
            if (Array.isArray(value)) {
              for (const v of value) responseHeaders.append(key, v);
            } else {
              responseHeaders.set(key, value);
            }
          }
          resolve({
            ok: status >= 200 && status < 300,
            status,
            headers: responseHeaders,
            json: async () => JSON.parse(bodyBuffer.toString("utf8")) as unknown,
            text: async () => bodyBuffer.toString("utf8"),
            arrayBuffer: async () =>
              bodyBuffer.buffer.slice(
                bodyBuffer.byteOffset,
                bodyBuffer.byteOffset + bodyBuffer.byteLength
              ) as ArrayBuffer,
          });
        });
      }
    );

    const signal = init.signal;
    if (signal) {
      if (signal.aborted) {
        req.destroy();
        reject(signal.reason ?? new Error("Aborted"));
        return;
      }
      const onAbort = () => {
        req.destroy();
        reject(signal.reason ?? new Error("Aborted"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
      req.on("close", () => signal.removeEventListener("abort", onAbort));
    }

    req.on("error", reject);
    if (body != null) req.write(body);
    req.end();
  });
}

export async function mobifoneFetch(
  url: string,
  init: RequestInit & { signal?: AbortSignal } = {}
): Promise<FetchLikeResponse> {
  const hostname = new URL(url).hostname;
  if (isMobifoneInvoiceHost(hostname)) {
    return httpsRequest(url, init);
  }
  const res = await fetch(url, init);
  return {
    ok: res.ok,
    status: res.status,
    headers: res.headers,
    json: () => res.json(),
    text: () => res.text(),
    arrayBuffer: () => res.arrayBuffer(),
  };
}
