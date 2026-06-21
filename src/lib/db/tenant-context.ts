import { AsyncLocalStorage } from "async_hooks";

const storage = new AsyncLocalStorage<number>();

export function runWithTenantCompany<T>(companyId: number, fn: () => Promise<T>): Promise<T> {
  return storage.run(companyId, fn);
}

export function getTenantCompanyIdFromContext(): number | undefined {
  return storage.getStore();
}

export function requireTenantCompanyIdFromContext(): number {
  const id = storage.getStore();
  if (!id) {
    throw new Error("Chưa có ngữ cảnh công ty (tenant). Chọn công ty trước khi thao tác.");
  }
  return id;
}
