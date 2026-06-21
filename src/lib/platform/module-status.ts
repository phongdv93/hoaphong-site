import type { PlatformModule } from "./catalog";

export interface ModuleSubscriptionSnapshot {
  enabled: boolean;
  expiresAt: string | null;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Khớp logic getActiveModuleIds / hasModuleAccess. */
export function isCompanyModuleActive(
  sub: ModuleSubscriptionSnapshot | null,
  mod: PlatformModule
): boolean {
  if (mod.alwaysOn) return true;
  if (!sub?.enabled) return false;
  if (!sub.expiresAt) return true;
  return sub.expiresAt >= todayIso();
}
