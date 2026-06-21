import { normalizeTaxCode } from "./tax-code";

export interface BusinessLookupResult {
  taxCode: string;
  officialName: string;
  status: "active" | "inactive" | "unknown";
  address?: string;
  source: string;
}

/** Tra cứu MST qua URL tùy chỉnh (JSON). Xem .env COMPANY_MST_VERIFY_URL */
export async function lookupBusinessByTaxCode(
  taxCode: string
): Promise<BusinessLookupResult | null> {
  const mst = normalizeTaxCode(taxCode);
  const template = process.env.COMPANY_MST_VERIFY_URL?.trim();
  if (!template) return null;

  const url = template.includes("{taxCode}")
    ? template.replace("{taxCode}", encodeURIComponent(mst))
    : `${template}${template.includes("?") ? "&" : "?"}taxCode=${encodeURIComponent(mst)}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "HoaPhongERP/1.0" },
      signal: AbortSignal.timeout(Number(process.env.COMPANY_MST_VERIFY_TIMEOUT_MS ?? "12000")),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;

    const officialName = String(
      data.officialName ?? data.name ?? data.companyName ?? ""
    ).trim();
    if (!officialName) return null;

    const statusRaw = String(data.status ?? data.tinhTrang ?? "active").toLowerCase();
    let status: BusinessLookupResult["status"] = "unknown";
    if (
      statusRaw.includes("hoat dong") ||
      statusRaw.includes("hoạt động") ||
      statusRaw === "active" ||
      statusRaw === "1"
    ) {
      status = "active";
    } else if (
      statusRaw.includes("ngung") ||
      statusRaw.includes("ngừng") ||
      statusRaw.includes("giai the") ||
      statusRaw.includes("inactive")
    ) {
      status = "inactive";
    }

    return {
      taxCode: mst,
      officialName,
      status,
      address: data.address ? String(data.address) : undefined,
      source: "custom_api",
    };
  } catch {
    return null;
  }
}
