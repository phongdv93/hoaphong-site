"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import type { NavLink } from "@/lib/nav-menu";

export function Header({
  dark = false,
  navLinks,
}: {
  dark?: boolean;
  navLinks: NavLink[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const linkClass = (active: boolean) =>
    dark
      ? active
        ? "text-white font-medium"
        : "text-white/55 hover:text-white transition-colors"
      : active
        ? "bg-midnight text-white"
        : "text-midnight/70 hover:text-midnight hover:bg-midnight/5";

  if (dark) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <nav className="pointer-events-auto w-full bg-transparent">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-5">
            <div className="flex items-center justify-center lg:justify-end">
              <ul className="hidden lg:flex items-center gap-6 md:gap-8">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`text-sm tracking-wide ${linkClass(pathname === link.href)}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="lg:hidden p-2 text-white/80 hover:text-white transition-colors"
                onClick={() => setOpen(!open)}
                aria-label="Menu"
                aria-expanded={open}
              >
                {open ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>

            {open && (
              <div className="lg:hidden mt-3 rounded-2xl border border-white/10 bg-navy/90 backdrop-blur-xl py-3 px-2 shadow-xl shadow-black/30">
                <ul className="flex flex-col">
                  {navLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={`block px-4 py-3 text-sm tracking-wide rounded-lg ${linkClass(pathname === link.href)} ${
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
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav className="glass mx-4 mt-4 rounded-2xl container-wide max-w-7xl">
        <div className="container-wide max-w-7xl mx-auto px-4 md:px-8 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="group">
              <Logo showWordmark className="group-hover:opacity-90 transition-opacity" />
            </Link>

            <ul className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${linkClass(pathname === link.href)}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden lg:flex items-center gap-3">
              <Link href="/lien-he" className="btn-primary text-sm py-2.5 px-5">
                Tư vấn ngay
              </Link>
            </div>

            <button
              type="button"
              className="lg:hidden p-2 rounded-lg hover:bg-midnight/5"
              onClick={() => setOpen(!open)}
              aria-label="Menu"
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {open && (
            <div className="lg:hidden pt-4 pb-2 border-t border-midnight/10 mt-3">
              <ul className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`block px-4 py-3 rounded-xl text-sm font-medium ${linkClass(pathname === link.href)}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/lien-he" onClick={() => setOpen(false)} className="btn-primary w-full mt-3 text-sm">
                Tư vấn ngay
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
