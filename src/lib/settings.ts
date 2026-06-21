import { query, withTransaction } from "./db";
import type { SiteSettings } from "./types";

const DEFAULTS: SiteSettings = {
  companyName: "Hoa Phong",
  tagline: "Từ không gian sống đến giải pháp số — Trọn gói, bền vững",
  description:
    "Hoa Phong — sản xuất thi công nội thất, cải tạo trang trí, xây dựng, cung ứng vật tư thiết bị đấu thầu và phát triển giải pháp thiết kế & phần mềm.",
  email: "contact@hoaphong.vn",
  phone: "0901 234 567",
  address: "123 Đường Hoa Phong, Quận 1, TP. Hồ Chí Minh",
  heroTitle: "Kiến tạo không gian — Nâng tầm công trình",
  heroSubtitle:
    "Hơn một thập kỷ đồng hành: từ nội thất, xây dựng, cung ứng vật tư đến thiết kế giải pháp và phần mềm quản lý dự án.",
  aboutTitle: "Hành trình Hoa Phong",
  aboutContent:
    "Hoa Phong khởi nguồn từ sản xuất và thi công nội thất, mở rộng sang cải tạo, trang trí, xây dựng, đấu thầu cung ứng vật tư & thiết bị điện, và hiện phát triển thêm mảng thiết kế giải pháp cùng phần mềm quản lý — một đối tác, nhiều lớp giá trị.",
  facebook: "https://facebook.com/hoaphong",
  linkedin: "https://linkedin.com/company/hoaphong",
  zalo: "0901234567",
  logoUrl: "",
};

export async function getSettings(): Promise<SiteSettings> {
  try {
    const rows = await query<{ key: string; value: string }>("SELECT key, value FROM settings");
  const settings = { ...DEFAULTS };
  for (const row of rows) {
    const key = row.key as keyof SiteSettings;
    if (key in settings) {
      (settings as Record<string, string>)[key] = row.value;
    }
  }
    return settings;
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveSettings(data: Partial<SiteSettings>) {
  await withTransaction(async (client) => {
    for (const [key, value] of Object.entries(data)) {
      await client.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`,
        [key, String(value ?? "")]
      );
    }
  });
}
