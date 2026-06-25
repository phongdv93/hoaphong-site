import type { PdfTemplatePreviewVariant } from "./pdf-templates";

/** Cấu hình kiểu in — bố cục khác nhau, không chỉ đổi màu. */
export type PrintLayoutConfig = {
  variant: PdfTemplatePreviewVariant;
  /** jspdf-autotable */
  table: {
    lineWidth: number;
    lineColor: [number, number, number];
    headFill: "soft" | "solid" | "none";
    headTextWhite: boolean;
    alternateRow: boolean;
    fontSize: number;
  };
};

export const PRINT_LAYOUT_CONFIG: Record<PdfTemplatePreviewVariant, PrintLayoutConfig> = {
  classic: {
    variant: "classic",
    table: { lineWidth: 0.15, lineColor: [200, 200, 200], headFill: "soft", headTextWhite: false, alternateRow: true, fontSize: 9 },
  },
  minimal: {
    variant: "minimal",
    table: { lineWidth: 0, lineColor: [220, 220, 220], headFill: "none", headTextWhite: false, alternateRow: false, fontSize: 9 },
  },
  modern: {
    variant: "modern",
    table: { lineWidth: 0.1, lineColor: [210, 210, 210], headFill: "solid", headTextWhite: true, alternateRow: true, fontSize: 8.5 },
  },
  formal: {
    variant: "formal",
    table: { lineWidth: 0.25, lineColor: [80, 80, 80], headFill: "soft", headTextWhite: false, alternateRow: false, fontSize: 9 },
  },
  striped: {
    variant: "striped",
    table: { lineWidth: 0.12, lineColor: [190, 190, 190], headFill: "solid", headTextWhite: true, alternateRow: true, fontSize: 9 },
  },
  compact: {
    variant: "compact",
    table: { lineWidth: 0.1, lineColor: [200, 200, 200], headFill: "soft", headTextWhite: false, alternateRow: false, fontSize: 8 },
  },
  hoaphong: {
    variant: "hoaphong",
    table: { lineWidth: 0.15, lineColor: [180, 160, 200], headFill: "solid", headTextWhite: true, alternateRow: true, fontSize: 8.5 },
  },
};

export function getPrintLayoutConfig(variant: PdfTemplatePreviewVariant): PrintLayoutConfig {
  return PRINT_LAYOUT_CONFIG[variant] ?? PRINT_LAYOUT_CONFIG.classic;
}

/** Gộp id template cũ (chỉ đổi màu) sang layout mới. */
export function migrateTemplateId(id: string): string {
  if (id === "emerald") return "striped";
  if (id === "burgundy") return "compact";
  return id;
}
