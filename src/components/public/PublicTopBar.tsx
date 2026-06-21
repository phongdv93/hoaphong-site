"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/", label: "Trang chủ" },
  { href: "/ve-chung-toi", label: "Về chúng tôi" },
  { href: "/dich-vu", label: "Dịch vụ" },
  { href: "/san-pham", label: "Sản phẩm" },
  { href: "/blog", label: "Blog" },
  { href: "/bao-gia", label: "Báo giá" },
  { href: "/lien-he", label: "Liên hệ" },
];

export function PublicTopBar({ page }: { page: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const linkClass = (active: boolean) =>
    active ? "text-white font-medium" : "text-white/55 hover:text-white transition-colors";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-[1.125rem] flex items-start justify-between gap-4 md:gap-8">
        <div className="min-w-0 flex-1 pr-2 pointer-events-auto">
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight leading-none">
            {page}
          </h1>
        </div>

        <div className="shrink-0 pointer-events-auto pt-0.5">
          <ul className="hidden lg:flex items-center gap-5 md:gap-7">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={`text-sm tracking-wide ${linkClass(pathname === link.href)}`}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="lg:hidden p-2 -mr-2 text-white/80 hover:text-white"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-white/10 bg-navy/95 px-4 py-3 pointer-events-auto">
          <ul className="flex flex-col">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2.5 text-sm rounded-lg ${linkClass(pathname === link.href)} ${
                    pathname === link.href ? "" : "hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
