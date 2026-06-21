import pg from "pg";
import bcrypt from "bcryptjs";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const dbUrl = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
console.log("DB:", dbUrl?.replace(/:[^:@]+@/, ":***@"));

const pool = new pg.Pool({ connectionString: dbUrl });
try {
  const r = await pool.query(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    ["admin@hoaphong.vn"]
  );
  console.log("user:", r.rows[0] ? { id: r.rows[0].id, email: r.rows[0].email, hashLen: r.rows[0].password_hash?.length } : null);
  if (r.rows[0]) {
    const ok = await bcrypt.compare("DoiMatKhauAdmin123!", r.rows[0].password_hash);
    const ok2 = await bcrypt.compare("admin123", r.rows[0].password_hash);
    console.log("password DoiMatKhauAdmin123!:", ok);
    console.log("password admin123:", ok2);
  }
} catch (e) {
  console.error("ERR:", e.message);
}
await pool.end();
