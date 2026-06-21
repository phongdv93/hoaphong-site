/** Chuẩn hóa MST: chỉ giữ số, lấy 10 số đầu nếu có chi nhánh (-xxx) */
export function normalizeTaxCode(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(0, 10);
  return digits;
}

/** Kiểm tra chữ số kiểm tra MST 10 số (VN) */
export function isValidVietnamTaxCode(raw: string): boolean {
  const mst = normalizeTaxCode(raw);
  if (!/^\d{10}$/.test(mst)) return false;
  const weights = [31, 29, 23, 19, 17, 13, 7, 5, 3];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(mst[i]) * weights[i];
  let check = 10 - (sum % 11);
  if (check >= 10) check = 0;
  return check === Number(mst[9]);
}

export function normalizeCompanyName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(cong ty|cty|tnhh|cp|mtv|xnk|tm|dv|dau tu|thuong mai)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** So khớp tên công ty (bỏ dấu, TNHH, v.v.) */
export function companyNamesMatch(submitted: string, official: string): boolean {
  const a = normalizeCompanyName(submitted);
  const b = normalizeCompanyName(official);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const aTokens = new Set(a.split(" ").filter((t) => t.length > 2));
  const bTokens = b.split(" ").filter((t) => t.length > 2);
  if (bTokens.length === 0) return false;
  const hit = bTokens.filter((t) => aTokens.has(t)).length;
  return hit / bTokens.length >= 0.6;
}
