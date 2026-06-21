import { platformExecute, platformQuery, platformQueryOne } from "@/lib/db/platform";
import { isHoaphongPremium, PREMIUM_ONLY_MESSAGE } from "./premium";
import { alwaysOnModuleIds, NEW_COMPANY_DEFAULT_MODULE_IDS, PLATFORM_MODULES, type PlatformModule } from "./catalog";
import { todayIso } from "./module-status";

export { isCompanyModuleActive } from "./module-status";

export interface CompanyModuleRow {
  companyId: number;
  moduleId: string;
  enabled: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  monthlyFee: number;
  notes: string;
  enabledBy: number | null;
  createdAt: string;
  updatedAt: string;
}

function toIsoDate(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function mapRow(row: Record<string, unknown>): CompanyModuleRow {
  return {
    companyId: row.company_id as number,
    moduleId: row.module_id as string,
    enabled: Boolean(row.enabled),
    startedAt: toIsoDate(row.started_at),
    expiresAt: toIsoDate(row.expires_at),
    monthlyFee: Number(row.monthly_fee ?? 0),
    notes: (row.notes as string) ?? "",
    enabledBy: (row.enabled_by as number | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/** Lấy toàn bộ subscription của một công ty (dùng cho trang super admin). */
export async function listCompanyModules(companyId: number): Promise<CompanyModuleRow[]> {
  const rows = await platformQuery<Record<string, unknown>>(
    `SELECT * FROM company_modules WHERE company_id = $1`,
    [companyId]
  );
  return rows.map(mapRow);
}

/**
 * Trả về danh sách module_id đang được sử dụng cho công ty này:
 *   - enabled = true
 *   - và (expires_at IS NULL HOẶC expires_at >= today)
 *   - cộng thêm các module alwaysOn (luôn bật bất kể row có hay không)
 */
export async function getActiveModuleIds(companyId: number): Promise<Set<string>> {
  const rows = await platformQuery<{ module_id: string }>(
    `SELECT module_id FROM company_modules
     WHERE company_id = $1 AND enabled = TRUE
       AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)`,
    [companyId]
  );
  const set = new Set(rows.map((r) => r.module_id));
  for (const id of alwaysOnModuleIds()) set.add(id);
  return set;
}

/** Có quyền truy cập module này không? */
export async function hasModuleAccess(
  companyId: number,
  moduleId: string
): Promise<boolean> {
  const active = await getActiveModuleIds(companyId);
  return active.has(moduleId);
}

/** Cập nhật subscription module (super admin). Chỉ ghi đè field được gửi trong patch. */
export async function upsertCompanyModule(
  companyId: number,
  moduleId: string,
  patch: {
    enabled?: boolean;
    startedAt?: string | null;
    expiresAt?: string | null;
    monthlyFee?: number;
    notes?: string;
    enabledBy?: number | null;
  },
  actorUserId?: number,
  opts?: { bypassPremium?: boolean }
): Promise<void> {
  if (
    !opts?.bypassPremium &&
    (actorUserId == null || !(await isHoaphongPremium(actorUserId)))
  ) {
    throw new Error(PREMIUM_ONLY_MESSAGE);
  }
  const mod = PLATFORM_MODULES.find((m) => m.id === moduleId);
  if (!mod) {
    throw new Error(`Module không tồn tại: ${moduleId}`);
  }
  if (mod.alwaysOn && patch.enabled === false) {
    throw new Error(`Module "${mod.name}" là bắt buộc, không thể tắt.`);
  }

  const existing = await platformQueryOne<Record<string, unknown>>(
    `SELECT * FROM company_modules WHERE company_id = $1 AND module_id = $2`,
    [companyId, moduleId]
  );

  let enabled =
    patch.enabled ??
    (existing != null ? Boolean(existing.enabled) : mod.defaultForNewCompany || mod.alwaysOn);
  if (mod.alwaysOn) enabled = true;

  let startedAt =
    patch.startedAt !== undefined
      ? patch.startedAt
      : existing?.started_at != null
        ? toIsoDate(existing.started_at)
        : null;
  if (enabled && !startedAt) startedAt = todayIso();

  const expiresAt =
    patch.expiresAt !== undefined
      ? patch.expiresAt
      : existing?.expires_at != null
        ? toIsoDate(existing.expires_at)
        : null;

  const monthlyFee =
    patch.monthlyFee ??
    (existing != null ? Number(existing.monthly_fee ?? 0) : mod.suggestedMonthlyFee);

  const notes =
    patch.notes !== undefined
      ? patch.notes
      : ((existing?.notes as string) ?? "");

  const enabledBy =
    patch.enabledBy ??
    ((existing?.enabled_by as number | null) ?? actorUserId);

  await platformExecute(
    `INSERT INTO company_modules
      (company_id, module_id, enabled, started_at, expires_at, monthly_fee, notes, enabled_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (company_id, module_id) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       started_at = EXCLUDED.started_at,
       expires_at = EXCLUDED.expires_at,
       monthly_fee = EXCLUDED.monthly_fee,
       notes = EXCLUDED.notes,
       enabled_by = EXCLUDED.enabled_by,
       updated_at = NOW()`,
    [
      companyId,
      moduleId,
      enabled,
      startedAt,
      expiresAt,
      monthlyFee,
      notes,
      enabledBy,
    ]
  );
}

/** Tự sinh subscription mặc định khi tạo công ty mới: dự án, HR, quản trị hệ thống. */
export async function seedDefaultModulesForCompany(
  companyId: number,
  createdByUserId: number,
  opts?: { bypassPremium?: boolean }
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const moduleIds = new Set<string>([...NEW_COMPANY_DEFAULT_MODULE_IDS]);
  for (const id of alwaysOnModuleIds()) moduleIds.add(id);

  for (const moduleId of moduleIds) {
    const mod = PLATFORM_MODULES.find((m) => m.id === moduleId);
    if (!mod) continue;
    await upsertCompanyModule(
      companyId,
      moduleId,
      {
        enabled: true,
        startedAt: today,
        monthlyFee: 0,
        enabledBy: createdByUserId,
      },
      createdByUserId,
      opts
    );
  }
}

/** Kiểm tra user có phải super admin của platform Hoa Phong không. */
export async function isPlatformAdmin(userId: number): Promise<boolean> {
  const row = await platformQueryOne<{ is_platform_admin: boolean }>(
    `SELECT is_platform_admin FROM users WHERE id = $1`,
    [userId]
  );
  return Boolean(row?.is_platform_admin);
}

export function listCatalog(): PlatformModule[] {
  return PLATFORM_MODULES;
}
