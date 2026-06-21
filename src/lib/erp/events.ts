/** Sự kiện window — đồng bộ sidebar / quyền module giữa các tab và sau khi Ultimate đổi gói. */

export const COMPANY_CHANGED_EVENT = "hoaphong:company-changed";
export const COMPANY_MODULES_CHANGED_EVENT = "hoaphong:company-modules-changed";

export function dispatchCompanyChanged(companyId: number): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(COMPANY_CHANGED_EVENT, { detail: { companyId } })
  );
}

export function dispatchCompanyModulesChanged(companyId: number): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(COMPANY_MODULES_CHANGED_EVENT, { detail: { companyId } })
  );
}
