"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { PublicTopBar } from "./public/PublicTopBar";
import { PageTransition } from "./public/PageTransition";
import { getPublicPageLabel } from "@/lib/public-pages";
import type { SiteSettings } from "@/lib/types";

export function PublicChrome({
  children,
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
    </div>
  );
}
