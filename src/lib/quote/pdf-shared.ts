import { fitAspectBox, loadImageSize } from "./images";
import type { FontFamily, FontFile } from "./pdf-fonts";
import { FONT_FAMILIES } from "./pdf-fonts";

/** Cache base64 theo URL để không tải lại. */
const urlCache: Map<string, string> = new Map();

let _hasItalic = false;
let _hasLight = false;
let _lastFamilyId = "";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function fetchAsBase64(url: string): Promise<string | null> {
  const cached = urlCache.get(url);
  if (cached) return cached;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[PDF font] HTTP ${res.status} → ${url}`);
      return null;
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 1000) {
      console.warn(`[PDF font] File quá nhỏ (${buf.byteLength}B), bỏ → ${url}`);
      return null;
    }
    const base64 = arrayBufferToBase64(buf);
    urlCache.set(url, base64);
    return base64;
  } catch (err) {
    console.warn(`[PDF font] Lỗi tải → ${url}`, err);
    return null;
  }
}

async function fetchFile(
  file: FontFile | undefined,
  label?: string
): Promise<{ data: string; url: string } | null> {
  if (!file) return null;
  const urls = Array.isArray(file) ? file : [file];
  for (const url of urls) {
    const base64 = await fetchAsBase64(url);
    if (base64) {
      if (label) console.info(`[PDF font] ${label} ← ${url}`);
      return { data: base64, url };
    }
  }
  return null;
}

/**
 * Load font theo family. Đăng ký TTF dưới alias "DocFont" / "DocLight".
 * Nếu family chính lỗi → fallback Noto Sans (file local).
 */
export async function loadDocFonts(
  pdf: import("jspdf").jsPDF,
  family: FontFamily
): Promise<void> {
  _lastFamilyId = family.id;
  console.info(`[PDF font] Đang tải font họ "${family.name}" (${family.id})…`);

  let [regular, bold, italic, light] = await Promise.all([
    fetchFile(family.files.regular, `${family.id}/regular`),
    fetchFile(family.files.bold, `${family.id}/bold`),
    fetchFile(family.files.italic, `${family.id}/italic`),
    fetchFile(family.files.light, `${family.id}/light`),
  ]);

  // Fallback từng phần: nếu thiếu bất kỳ kiểu nào → dùng Noto Sans tương ứng
  if (!regular || !bold) {
    const fallback = FONT_FAMILIES.find((f) => f.id === "noto-sans");
    if (fallback) {
      console.warn(
        `[PDF font] Không tải được "${family.name}", chuyển sang Noto Sans để dự phòng.`
      );
      if (!regular) regular = await fetchFile(fallback.files.regular, "fallback/regular");
      if (!bold) bold = await fetchFile(fallback.files.bold, "fallback/bold");
      if (!italic) italic = await fetchFile(fallback.files.italic, "fallback/italic");
      if (!light) light = await fetchFile(fallback.files.light, "fallback/light");
    }
  }

  if (!regular || !bold) {
    throw new Error("Không tải được font (regular/bold)");
  }

  pdf.addFileToVFS("Doc-Regular.ttf", regular.data);
  pdf.addFont("Doc-Regular.ttf", "DocFont", "normal");
  pdf.addFileToVFS("Doc-Bold.ttf", bold.data);
  pdf.addFont("Doc-Bold.ttf", "DocFont", "bold");

  if (italic) {
    pdf.addFileToVFS("Doc-Italic.ttf", italic.data);
    pdf.addFont("Doc-Italic.ttf", "DocFont", "italic");
  }

  pdf.addFileToVFS("Doc-Light.ttf", (light ?? regular).data);
  pdf.addFont("Doc-Light.ttf", "DocLight", "normal");

  _hasItalic = Boolean(italic);
  _hasLight = Boolean(light);
  console.info(
    `[PDF font] Đã đăng ký "DocFont"/"DocLight" cho "${family.name}". italic=${_hasItalic}, light=${_hasLight}`
  );
}

export function getCurrentFontFamilyId(): string {
  return _lastFamilyId;
}

export function hasItalicFont(): boolean {
  return _hasItalic;
}

export function hasLightFont(): boolean {
  return _hasLight;
}

export function detectImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

export async function addImageFit(
  pdf: import("jspdf").jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  align: "left" | "center" | "right" = "left"
): Promise<{ w: number; h: number; x: number }> {
  const fmt = detectImageFormat(dataUrl);
  try {
    const natural = await loadImageSize(dataUrl);
    const fit = fitAspectBox(natural.w, natural.h, maxW, maxH);
    const drawX =
      align === "right" ? x + maxW - fit.w : align === "center" ? x + (maxW - fit.w) / 2 : x;
    pdf.addImage(dataUrl, fmt, drawX, y, fit.w, fit.h);
    return { ...fit, x: drawX };
  } catch {
    pdf.addImage(dataUrl, fmt, x, y, maxW, maxH);
    return { w: maxW, h: maxH, x };
  }
}

export function formatQuoteDate(iso: string): string {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("vi-VN");
}

export function formatVnLongDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return `Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}

export function drawPageFooter(pdf: import("jspdf").jsPDF, pageW: number, pageH: number) {
  const total = pdf.getNumberOfPages();
  const footerY = pageH - 6;
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p);
    pdf.setFont("DocFont", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(110, 110, 110);
    pdf.text(`Powered by hoaphong.com.vn  ·  ${p}/${total}`, pageW / 2, footerY, { align: "center" });
  }
}
