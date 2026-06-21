import fs from "fs";
import path from "path";

let loaded = false;

/**
 * Merge project root `.env` into `process.env` for keys that are still undefined.
 * Next.js đã load `.env` khi chạy app; các script `tsx` (db:seed, …) thì không — cần bước này.
 */
export function loadDotEnvIfNeeded(): void {
  if (loaded) return;
  loaded = true;

  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  let raw = fs.readFileSync(envPath, "utf8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const key = t.slice(0, eq).trim();
    if (!key) continue;
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}
