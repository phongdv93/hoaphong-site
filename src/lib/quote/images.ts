/** Lấy kích thước gốc ảnh data URL (chạy trên browser). */
export function loadImageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error("Không đọc được ảnh"));
    img.src = dataUrl;
  });
}

/** Fit trong hộp maxW×maxH, giữ tỷ lệ — trả kích thước mm (hoặc px nếu ratio 1). */
export function fitAspectBox(
  naturalW: number,
  naturalH: number,
  maxW: number,
  maxH: number
): { w: number; h: number } {
  if (!naturalW || !naturalH) return { w: maxW, h: maxH };
  const ratio = naturalW / naturalH;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  return { w, h };
}
