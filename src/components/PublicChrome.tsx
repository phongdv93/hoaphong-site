"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { PublicTopBar } from "./public/PublicTopBar";
import { PageTransition } from "./public/PageTransition";
import { getPublicPageLabel } from "@/lib/public-pages";
import type { SiteSettings } from "@/lib/types";

export function PublicChrome({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings: SiteSettings;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const pageLabel = getPublicPageLabel(pathname);

  return (
    <div className="min-h-dvh bg-navy flex flex-col">
      {isHome ? <Header dark /> : pageLabel && <PublicTopBar page={pageLabel} />}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <PageTransition>{children}</PageTransition>
      </main>
      {isHome ? (
        <footer className="border-t border-white/5 py-4 text-center text-[11px] text-slate-muted shrink-0">
          <p>
            © {new Date().getFullYear()} {settings.companyName} ·{" "}
            <Link href="/erp/login" className="hover:text-sky-light transition-colors">
              Quản trị
            </Link>
          </p>
        </footer>
      ) : (
        <Footer settings={settings} />
      )}
    </div>
  );
}
