/** Mỗi file font có thể là URL đơn hoặc mảng URL fallback. */
export type FontFile = string | string[];

export type FontFamily = {
  id: string;
  name: string;
  description: string;
  /** Có hỗ trợ đầy đủ tiếng Việt? */
  vietnamese: boolean;
  files: {
    regular: FontFile;
    bold: FontFile;
    italic?: FontFile;
    light?: FontFile;
  };
};

// CDN gốc của Google Fonts (repo google/fonts trên GitHub)
const GF = "https://cdn.jsdelivr.net/gh/google/fonts@main";
// Repo riêng của Montserrat — có sẵn static .ttf cho Regular/Bold/Light
const GF_MONT = "https://cdn.jsdelivr.net/gh/googlefonts/montserrat";
// Repo Quicksand chính thức — có static .ttf đầy đủ
const GF_QS = "https://cdn.jsdelivr.net/gh/andrew-paglinawan/QuicksandFamily@master/fonts/statics";
// Repo Noto Fonts cũ (đa số mirror trên jsdelivr) — dùng fallback cho NotoSans Italic
const NOTO_LEGACY =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans";

export const FONT_FAMILIES: FontFamily[] = [
  {
    id: "noto-sans",
    name: "Noto Sans",
    description: "Mặc định — phổ thông, có sẵn",
    vietnamese: true,
    files: {
      regular: "/fonts/NotoSans-Regular.ttf",
      bold: "/fonts/NotoSans-Bold.ttf",
      italic: [
        "/fonts/NotoSans-Italic.ttf",
        `${NOTO_LEGACY}/NotoSans-Italic.ttf`,
        `${GF}/ofl/notosans/NotoSans-Italic%5Bwdth,wght%5D.ttf`,
      ],
      light: "/fonts/NotoSans-Light.ttf",
    },
  },
  {
    id: "be-vietnam-pro",
    name: "Be Vietnam Pro",
    description: "Thiết kế chuyên cho tiếng Việt — hiện đại",
    vietnamese: true,
    files: {
      regular: `${GF}/ofl/bevietnampro/BeVietnamPro-Regular.ttf`,
      bold: `${GF}/ofl/bevietnampro/BeVietnamPro-Bold.ttf`,
      italic: `${GF}/ofl/bevietnampro/BeVietnamPro-Italic.ttf`,
      light: `${GF}/ofl/bevietnampro/BeVietnamPro-Light.ttf`,
    },
  },
  {
    id: "montserrat",
    name: "Montserrat",
    description: "Hình học, mạnh mẽ — phù hợp tiêu đề",
    vietnamese: true,
    files: {
      regular: [
        `${GF_MONT}/fonts/ttf/Montserrat-Regular.ttf`,
        `${GF}/ofl/montserrat/Montserrat%5Bwght%5D.ttf`,
      ],
      bold: [
        `${GF_MONT}/fonts/ttf/Montserrat-Bold.ttf`,
        `${GF}/ofl/montserrat/Montserrat%5Bwght%5D.ttf`,
      ],
      italic: [
        `${GF}/ofl/montserrat/Montserrat-Italic%5Bwght%5D.ttf`,
      ],
      light: [
        `${GF_MONT}/fonts/ttf/Montserrat-Light.ttf`,
        `${GF}/ofl/montserrat/Montserrat%5Bwght%5D.ttf`,
      ],
    },
  },
  {
    id: "crimson-text",
    name: "Crimson Text",
    description: "Serif cổ điển, in đậm rõ — phù hợp văn bản trang trọng",
    vietnamese: true,
    files: {
      regular: `${GF}/ofl/crimsontext/CrimsonText-Regular.ttf`,
      bold: `${GF}/ofl/crimsontext/CrimsonText-Bold.ttf`,
      italic: `${GF}/ofl/crimsontext/CrimsonText-Italic.ttf`,
    },
  },
  {
    id: "lora",
    name: "Lora",
    description: "Serif trang nhã (chỉ 1 độ đậm — không in đậm)",
    vietnamese: true,
    files: {
      // Lora trên CDN chỉ có file biến — bold dùng chung file, không khác Regular
      regular: `${GF}/ofl/lora/Lora%5Bwght%5D.ttf`,
      bold: `${GF}/ofl/lora/Lora%5Bwght%5D.ttf`,
      italic: `${GF}/ofl/lora/Lora-Italic%5Bwght%5D.ttf`,
    },
  },
  {
    id: "quicksand",
    name: "Quicksand",
    description: "Tròn, thân thiện — in đậm rõ ràng",
    vietnamese: true,
    files: {
      regular: [
        `${GF_QS}/Quicksand-Regular.ttf`,
        `${GF}/ofl/quicksand/Quicksand%5Bwght%5D.ttf`,
      ],
      bold: [
        `${GF_QS}/Quicksand-Bold.ttf`,
        `${GF}/ofl/quicksand/Quicksand%5Bwght%5D.ttf`,
      ],
      light: [
        `${GF_QS}/Quicksand-Light.ttf`,
        `${GF}/ofl/quicksand/Quicksand%5Bwght%5D.ttf`,
      ],
    },
  },
];

export const DEFAULT_FONT_FAMILY_ID = "noto-sans";

export function getFontFamily(id: string): FontFamily {
  return FONT_FAMILIES.find((f) => f.id === id) ?? FONT_FAMILIES[0];
}

export function isValidFontFamilyId(id: string | undefined | null): boolean {
  return Boolean(id) && FONT_FAMILIES.some((f) => f.id === id);
}

export function normalizeFontFamilyId(id: string | undefined | null): string {
  return isValidFontFamilyId(id) ? (id as string) : DEFAULT_FONT_FAMILY_ID;
}
