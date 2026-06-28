import { isPlatformAdmin } from "@/lib/platform/access";
import { platformQuery } from "@/lib/db/platform";
import { ERP } from "@/lib/paths";
import { companyPublicCode } from "@/lib/projects/company-code";

export interface PostLoginRedirect {
  url: string;
  label: string;
  activeCompanyId?: number;
}

type MembershipRow = {
  company_id: number;
  code: string;
  tax_code: string;
  name: string;
  role: string;
  status: string;
};

async function loadMemberships(userId: number): Promise<MembershipRow[]> {
  return platformQuery<MembershipRow>(
    `SELECT cm.company_id, cm.role, cm.status, c.code, c.tax_code, c.name
     FROM company_members cm
     JOIN companies c ON c.id = cm.company_id
     WHERE cm.user_id = $1 AND c.status = 'active'
     ORDER BY cm.joined_at ASC NULLS LAST, c.name ASC`,
    [userId]
  );
}

function redirectForMembership(m: MembershipRow): PostLoginRedirect {
  if (m.status === "pending") {
    return {
      url: "/erp/cho-duyet",
      label: "Chờ duyệt",
      activeCompanyId: m.company_id,
    };
  }
  if (m.status === "rejected") {
    return {
      url: "/erp/dang-ky?rejected=1",
      label: "Đăng ký lại",
      activeCompanyId: m.company_id,
    };
  }
  if (m.role === "admin") {
    return {
      url: `/erp/cong-ty/${m.company_id}`,
      label: `Quản trị ${m.name}`,
      activeCompanyId: m.company_id,
    };
  }
  return {
    url: `/erp/c/${companyPublicCode({ code: m.code, taxCode: m.tax_code })}`,
    label: m.name,
    activeCompanyId: m.company_id,
  };
}

/** Xác định trang đích sau đăng nhập — một cửa /erp/login cho mọi vai trò. */
export async function resolvePostLoginRedirect(
  userId: number,
  options?: { tenantCompanyId?: number }
): Promise<PostLoginRedirect> {
  const [platformAdmin, rows] = await Promise.all([
    isPlatformAdmin(userId),
    loadMemberships(userId),
  ]);

  if (options?.tenantCompanyId != null) {
    const tenantMembership = rows.find((r) => r.company_id === options.tenantCompanyId);
    if (tenantMembership) {
      return redirectForMembership(tenantMembership);
    }
    return {
      url: "/erp/dang-ky",
      label: "Đăng ký nhân viên",
      activeCompanyId: options.tenantCompanyId,
    };
  }

  const pending = rows.filter((r) => r.status === "pending");
  if (pending.length > 0) {
    return {
      url: "/erp/cho-duyet",
      label: "Chờ duyệt",
      activeCompanyId: pending[0].company_id,
    };
  }

  const active = rows.filter((r) => r.status === "active");

  if (platformAdmin) {
    return {
      url: "/erp/platform/cong-ty",
      label: "Platform Hoa Phong",
      activeCompanyId: active[0]?.company_id,
    };
  }

  if (active.length === 0) {
    return { url: ERP.base, label: "ERP" };
  }

  if (active.length === 1) {
    const m = active[0];
    if (m.role === "admin") {
      return {
        url: `/erp/cong-ty/${m.company_id}`,
        label: `Quản trị ${m.name}`,
        activeCompanyId: m.company_id,
      };
    }
    return {
      url: `/erp/c/${companyPublicCode({ code: m.code, taxCode: m.tax_code })}`,
      label: m.name,
      activeCompanyId: m.company_id,
    };
  }

  const adminCompanies = active.filter((m) => m.role === "admin");
  if (adminCompanies.length === 1) {
    const m = adminCompanies[0];
    return {
      url: `/erp/cong-ty/${m.company_id}`,
      label: `Quản trị ${m.name}`,
      activeCompanyId: m.company_id,
    };
  }

  return { url: ERP.base, label: "Chọn công ty" };
}
