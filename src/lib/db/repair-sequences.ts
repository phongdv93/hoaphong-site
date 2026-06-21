import type { Pool } from "pg";

/** Bảng tenant dùng SERIAL id — cần đồng bộ sau copy/migrate (ON CONFLICT). */
const SERIAL_ID_TABLES = [
  "customers",
  "projects",
  "project_phases",
  "project_phase_progress_logs",
  "project_members",
  "project_messages",
  "project_submissions",
  "project_files",
  "project_items",
  "factory_products",
  "factory_parts",
  "inventory_items",
  "wood_bundles",
  "wood_boards",
  "import_declarations",
] as const;

/**
 * Đặt lại sequence id = MAX(id) để tránh duplicate key khi INSERT.
 * Thường gặp sau db:migrate-tenant-b hoặc import có id cố định.
 */
export async function repairTableSequence(pool: Pool, table: string): Promise<void> {
  if (!SERIAL_ID_TABLES.includes(table as (typeof SERIAL_ID_TABLES)[number])) {
    return;
  }
  try {
    await pool.query(`
      SELECT setval(
        pg_get_serial_sequence('${table}', 'id'),
        GREATEST(COALESCE((SELECT MAX(id) FROM ${table}), 0), 1),
        true
      )
    `);
  } catch {
    // Bảng/sequence chưa có
  }
}

export async function repairTenantSerialSequences(pool: Pool): Promise<void> {
  for (const table of SERIAL_ID_TABLES) {
    try {
      await repairTableSequence(pool, table);
    } catch {
      // Bảng chưa tồn tại hoặc không có serial — bỏ qua
    }
  }
}

export function isPgUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  return code === "23505";
}
