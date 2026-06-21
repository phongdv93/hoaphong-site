import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, ShieldCheck, Plus } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { ERP } from "@/lib/paths";
import { listCompaniesForUser, isUltimateAdmin } from "@/lib/access/company-context";
import { CompanyPickerCard } from "@/components/erp/CompanyPickerCard";

export default async function ErpHomePage() {
  const user = await getSessionUser();
  if (!user) redirect(ERP.login);

  const [companies, admin] = await Promise.all([
    listCompaniesForUser(user.id).catch(() => []),
    isUltimateAdmin(user.id).catch(() => false),
  ]);

  return (
    <div className="min-h-screen bg-[#0a1120]">
      <header className="bg-navy text-white px-8 py-5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Hoa Phong Cloud</h1>
          <p className="text-slate-muted text-sm mt-0.5">
            Xin chào {user.name} ({user.email})
          </p>
        </div>
        <div className="flex items-center gap-3">
          {admin && (
            <Link
              href="/erp/platform/cong-ty"
              className="bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 text-sm px-3 py-1.5 rounded inline-flex items-center gap-1"
            >
              <ShieldCheck size={14} /> Platform Admin
            </Link>
          )}
          <Link
            href={ERP.login}
            className="text-sm text-red-300 hover:text-red-200 flex items-center gap-1"
          >
            <LogOut size={16} /> Đăng xuất
          </Link>
        </div>
      </header>

      <main className="p-8 max-w-5xl mx-auto">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-xl font-semibold text-white">Chọn công ty</h2>
            <p className="text-sm text-slate-400">
              Chọn một công ty để vào không gian làm việc và sử dụng module được mở.
            </p>
          </div>
          <Link
            href="/erp/cong-ty/new"
            className="inline-flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-lg hover:bg-navy/90 text-sm"
          >
            <Plus size={16} /> Công ty mới
          </Link>
        </div>

        {companies.length === 0 ? (
          <div className="erp-card p-10 text-center">
            <p className="text-slate-400 mb-4">
              Bạn chưa thuộc công ty nào. Hãy tạo công ty đầu tiên để bắt đầu.
            </p>
            <Link
              href="/erp/cong-ty/new"
              className="inline-flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-lg hover:bg-navy/90"
            >
              <Plus size={16} /> Tạo công ty mới
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {companies.map((c) => (
              <CompanyPickerCard key={c.id} company={c} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
