import { tenantExecute, tenantQuery } from "@/lib/db/tenant";

export type CustomsMasterType =
  | "customs_office"
  | "border_gate"
  | "import_port"
  | "export_port"
  | "warehouse"
  | "transport_mode"
  | "procedure_type";

export interface CustomsMasterItem {
  id: number;
  type: CustomsMasterType;
  code: string;
  name: string;
  extra: string;
  active: boolean;
  source: string;
  versionTag: string;
  updatedAt: string;
}

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

function mapMasterRow(row: Record<string, unknown>): CustomsMasterItem {
  return {
    id: Number(row.id),
    type: String(row.type) as CustomsMasterType,
    code: String(row.code ?? ""),
    name: String(row.name ?? ""),
    extra: String(row.extra ?? ""),
    active: Boolean(row.active),
    source: String(row.source ?? ""),
    versionTag: String(row.version_tag ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export async function ensureCustomsMasterDataTable(companyId: number): Promise<void> {
  await tenantExecute(
    `CREATE TABLE IF NOT EXISTS customs_master_data (
       id SERIAL PRIMARY KEY,
       type TEXT NOT NULL,
       code TEXT NOT NULL,
       name TEXT NOT NULL DEFAULT '',
       extra TEXT NOT NULL DEFAULT '',
       active BOOLEAN NOT NULL DEFAULT TRUE,
       source TEXT NOT NULL DEFAULT 'manual',
       version_tag TEXT NOT NULL DEFAULT '',
       created_at TIMESTAMPTZ DEFAULT NOW(),
       updated_at TIMESTAMPTZ DEFAULT NOW(),
       UNIQUE (type, code)
     )`,
    [],
    companyId
  );
  await tenantExecute(
    `CREATE INDEX IF NOT EXISTS idx_customs_master_type_code
       ON customs_master_data(type, code)`,
    [],
    companyId
  );
}

export async function findCustomsMasterByCode(
  companyId: number,
  type: CustomsMasterType,
  code: string
): Promise<CustomsMasterItem | null> {
  await ensureCustomsMasterDataTable(companyId);
  const c = code.trim();
  if (!c) return null;
  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT *
       FROM customs_master_data
      WHERE type = $1
        AND active = TRUE
        AND UPPER(code) = UPPER($2)
      LIMIT 1`,
    [type, c],
    companyId
  );
  if (!rows[0]) return null;
  return mapMasterRow(rows[0]);
}

export async function countCustomsMasterByType(
  companyId: number,
  type: CustomsMasterType
): Promise<number> {
  await ensureCustomsMasterDataTable(companyId);
  const row = await tenantQuery<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM customs_master_data WHERE type = $1 AND active = TRUE`,
    [type],
    companyId
  );
  return row[0]?.c ?? 0;
}

export async function searchCustomsMasterData(
  companyId: number,
  type: CustomsMasterType,
  query: string,
  limit = 20
): Promise<CustomsMasterItem[]> {
  await ensureCustomsMasterDataTable(companyId);
  const q = query.trim();
  const pattern = q ? `%${q}%` : "";
  const plain = q ? stripDiacritics(q) : "";
  const plainPattern = plain && plain !== q ? `%${plain}%` : null;
  const rows = await tenantQuery<Record<string, unknown>>(
    q
      ? plainPattern
        ? `SELECT *
             FROM customs_master_data
            WHERE type = $1
              AND active = TRUE
              AND (
                code ILIKE $2 OR name ILIKE $2 OR extra ILIKE $2
                OR code ILIKE $5 OR name ILIKE $5 OR extra ILIKE $5
              )
            ORDER BY
              CASE
                WHEN code ILIKE $3 THEN 0
                WHEN code ILIKE $2 THEN 1
                WHEN name ILIKE $3 THEN 2
                WHEN name ILIKE $2 THEN 3
                WHEN extra ILIKE $2 THEN 4
                ELSE 5
              END,
              code ASC
            LIMIT $4`
        : `SELECT *
             FROM customs_master_data
            WHERE type = $1
              AND active = TRUE
              AND (code ILIKE $2 OR name ILIKE $2 OR extra ILIKE $2)
            ORDER BY
              CASE
                WHEN code ILIKE $3 THEN 0
                WHEN code ILIKE $2 THEN 1
                WHEN name ILIKE $3 THEN 2
                WHEN name ILIKE $2 THEN 3
                WHEN extra ILIKE $2 THEN 4
                ELSE 5
              END,
              code ASC
            LIMIT $4`
      : `SELECT *
           FROM customs_master_data
          WHERE type = $1
            AND active = TRUE
          ORDER BY code ASC
          LIMIT $2`,
    q
      ? plainPattern
        ? [type, pattern, `${q}%`, limit, plainPattern]
        : [type, pattern, `${q}%`, limit]
      : [type, limit],
    companyId
  );
  return rows.map(mapMasterRow);
}

export async function importCustomsMasterData(
  companyId: number,
  type: CustomsMasterType,
  items: Array<{ code: string; name?: string; extra?: string }>,
  source: string,
  versionTag: string
): Promise<{ upserted: number }> {
  return importCustomsMasterDataBatch(companyId, type, items, source, versionTag);
}

export async function importCustomsMasterDataBatch(
  companyId: number,
  type: CustomsMasterType,
  items: Array<{ code: string; name?: string; extra?: string }>,
  source: string,
  versionTag: string
): Promise<{ upserted: number }> {
  await ensureCustomsMasterDataTable(companyId);
  let upserted = 0;
  const CHUNK = 80;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let p = 1;
    for (const raw of chunk) {
      const code = raw.code.trim();
      if (!code) continue;
      placeholders.push(
        `($${p},$${p + 1},$${p + 2},$${p + 3},$${p + 4},$${p + 5},$${p + 6})`
      );
      values.push(
        type,
        code,
        raw.name?.trim() ?? "",
        raw.extra?.trim() ?? "",
        source,
        versionTag,
        true
      );
      p += 7;
      upserted++;
    }
    if (!placeholders.length) continue;
    await tenantExecute(
      `INSERT INTO customs_master_data(type, code, name, extra, source, version_tag, active)
       VALUES ${placeholders.join(",")}
       ON CONFLICT (type, code) DO UPDATE SET
         name = EXCLUDED.name,
         extra = EXCLUDED.extra,
         source = EXCLUDED.source,
         version_tag = EXCLUDED.version_tag,
         active = TRUE,
         updated_at = NOW()`,
      values,
      companyId
    );
  }
  return { upserted };
}

