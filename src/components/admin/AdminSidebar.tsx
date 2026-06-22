"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  FileText,
  Package,
  Briefcase,
  Mail,
  LogOut,
  ExternalLink,
  Grid3X3,
  Menu,
} from "lucide-react";
import { Logo } from "../Logo";
import { ERP } from "@/lib/paths";

type NavLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const websiteLinks: NavLink[] = [
  { href: `${ERP.admin}/cai-dat`, label: "Cài đặt web", icon: Settings },
  { href: `${ERP.admin}/menu`, label: "Menu website", icon: Menu },
  { href: `${ERP.admin}/blog`, label: "Blog website", icon: FileText },
  { href: `${ERP.admin}/san-pham`, label: "Sản phẩm website", icon: Package },
  { href: `${ERP.admin}/dich-vu`, label: "Dịch vụ website", icon: Briefcase },
  { href: `${ERP.admin}/lien-he`, label: "Yêu cầu liên hệ", icon: Mail },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(ERP.login);
    router.refresh();
  }

  function linkRow(link: NavLink) {
    const active = pathname === link.href;
    return (
      <Link
        key={link.href}
        href={link.href}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${
          active ? "bg-emerald text-white" : "text-slate-muted hover:bg-white/5 hover:text-white"
        }`}
      >
        <link.icon size={18} />
        {link.label}
      </Link>
    );
  }

  return (
    <aside className="w-64 bg-midnight text-white min-h-screen flex flex-col shrink-0">
      <div className="p-6 border-b border-white/10">
        <Link href={ERP.admin} className="flex items-center gap-2">
          <Logo light />
          <div className="min-w-0">
            <span className="font-display font-semibold block leading-tight">Website CMS</span>
            <span className="text-[10px] text-slate-500">Trang công khai</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {linkRow({ href: ERP.admin, label: "Tổng quan", icon: LayoutDashboard })}
        <p className="px-4 pt-4 pb-1 text-[10px] uppercase tracking-wider text-slate-500">
          Nội dung website
        </p>
        {websiteLinks.map(linkRow)}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-1">
        <p className="px-4 pb-1 text-[10px] uppercase tracking-wider text-slate-500">Hệ thống ERP</p>
        <Link
          href={ERP.base}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-muted hover:bg-white/5 hover:text-white transition-colors"
        >
          <Grid3X3 size={18} />
          Module ERP
        </Link>
        <p className="px-4 pt-2 text-[10px] text-slate-600 leading-snug">
          Sản phẩm sản xuất, kho gỗ, dự án… nằm trong ERP — không phải CMS website.
        </p>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-muted hover:bg-white/5 hover:text-white transition-colors"
        >
          <ExternalLink size={18} />
          Xem website
        </Link>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={18} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
