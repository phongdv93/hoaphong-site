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
  Trees,
  Menu,
} from "lucide-react";
import { Logo } from "../Logo";
import { ERP } from "@/lib/paths";

const links = [
  { href: ERP.admin, label: "Tổng quan", icon: LayoutDashboard },
  { href: `${ERP.admin}/cai-dat`, label: "Cài đặt web", icon: Settings },
  { href: `${ERP.admin}/menu`, label: "Menu website", icon: Menu },
  { href: `${ERP.admin}/blog`, label: "Blog", icon: FileText },
  { href: `${ERP.admin}/san-pham`, label: "Sản phẩm", icon: Package },
  { href: `${ERP.admin}/dich-vu`, label: "Dịch vụ", icon: Briefcase },
  { href: `${ERP.admin}/lien-he`, label: "Yêu cầu LH", icon: Mail },
  { href: ERP.khoGo, label: "Kho gỗ", icon: Trees },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(ERP.login);
    router.refresh();
  }

  return (
    <aside className="w-64 bg-midnight text-white min-h-screen flex flex-col shrink-0">
      <div className="p-6 border-b border-white/10">
        <Link href={ERP.admin} className="flex items-center gap-2">
          <Logo light />
          <span className="font-display font-semibold">Admin</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
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
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-1">
        <Link
          href={ERP.base}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-muted hover:bg-white/5 hover:text-white transition-colors"
        >
          <Grid3X3 size={18} />
          Module ERP
        </Link>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-muted hover:bg-white/5 hover:text-white transition-colors"
        >
          <ExternalLink size={18} />
          Website Hoa Phong
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
