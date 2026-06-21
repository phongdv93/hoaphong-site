import { Pool, type PoolClient, type QueryResultRow } from "pg";
import fs from "fs";
import path from "path";
import { getPlatformConnectionString } from "./connection";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function getPlatformPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: getPlatformConnectionString() });
  }
  return pool;
}

async function ensurePlatformSchema(): Promise<void> {
  const schemaPath = path.join(process.cwd(), "src/lib/db/schema-platform.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  await getPlatformPool().query(sql);
}

export async function initPlatformDb(): Promise<void> {
  if (!schemaReady) {
    schemaReady = ensurePlatformSchema().catch((err) => {
      schemaReady = null;
      return Promise.reject(err);
    });
  }
  await schemaReady;
}

export async function platformQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  await initPlatformDb();
  const res = await getPlatformPool().query<T>(text, params);
  return res.rows;
}

export async function platformQueryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await platformQuery<T>(text, params);
  return rows[0] ?? null;
}

export async function platformExecute(
  text: string,
  params?: unknown[]
): Promise<{ insertId?: number; rowCount: number }> {
  await initPlatformDb();
  const res = await getPlatformPool().query(text, params);
  const insertId = (res.rows[0] as { id?: number } | undefined)?.id;
  return { insertId, rowCount: res.rowCount ?? 0 };
}

export async function platformWithTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  await initPlatformDb();
  const client = await getPlatformPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
