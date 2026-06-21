/** Header tải file — chỉ ASCII trong filename (tránh lỗi ByteString Node/Next). */
export function attachmentContentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_") || "download";
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
