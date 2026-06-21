import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Settings, Lock, Globe, ExternalLink } from "lucide-react";
import { resolveCompanyPublicWebsiteUrl } from "@/lib/company-website";
import { getSessionUser } from "@/lib/auth";
import { ERP } from "@/lib/paths";
import { ERP_MODULE_GROUPS } from "@/lib/erp/modules";
import { getEffectiveCompanyRole, isUltimateAdmin } from "@/lib/access/company-context";
import { getCompanyByCode } from "@/lib/projects/companies";
import { getActiveModuleIds } from "@/lib/platform/access";
import { COMPANY_ROLE_LABELS } from "@/lib/projects/constants";
import { EnsureActiveCompany } from "@/components/erp/EnsureActiveCompany";
import { platformCompanyUrl } from "@/lib/platform/paths";

export default async function CompanySpacePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect(ERP.login);

  const { code } = await params;
  const company = await getCompanyByCode(code);
  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1120]">
        <div className="erp-card border-rose-500/40 p-6 text-center">
          <h2 className="text-lg font-semibold text-white mb-2">Không tìm thấy công ty</h2>
          <p className="text-sm text-slate-400 mb-4">
            Mã công ty <span className="font-mono">{code}</span> không tồn tại.
          </p>
          <Link href="/erp" className="text-sky-light hover:underline text-sm">
            ← Về danh sách công ty
          </Link>
        </div>
      </div>
    );
  }

  const [role, ultimate] = await Promise.all([
    getEffectiveCompanyRole(company.id, user.id),
    isUltimateAdmin(user.id),
  ]);

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1120]">
        <div className="erp-card border-rose-500/40 p-6 text-center">
          <h2 className="text-lg font-semibold text-white mb-2">Bạn không thuộc công ty này</h2>
          <Link href="/erp" className="text-sky-light hover:underline text-sm">
            ← Về danh sách công ty
          </Link>
        </div>
      </div>
    );
  }

  // Module đã được Hoa Phong bật cho công ty
  const enabledIds = await getActiveModuleIds(company.id);
  const publicWebsite = resolveCompanyPublicWebsiteUrl(company);

  return (
    <div className="min-h-screen bg-[#0a1120]">
      {/* Đồng bộ cookie active company khi deep-link */}
      <EnsureActiveCompany companyId={company.id} />
      <header className="bg-navy text-white px-8 py-5">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link
              href="/erp"
              className="text-slate-muted hover:text-white text-sm flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Tất cả công ty
            </Link>
            <div className="border-l border-white/20 pl-3 ml-1">
              <h1 className="text-xl font-bold">{company.name}</h1>
              <p className="text-slate-muted text-xs mt-0.5">
                {company.code} · Vai trò của bạn:{" "}
                {ultimate ? "Hoa Phong (Ultimate)" : COMPANY_ROLE_LABELS[role]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {role === "admin" && (
              <Link
                href={`/erp/cong-ty/${company.id}`}
                className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded inline-flex items-center gap-1"
              >
                <Settings size={14} /> Quản trị công ty
              </Link>
            )}
            {ultimate && (
              <Link
                href={platformCompanyUrl(company.id)}
                className="text-sm bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 px-3 py-1.5 rounded inline-flex items-center gap-1"
              >
                <Settings size={14} /> Gói module ERP
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="p-8 max-w-5xl mx-auto">
        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <Globe size={16} className="text-sky shrink-0" />
            <span>Website công ty</span>
          </div>
          {publicWebsite ? (
            <a
              href={publicWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sky-light hover:underline font-mono text-xs"
            >
              {publicWebsite}
              <ExternalLink size={12} />
            </a>
          ) : (
            <span className="text-xs text-amber-300/90">
              Chưa liên kết —{" "}
              {role === "admin" ? (
                <Link href="/erp/quan-tri/website" className="underline hover:text-amber-200">
                  cấu hình tại Quản trị → Website
                </Link>
              ) : (
                "liên hệ admin công ty"
              )}
            </span>
          )}
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Module sẵn dùng</h2>
          <p className="text-sm text-slate-400">
            Hoa Phong bật module cho công ty này. Liên hệ Hoa Phong nếu cần mở thêm.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ERP_MODULE_GROUPS.map((g) => {
            const enabled = enabledIds.has(g.id);
            const Icon = g.icon;
            return (
              <ModuleCard
                key={g.id}
                title={g.title}
                description={g.description}
                href={g.href}
                icon={<Icon size={22} />}
                enabled={enabled}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}

function ModuleCard({
  title,
  description,
  href,
  icon,
  enabled,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  enabled: boolean;
}) {
  if (!enabled) {
    return (
      <div className="erp-card opacity-50 cursor-not-allowed p-5">
        <div className="flex items-center gap-2 mb-2 text-slate-500">
          {icon}
          <span className="font-medium text-slate-400">{title}</span>
          <Lock size={14} className="ml-auto" />
        </div>
        <p className="text-xs text-slate-500">{description}</p>
        <p className="text-[11px] text-slate-600 mt-2 italic">
          Chưa được Hoa Phong mở quyền
        </p>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="erp-card-hover block p-5"
    >
      <div className="flex items-center gap-2 mb-2 text-sky-light">
        {icon}
        <span className="font-medium text-white">{title}</span>
        <span className="text-[10px] text-emerald-400 font-medium ml-auto">ĐÃ BẬT</span>
      </div>
      <p className="text-xs text-slate-400">{description}</p>
    </Link>
  );
}
