import Link from "next/link";
import { Package, Plus, LayoutDashboard, ClipboardList, LogOut, Trees, Truck, Grid3X3 } from "lucide-react";
import { ERP } from "@/lib/paths";

const links = [
  { href: ERP.khoGo, label: "Tổng quan", icon: LayoutDashboard },
  { href: ERP.khoGoNhap, label: "Nhập kho", icon: Plus },
  { href: ERP.khoGoPhat, label: "Phát gỗ", icon: Truck },
  { href: ERP.khoGoDonHang, label: "Đơn PO", icon: ClipboardList },
];

export function WoodAppShell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="min-h-screen bg-[#0a1120] flex">
      <aside className="w-56 bg-navy text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-white/10">
          <Link href={ERP.khoGo} className="flex items-center gap-2 font-semibold">
            <Trees className="text-sky-light" size={22} />
            Kho gỗ
          </Link>
          <p className="text-xs text-slate-muted mt-1">Hoa Phong ERP</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-slate-muted hover:bg-white/5 hover:text-white transition-colors"
            >
              <l.icon size={18} />
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-1">
          <Link href={ERP.base} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-muted hover:text-white">
            <Grid3X3 size={16} /> Tất cả module ERP
          </Link>
          <Link href={ERP.admin} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-muted hover:text-white">
            <Package size={16} /> Quản trị website
          </Link>
          <Link href={ERP.login} className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300">
            <LogOut size={16} /> Đăng xuất
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="bg-[#0a1120] border-b border-white/10 px-8 py-5">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
        </header>
        <div className="p-8 bg-[#0a1120] text-slate-200">{children}</div>
      </main>
    </div>
  );
}
