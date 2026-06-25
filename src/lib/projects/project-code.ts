/** Mã dự án tự sinh khi tạo tự do (không gắn PI). */
export function generateFreeProjectCode(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DA-${ymd}-${suffix}`;
}
