import { NextResponse } from "next/server";
import { z } from "zod";
import { resetPasswordWithToken } from "@/lib/auth/password-reset";

const schema = z
  .object({
    token: z.string().min(1, "Thiếu mã đặt lại"),
    password: z.string().min(6, "Mật khẩu phải ≥ 6 ký tự"),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const result = await resetPasswordWithToken(body.token, body.password);

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: "Đã đổi mật khẩu — bạn có thể đăng nhập.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }
    console.error("[auth/reset-password]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
