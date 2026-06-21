/** Tên hiển thị sau dấu | trên thanh tiêu đề public */
export function getPublicPageLabel(pathname: string): string | null {
  if (pathname === "/") return null;
  const map: Record<string, string> = {
    "/ve-chung-toi": "Về chúng tôi",
    "/dich-vu": "Dịch vụ",
    "/san-pham": "Sản phẩm",
    "/blog": "Blog",
    "/lien-he": "Liên hệ",
    "/bao-gia": "Báo giá",
  };
  if (map[pathname]) return map[pathname];
  if (pathname.startsWith("/blog/")) return "Blog";
  return null;
}
