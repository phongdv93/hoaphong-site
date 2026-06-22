import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { getContactStats } from "@/lib/data";
import { ERP } from "@/lib/paths";
import { FileText, Package, Briefcase, Mail, Settings, Menu, Grid3X3 } from "lucide-react";

export default async function AdminDashboardPage() {
  const stats = await getContactStats();

  const cards = [
    { label: "Yêu cầu liên hệ mới", value: stats.newContacts, icon: Mail, href: `${ERP.admin}/lien-he`, color: "text-emerald" },
    { label: "Bài blog website", value: stats.posts, icon: FileText, href: `${ERP.admin}/blog`, color: "text-blue-500" },
    { label: "Sản phẩm website", value: stats.products, icon: Package, href: `${ERP.admin}/san-pham`, color: "text-gold" },
    { label: "Dịch vụ website", value: stats.services, icon: Briefcase, href: `${ERP.admin}/dich-vu`, color: "text-purple-500" },
  ];

  return (
    <AdminShell title="Tổng quan website">
      <p className="text-sm text-slate-400 mb-6 max-w-2xl">
        Quản trị nội dung trang công khai (hoaphong.site). Sản phẩm sản xuất, kho gỗ, dự án và kế toán
        nằm trong <strong className="text-slate-300">Module ERP</strong> — tách biệt với CMS này.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="erp-card-hover block p-6"
          >
            <card.icon className={`w-8 h-8 ${card.color} mb-3`} />
            <p className="text-3xl font-bold text-white">{card.value}</p>
            <p className="text-sm text-slate-400 mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="erp-card p-6">
        <h2 className="font-semibold text-white mb-4">Truy cập nhanh</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`${ERP.admin}/cai-dat`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-sky/20 hover:text-sky-light text-sm text-slate-200 transition-colors"
          >
            <Settings size={16} /> Cài đặt website
          </Link>
          <Link
            href={`${ERP.admin}/menu`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-sky/20 hover:text-sky-light text-sm text-slate-200 transition-colors"
          >
            <Menu size={16} /> Menu website
          </Link>
          <Link
            href={ERP.base}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-sky/20 hover:text-sky-light text-sm text-slate-200 transition-colors"
          >
            <Grid3X3 size={16} /> Module ERP
          </Link>
          <Link href="/" target="_blank" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-sky/20 hover:text-sky-light text-sm text-slate-200 transition-colors">
            Xem website
          </Link>
        </div>
      </div>
    </AdminShell>
  );
}
