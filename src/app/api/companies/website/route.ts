import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getEffectiveCompanyRole } from "@/lib/access/company-context";
import { normalizeWebsiteUrl, resolveCompanyPublicWebsiteUrl } from "@/lib/company-website";
import { getCompany, resolveActiveCompanyForUser, updateCompany } from "@/lib/projects/companies";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) {
    return NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 });
  }

  const company = await getCompany(active.companyId);
  if (!company) return NextResponse.json({ error: "Không tìm thấy công ty" }, { status: 404 });

  const role = await getEffectiveCompanyRole(active.companyId, user.id);
  const publicUrl = resolveCompanyPublicWebsiteUrl(company);

  return NextResponse.json({
    companyId: company.id,
    companyName: company.name,
    websiteUrl: company.websiteUrl,
    publicUrl,
    linked: Boolean(publicUrl),
    myRole: role,
    canEdit: role === "admin",
  });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) {
    return NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 });
  }

  const role = await getEffectiveCompanyRole(active.companyId, user.id);
  if (role !== "admin") {
    return NextResponse.json({ error: "Chỉ admin công ty được cấu hình website" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const raw = typeof body.websiteUrl === "string" ? body.websiteUrl.trim() : "";
  const websiteUrl = raw ? normalizeWebsiteUrl(raw) ?? raw : "";

  if (raw && !websiteUrl) {
    return NextResponse.json({ error: "URL website không hợp lệ" }, { status: 400 });
  }

  await updateCompany(active.companyId, { websiteUrl: websiteUrl ?? "" });

  const company = await getCompany(active.companyId);
  const publicUrl = company ? resolveCompanyPublicWebsiteUrl(company) : null;

  return NextResponse.json({
    ok: true,
    websiteUrl: company?.websiteUrl ?? "",
    publicUrl,
    linked: Boolean(publicUrl),
  });
}
