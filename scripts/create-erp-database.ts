/**
 * Tạo database `erp` trên Postgres local.
 * Chạy (PowerShell) — thay mật khẩu user postgres:
 *   $env:PGPASSWORD="mat-khau-postgres"; npm run db:create-erp
 */
import { loadDotEnvIfNeeded } from "../src/lib/load-dotenv";
import { Client } from "pg";
import fs from "fs";
import path from "path";

const DB_NAME = "erp";
const host = process.env.PGHOST || "localhost";
const port = process.env.PGPORT || "5432";
const user = process.env.PGUSER || "postgres";
const password = process.env.PGPASSWORD ?? "";

async function main() {
  loadDotEnvIfNeeded();

  const adminUrl =
    process.env.POSTGRES_ADMIN_URL ||
    `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/postgres`;

  const client = new Client({ connectionString: adminUrl });
  try {
    await client.connect();
  } catch (e) {
    console.error(
      "Không kết nối được Postgres. Đặt mật khẩu:\n" +
        '  $env:PGPASSWORD="mat-khau"; npm run db:create-erp\n' +
        "Hoặc tạo DB bằng pgAdmin: chạy scripts/create-erp-database.sql"
    );
    throw e;
  }

  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [DB_NAME]);
  if (exists.rowCount === 0) {
    await client.query(`CREATE DATABASE ${DB_NAME}`);
    console.log(`✓ Đã tạo database "${DB_NAME}"`);
  } else {
    console.log(`✓ Database "${DB_NAME}" đã tồn tại`);
  }

  await client.end();

  const envPath = path.join(process.cwd(), ".env");
  const dbUrl = `postgresql://${user}:${password}@${host}:${port}/${DB_NAME}`;
  let envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  const existing = envText.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
  const alreadyErp =
    existing &&
    /\/erp(\?|$)/.test(existing) &&
    !existing.includes("postgres:@") &&
    !existing.includes("postgres://@");

  if (!alreadyErp) {
    if (/^DATABASE_URL=/m.test(envText)) {
      envText = envText.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${dbUrl}`);
    } else {
      envText = `DATABASE_URL=${dbUrl}\n` + envText;
    }
    fs.writeFileSync(envPath, envText);
    console.log(`✓ Đã ghi DATABASE_URL vào .env (database: ${DB_NAME})`);
  } else {
    console.log(`✓ Giữ DATABASE_URL hiện có (database: ${DB_NAME})`);
  }
  console.log("\nTiếp theo: npm run db:seed && npm run db:seed-wood");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
