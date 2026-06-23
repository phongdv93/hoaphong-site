import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getSessionUser, hashPassword } from "@/lib/auth";
import { platformExecute, platformQueryOne } from "@/lib/db/platform";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại"),
    password: z.string().min(6, "Mật khẩu mới phải ≥ 6 ký tự"),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());
    const row = await platformQueryOne<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE id = $1`,
      [user.id]
    );
    if (!row) {
      return NextResponse.json({ error: "Tài khoản không tồn tại" }, { status: 404 });
    }

    const match = await bcrypt.compare(body.currentPassword, row.password_hash);
    if (!match) {
      return NextResponse.json({ error: "Mật khẩu hiện tại không đúng" }, { status: 400 });
    }

    const passwordHash = await hashPassword(body.password);
    await platformExecute(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
      passwordHash,
      user.id,
    ]);

    return NextResponse.json({ ok: true, message: "Đã đổi mật khẩu thành công." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }
    console.error("[auth/change-password]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
