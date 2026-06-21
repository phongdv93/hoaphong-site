import type { ImportDeclaration, ImportDeclarationLine, TransmitResult, VnaccsProcedure } from "../types";
import { buildIdaPayload, buildIdaXml } from "./message-ida";

export interface VnaccsConnectionConfig {
  gatewayUrl: string;
  userCode: string;
  userPassword: string;
  terminalId: string;
  terminalAccessKey: string;
  testMode: boolean;
}

export function getGatewayUrl(): string {
  return (process.env.CUSTOMS_VNACCS_GATEWAY_URL || "").trim();
}

export function isSimulatedMode(config: VnaccsConnectionConfig): boolean {
  if (config.testMode) return true;
  if (process.env.CUSTOMS_VNACCS_FORCE_SIMULATE === "1") return true;
  if (!config.gatewayUrl) return true;
  return false;
}

export async function testVnaccsConnection(
  config: VnaccsConnectionConfig
): Promise<{ ok: boolean; message: string }> {
  if (!config.userCode || !config.terminalId) {
    return { ok: false, message: "Thiếu User Code hoặc Terminal ID." };
  }
  if (isSimulatedMode(config)) {
    return {
      ok: true,
      message:
        "Chế độ mô phỏng (chưa cấu CUSTOMS_VNACCS_GATEWAY_URL hoặc bật test). Thông số đã lưu.",
    };
  }
  try {
    const res = await fetch(`${config.gatewayUrl.replace(/\/$/, "")}/health`, {
      method: "GET",
      headers: buildAuthHeaders(config),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      return { ok: true, message: "Kết nối gateway VNACCS thành công." };
    }
    const text = await res.text().catch(() => "");
    return { ok: false, message: `Gateway trả ${res.status}: ${text.slice(0, 200)}` };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Không kết nối được gateway",
    };
  }
}

function buildAuthHeaders(config: VnaccsConnectionConfig): Record<string, string> {
  const token = Buffer.from(
    `${config.userCode}:${config.userPassword}:${config.terminalId}:${config.terminalAccessKey}`
  ).toString("base64");
  return {
    Authorization: `Basic ${token}`,
    "X-VNACCS-Terminal-Id": config.terminalId,
    "X-VNACCS-User-Code": config.userCode,
    "Content-Type": "application/xml; charset=utf-8",
  };
}

function simulateTransmit(
  procedure: VnaccsProcedure,
  decl: ImportDeclaration
): TransmitResult {
  const suffix = String(Date.now()).slice(-8);
  const idaNo = `IDA${new Date().getFullYear()}${suffix}`;
  const declNo = procedure === "IDC" ? `IDC${new Date().getFullYear()}${suffix}` : null;
  const channels = ["green", "yellow", "red"] as const;
  const channel = channels[Math.floor(Math.random() * channels.length)];

  return {
    success: true,
    procedure,
    idaRegistrationNo: procedure === "IDA" ? idaNo : decl.idaRegistrationNo ?? idaNo,
    declarationNo: declNo ?? decl.declarationNo ?? undefined,
    channel,
    message:
      procedure === "IDA"
        ? `Mô phỏng: Đăng ký IDA thành công — ${idaNo}. Phân luồng: ${channel}.`
        : `Mô phỏng: IDC thành công — ${declNo}. Phân luồng: ${channel}.`,
    rawResponse: { simulated: true, procedure },
  };
}

export async function transmitDeclaration(
  config: VnaccsConnectionConfig,
  procedure: VnaccsProcedure,
  decl: ImportDeclaration,
  lines: ImportDeclarationLine[]
): Promise<TransmitResult> {
  if (procedure !== "IDA" && procedure !== "IDC") {
    return {
      success: false,
      procedure,
      message: `Nghiệp vụ ${procedure} chưa hỗ trợ tự động — dùng IDA hoặc IDC.`,
    };
  }

  if (isSimulatedMode(config)) {
    return simulateTransmit(procedure, decl);
  }

  const payload = buildIdaPayload(decl, lines);
  const xml = buildIdaXml({
    ...payload,
    procedure: procedure === "IDC" ? "IDA" : "IDA",
  });

  const endpoint =
    procedure === "IDC"
      ? `${config.gatewayUrl.replace(/\/$/, "")}/procedures/IDC`
      : `${config.gatewayUrl.replace(/\/$/, "")}/procedures/IDA`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: buildAuthHeaders(config),
      body: xml,
      signal: AbortSignal.timeout(120000),
    });
    const text = await res.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = { rawXml: text.slice(0, 4000) };
    }

    if (!res.ok) {
      return {
        success: false,
        procedure,
        message: `Hải quan/gateway từ chối (${res.status})`,
        rawResponse: parsed,
      };
    }

    return {
      success: true,
      procedure,
      declarationNo: String(parsed.declarationNo ?? parsed.declaration_no ?? ""),
      idaRegistrationNo: String(parsed.idaRegistrationNo ?? parsed.ida_no ?? ""),
      channel: parseChannel(parsed.channel ?? parsed.flow),
      message: String(parsed.message ?? "Truyền tờ khai thành công."),
      rawResponse: parsed,
    };
  } catch (e) {
    return {
      success: false,
      procedure,
      message: e instanceof Error ? e.message : "Lỗi truyền VNACCS",
    };
  }
}

function parseChannel(v: unknown): TransmitResult["channel"] {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("green") || s === "1" || s === "x") return "green";
  if (s.includes("yellow") || s === "2" || s === "v") return "yellow";
  if (s.includes("red") || s === "3" || s === "d") return "red";
  return "unknown";
}
