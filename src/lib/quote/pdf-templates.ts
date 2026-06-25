import { migrateTemplateId } from "./print-layout";

export type PdfTemplatePreviewVariant =
  | "classic"
  | "minimal"
  | "modern"
  | "formal"
  | "striped"
  | "compact"
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
    description: "Logo trên, 2 cột thông tin, bảng chuẩn",
    primaryColor: "#1e5a9e",
    preview: "classic",
  },
  {
    id: "minimal",
    name: "Tối giản",
    description: "Không viền, tiêu đề lớn, bảng gạch ngang",
    primaryColor: "#374151",
    preview: "minimal",
  },
  {
    id: "modern",
    name: "Sidebar",
    description: "Thanh màu bên trái, logo + bên bán",
    primaryColor: "#0284c7",
    preview: "modern",
  },
  {
    id: "formal",
    name: "Trang trọng",
    description: "Viền kép, khung thông tin, tiêu đề serif",
    primaryColor: "#1e3a5f",
    preview: "formal",
  },
  {
    id: "striped",
    name: "Banner",
    description: "Header full-width màu, bảng đầu cột đậm",
    primaryColor: "#059669",
    preview: "striped",
  },
  {
    id: "compact",
    name: "Gọn",
    description: "Meta dạng chip, chữ nhỏ, nhiều dòng",
    primaryColor: "#9f1239",
    preview: "compact",
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
  const migrated = migrateTemplateId(id ?? "");
  return isValidPdfTemplateId(migrated) ? migrated : DEFAULT_PDF_TEMPLATE_ID;
}

export function getPdfTemplateMeta(id: string): PdfTemplateMeta {
  const migrated = migrateTemplateId(id);
  return PDF_TEMPLATES.find((t) => t.id === migrated) ?? PDF_TEMPLATES[0];
}

/** Áp màu chủ đạo từ template (trừ khi user đã tự chỉnh — luôn sync khi đổi template in). */
export function primaryColorForTemplate(templateId: string): string {
  return getPdfTemplateMeta(templateId).primaryColor;
}
