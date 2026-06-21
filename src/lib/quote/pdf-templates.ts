export type PdfTemplateMeta = {
  id: string;
  name: string;
  description: string;
  /** Có thể dùng public cho mọi user, hoặc chỉ riêng tư (cần mã/email) */
  premium?: boolean;
};

export const PDF_TEMPLATES: PdfTemplateMeta[] = [
  {
    id: "classic",
    name: "Mặc định",
    description: "Bố cục đơn giản, gọn gàng",
  },
  {
    id: "hoaphong",
    name: "Hoa Phong Classic",
    description: "Tím trắng, bố cục song ngữ Việt-Anh",
    premium: true,
  },
];

export const DEFAULT_PDF_TEMPLATE_ID = "classic";

/** Map email / mã → templateId riêng. Có thể chuyển sang DB sau. */
const USER_TEMPLATE_MAP: Record<string, string> = {
  // Email
  "contact@hoaphong.vn": "hoaphong",
  "contact@hoaphong.com.vn": "hoaphong",
  "phong@hoaphong.vn": "hoaphong",

  // Mã đăng ký template
  "HP-CLASSIC": "hoaphong",
  "HP2026": "hoaphong",
  "HOAPHONG": "hoaphong",
};

/** Trả về templateId nếu khớp email/mã đã đăng ký, null nếu không */
export function resolveTemplateForUser(input: string): string | null {
  if (!input) return null;
  const key = input.trim();
  if (!key) return null;
  for (const [k, v] of Object.entries(USER_TEMPLATE_MAP)) {
    if (k.toLowerCase() === key.toLowerCase()) return v;
  }
  return null;
}

export function isValidPdfTemplateId(id: string | undefined | null): boolean {
  return Boolean(id) && PDF_TEMPLATES.some((t) => t.id === id);
}

export function normalizePdfTemplateId(id: string | undefined | null): string {
  return isValidPdfTemplateId(id) ? (id as string) : DEFAULT_PDF_TEMPLATE_ID;
}

export function getPdfTemplateMeta(id: string): PdfTemplateMeta {
  return PDF_TEMPLATES.find((t) => t.id === id) ?? PDF_TEMPLATES[0];
}
