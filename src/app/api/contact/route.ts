import { NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "Vui lòng nhập họ tên"),
  email: z.string().email("Email không hợp lệ"),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(10, "Nội dung tối thiểu 10 ký tự"),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    await execute(
      "INSERT INTO contact_requests (name, email, phone, subject, message) VALUES ($1,$2,$3,$4,$5)",
      [body.name, body.email, body.phone || "", body.subject || "", body.message]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
