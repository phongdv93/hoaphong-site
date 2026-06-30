import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { resolveActiveCompanyForUser } from "@/lib/projects/companies";
import {
  isS3Configured,
  projectFileKey,
  uploadToS3,
} from "@/lib/storage/s3";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "projects");
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const DOC_EXT = /\.(jpe?g|png|webp|gif|heic|pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar)$/i;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) {
    return NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Không có file" }, { status: 400 });

  const projectIdRaw = formData.get("projectId");
  const projectId =
    projectIdRaw != null && String(projectIdRaw).trim() !== ""
      ? Number(projectIdRaw)
      : null;

  const mime = file.type || "application/octet-stream";
  const okMime =
    IMAGE_TYPES.has(mime) ||
    mime.startsWith("application/") ||
    mime.startsWith("text/") ||
    DOC_EXT.test(file.name);
  if (!okMime) {
    return NextResponse.json({ error: "Định dạng file không được hỗ trợ" }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch (err) {
    const message =
      err instanceof Error && err.message.trim()
        ? err.message
        : "Không đọc được file tải lên";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (isS3Configured()) {
    try {
      const key = projectFileKey(
        active.companyId,
        Number.isFinite(projectId) ? projectId : null,
        file.name
      );
      const url = await uploadToS3({
        key,
        body: buffer,
        contentType: mime,
      });
      return NextResponse.json({ url, key });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload S3 thất bại";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  const ext = path.extname(file.name) || ".jpg";
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);
  return NextResponse.json({ url: `/uploads/projects/${name}` });
}
