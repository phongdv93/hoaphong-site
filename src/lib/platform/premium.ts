import { isPlatformAdmin } from "./access";

/** Hoa Phong Premium — quản lý company_members và module công ty. */
export const isHoaphongPremium = isPlatformAdmin;

export async function requireHoaphongPremium(userId: number): Promise<boolean> {
  return isHoaphongPremium(userId);
}

export const PREMIUM_ONLY_MESSAGE =
  "Chỉ tài khoản Hoa Phong Premium được thêm/sửa thành viên công ty và quản lý module.";
