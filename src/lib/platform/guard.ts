import { getSessionUser } from "@/lib/auth";
import { resolveActiveCompanyForUser } from "@/lib/projects/companies";
import { getActiveModuleIds, isPlatformAdmin } from "./access";
import { getModuleById } from "./catalog";
import { hasUserModuleAccess } from "./member-modules";

export type GuardResult =
  | { ok: true; userId: number; companyId: number; isAdmin: boolean }
  | {
      ok: false;
      reason: "unauthorized" | "no_company" | "no_module";
      moduleName?: string;
      moduleId?: string;
      companyId?: number;
      canSelfEnableTrial?: boolean;
    };

/**
 * Dùng trong server component / API:
 * 1. Có session
 * 2. Có active company
 * 3. Company được bật module này (super admin bypass)
 */
export async function requireModuleAccess(moduleId: string): Promise<GuardResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: "unauthorized" };

  const admin = await isPlatformAdmin(user.id);
  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) {
    return admin
      ? { ok: false, reason: "no_company" }
      : { ok: false, reason: "no_company" };
  }

  if (admin) return { ok: true, userId: user.id, companyId: active.companyId, isAdmin: true };

  const enabled = await getActiveModuleIds(active.companyId);
  if (!enabled.has(moduleId)) {
    const mod = getModuleById(moduleId);
    return {
      ok: false,
      reason: "no_module",
      moduleName: mod?.name ?? moduleId,
      moduleId,
      companyId: active.companyId,
      canSelfEnableTrial: false,
    };
  }

  const allowed = await hasUserModuleAccess(
    active.companyId,
    user.id,
    moduleId,
    active.role
  );
  if (!allowed) {
    const mod = getModuleById(moduleId);
    return {
      ok: false,
      reason: "no_module",
      moduleName: mod?.name ?? moduleId,
      moduleId,
      companyId: active.companyId,
      canSelfEnableTrial: false,
    };
  }

  return { ok: true, userId: user.id, companyId: active.companyId, isAdmin: false };
}

export async function requirePlatformAdmin(): Promise<number | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const admin = await isPlatformAdmin(user.id);
  return admin ? user.id : null;
}
