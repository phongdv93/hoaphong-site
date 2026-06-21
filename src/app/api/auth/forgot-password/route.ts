import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/auth/password-reset";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const result = await requestPasswordReset(body.email, request);

    return NextResponse.json({
      ok: true,
      message:
        "Nếu email có trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.",
      mailSent: result.mailSent,
      resetUrl: result.resetUrl,
      mailError: result.mailError,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }
    console.error("[auth/forgot-password]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
