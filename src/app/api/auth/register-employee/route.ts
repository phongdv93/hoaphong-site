import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { registerEmployeeForCompany } from "@/lib/hr/membership";
import { getCompanyBySubdomain } from "@/lib/projects/companies";
import { companyPublicCode } from "@/lib/projects/company-code";
import { TENANT_CODE_COOKIE, getCompanyCodeFromHost } from "@/lib/tenant-host";

const bodySchema = z.object({
  name: z.string().min(1, "Tên bắt buộc"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu ≥ 6 ký tự"),
  departmentId: z.string().optional(),
  companyCode: z.string().optional(),
});

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }

  const c = await cookies();
  const code =
    parsed.data.companyCode?.trim().toLowerCase() ??
    c.get(TENANT_CODE_COOKIE)?.value?.trim().toLowerCase() ??
    getCompanyCodeFromHost(req.headers.get("host"));
  if (!code) {
    return NextResponse.json(
      { error: "Cần truy cập qua link công ty (vd. ma-cty.hoaphong.com.vn)" },
      { status: 400 }
    );
  }

  const company = await getCompanyBySubdomain(code);
  if (!company) {
    return NextResponse.json({ error: "Không tìm thấy công ty" }, { status: 404 });
  }

  try {
    const created = await registerEmployeeForCompany({
      companyId: company.id,
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      departmentId: parsed.data.departmentId,
      requestHost: req.headers.get("host") ?? undefined,
    });
    return NextResponse.json({
      ...created,
      companyCode: companyPublicCode(company),
      companyName: company.name,
      message:
        "Đăng ký thành công. Đăng nhập và chờ quản trị viên công ty duyệt quyền truy cập.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Đăng ký thất bại";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
