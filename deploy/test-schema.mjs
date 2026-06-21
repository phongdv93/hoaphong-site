import pg from "pg";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const dbUrl = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
const pool = new pg.Pool({ connectionString: dbUrl });

try {
  const sql = fs.readFileSync("src/lib/db/schema-platform.sql", "utf8");
  await pool.query(sql);
  console.log("schema: OK");
} catch (e) {
  console.error("schema ERR:", e.message);
}

await pool.end();
