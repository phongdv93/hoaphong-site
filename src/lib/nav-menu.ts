import { query, withTransaction } from "./db";

export type NavMenuItem = {
  id: string;
  href: string;
  label: string;
  visible: boolean;
  sortOrder: number;
};

export const DEFAULT_NAV_MENU: NavMenuItem[] = [
  { id: "home", href: "/", label: "Trang chủ", visible: true, sortOrder: 0 },
  { id: "about", href: "/ve-chung-toi", label: "Về chúng tôi", visible: true, sortOrder: 1 },
  { id: "services", href: "/dich-vu", label: "Dịch vụ", visible: true, sortOrder: 2 },
  { id: "products", href: "/san-pham", label: "Sản phẩm", visible: true, sortOrder: 3 },
  { id: "blog", href: "/blog", label: "Blog", visible: true, sortOrder: 4 },
  { id: "quote", href: "/mini-tool/bao-gia", label: "Mini tool báo giá", visible: true, sortOrder: 5 },
  { id: "contact", href: "/lien-he", label: "Liên hệ", visible: true, sortOrder: 6 },
];

const SETTINGS_KEY = "navMenu";

export type NavLink = { href: string; label: string };

export function sortNavMenu(items: NavMenuItem[]): NavMenuItem[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "vi"));
}

export function visibleNavLinks(items: NavMenuItem[]): NavLink[] {
  return sortNavMenu(items)
    .filter((it) => it.visible && it.href.trim() && it.label.trim())
    .map((it) => ({ href: it.href.trim(), label: it.label.trim() }));
}

export function normalizeNavMenu(raw: unknown): NavMenuItem[] {
  if (!Array.isArray(raw)) return [...DEFAULT_NAV_MENU];
  const out: NavMenuItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const href = String(r.href ?? "").trim();
    const label = String(r.label ?? "").trim();
    if (!href || !label) continue;
    out.push({
      id: String(r.id ?? `nav-${out.length}`),
      href,
      label,
      visible: r.visible !== false,
      sortOrder: Number.isFinite(Number(r.sortOrder)) ? Number(r.sortOrder) : out.length,
    });
  }
  return out.length > 0 ? sortNavMenu(out) : [...DEFAULT_NAV_MENU];
}

export async function getNavMenu(): Promise<NavMenuItem[]> {
  try {
    const rows = await query<{ value: string }>(
      "SELECT value FROM settings WHERE key = $1",
      [SETTINGS_KEY]
    );
    if (!rows[0]?.value) return [...DEFAULT_NAV_MENU];
    return normalizeNavMenu(JSON.parse(rows[0].value));
  } catch {
    return [...DEFAULT_NAV_MENU];
  }
}

export async function saveNavMenu(items: NavMenuItem[]): Promise<NavMenuItem[]> {
  const normalized = normalizeNavMenu(items).map((it, i) => ({ ...it, sortOrder: i }));
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`,
      [SETTINGS_KEY, JSON.stringify(normalized)]
    );
  });
  return normalized;
}
