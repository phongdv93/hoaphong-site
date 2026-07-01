import type { MobifoneInvoiceProfile } from "./types";

export function isMobifoneProfileConfigured(
  profile: MobifoneInvoiceProfile | null | undefined
): boolean {
  return Boolean(
    profile && profile.apiUsername?.trim() && profile.hasApiPassword && profile.maDvcs?.trim()
  );
}
