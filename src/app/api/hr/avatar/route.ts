import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getEffectiveCompanyRole, isUltimateAdmin } from "@/lib/access/company-context";
import { getSessionUser } from "@/lib/auth";
import { platformExecute } from "@/lib/db/platform";
import { resolveActiveCompanyForUser } from "@/lib/projects/companies";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "avatars");
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const targetUserId = Number(form.get("userId") ?? user.id);
  if (!Number.isFinite(targetUserId)) {
    return NextResponse.json({ error: "userId không hợp lệ" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file ảnh" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Chỉ chấp nhận file ảnh" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Ảnh tối đa 2MB" }, { status: 400 });
  }

  if (targetUserId !== user.id) {
    const active = await resolveActiveCompanyForUser(user.id);
    const ultimate = await isUltimateAdmin(user.id);
    const admin =
      ultimate ||
      (active && (await getEffectiveCompanyRole(active.companyId, user.id)) === "admin");
    if (!admin) {
      return NextResponse.json({ error: "Không có quyền đổi ảnh nhân viên" }, { status: 403 });
    }
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const name = `u${targetUserId}-${Date.now()}.${safeExt}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, name), buf);

  const url = `/uploads/avatars/${name}`;
  await platformExecute(`UPDATE users SET avatar_url = $1 WHERE id = $2`, [url, targetUserId]);

  return NextResponse.json({ url });
}
