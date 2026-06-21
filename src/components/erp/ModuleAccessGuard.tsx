import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/platform/access";
import { requireModuleAccess } from "@/lib/platform/guard";
import { ModuleEnableTrial } from "./ModuleEnableTrial";
import { platformCompanyUrl } from "@/lib/platform/paths";

/**
 * Wrap nội dung trang ERP yêu cầu một module cụ thể.
 * Nếu công ty chưa được bật module → render banner thông báo.
 */
export async function ModuleAccessGuard({
  moduleId,
  children,
}: {
  moduleId: string;
  children: React.ReactNode;
}) {
  const result = await requireModuleAccess(moduleId);

  if (result.ok) return <>{children}</>;

  if (result.reason === "unauthorized") {
    return (
      <div className="erp-card border-amber-500/40 p-4 text-sm text-amber-100">
        Bạn cần đăng nhập để truy cập module này.{" "}
        <Link href="/erp/login" className="underline font-medium text-sky-light">
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (result.reason === "no_company") {
    return (
      <div className="erp-card border-amber-500/40 p-4 text-sm space-y-2 text-amber-100">
        <div>Bạn chưa thuộc công ty nào. Hãy tạo công ty trước khi sử dụng module này.</div>
        <Link
          href="/erp/cong-ty/new"
          className="inline-block underline font-medium text-sky-light"
        >
          Tạo công ty mới
        </Link>
      </div>
    );
  }

  const user = await getSessionUser();
  const isPa = user ? await isPlatformAdmin(user.id) : false;

  return (
    <div className="erp-card border-rose-500/40 p-5 text-sm space-y-2 text-rose-100 max-w-xl">
      <div className="font-semibold text-rose-200">
        Công ty của bạn chưa được mở quyền sử dụng module “{result.moduleName}”.
      </div>
      <div className="text-rose-100/90">
        Liên hệ Hoa Phong để đăng ký gói, hoặc bật module dùng thử nếu bạn là admin công ty.
      </div>

      {result.canSelfEnableTrial &&
        result.companyId &&
        result.moduleId &&
        result.moduleName && (
          <ModuleEnableTrial
            companyId={result.companyId}
            moduleId={result.moduleId}
            moduleName={result.moduleName}
          />
        )}

      {isPa && result.companyId && (
        <p className="text-xs text-slate-400 pt-2">
          Platform admin:{" "}
          <Link
            href={platformCompanyUrl(result.companyId)}
            className="text-sky-light underline"
          >
            Mở gói module cho công ty này
          </Link>
        </p>
      )}
    </div>
  );
}
