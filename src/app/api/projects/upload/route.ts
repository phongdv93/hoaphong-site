import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
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

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Không có file" }, { status: 400 });

  const mime = file.type || "application/octet-stream";
  if (!IMAGE_TYPES.has(mime) && !file.name.match(/\.(jpe?g|png|webp|gif|heic)$/i)) {
    return NextResponse.json({ error: "Chỉ chấp nhận file ảnh" }, { status: 400 });
  }

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const ext = path.extname(file.name) || ".jpg";
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);

  return NextResponse.json({ url: `/uploads/projects/${name}` });
}
