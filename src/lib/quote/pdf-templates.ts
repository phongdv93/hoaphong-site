export type PdfTemplatePreviewVariant =
  | "classic"
  | "minimal"
  | "modern"
  | "formal"
  | "emerald"
  | "burgundy"
  | "hoaphong";

export type PdfTemplateMeta = {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  preview: PdfTemplatePreviewVariant;
  premium?: boolean;
};

export const PDF_TEMPLATES: PdfTemplateMeta[] = [
  {
    id: "classic",
    name: "Mặc định",
    description: "Xanh navy, bố cục cân đối",
    primaryColor: "#1e5a9e",
    preview: "classic",
  },
  {
    id: "minimal",
    name: "Tối giản",
    description: "Ít viền, chữ rõ",
    primaryColor: "#374151",
    preview: "minimal",
  },
  {
    id: "modern",
    name: "Hiện đại",
    description: "Accent xanh, header gọn",
    primaryColor: "#0284c7",
    preview: "modern",
  },
  {
    id: "formal",
    name: "Trang trọng",
    description: "Viền kép, phù hợp hợp đồng",
    primaryColor: "#1e3a5f",
    preview: "formal",
  },
  {
    id: "emerald",
    name: "Xanh lá",
    description: "Tông xanh tươi mát",
    primaryColor: "#059669",
    preview: "emerald",
  },
  {
    id: "burgundy",
    name: "Đỏ đô",
    description: "Tông ấm, nội thất",
    primaryColor: "#9f1239",
    preview: "burgundy",
  },
  {
    id: "hoaphong",
    name: "Hoa Phong",
    description: "Tím trắng, song ngữ Việt–Anh",
    primaryColor: "#5b2d8e",
    preview: "hoaphong",
    premium: true,
  },
];

export const DEFAULT_PDF_TEMPLATE_ID = "classic";

/** Map email / mã → templateId riêng. Có thể chuyển sang DB sau. */
const USER_TEMPLATE_MAP: Record<string, string> = {
  "contact@hoaphong.vn": "hoaphong",
  "contact@hoaphong.com.vn": "hoaphong",
  "phong@hoaphong.vn": "hoaphong",
  "HP-CLASSIC": "hoaphong",
  "HP2026": "hoaphong",
  "HOAPHONG": "hoaphong",
};

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

/** Áp màu chủ đạo từ template (trừ khi user đã tự chỉnh — luôn sync khi đổi template in). */
export function primaryColorForTemplate(templateId: string): string {
  return getPdfTemplateMeta(templateId).primaryColor;
}
