import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  FileText,
  LayoutGrid,
  Mail,
  Package,
} from "lucide-react";
import { HubCardLineArt, type HubIllustrationId } from "./HubCardLineArt";
import type { SiteSettings } from "@/lib/types";

type HubCard = {
  href: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  illustration: HubIllustrationId;
  className: string;
  accent?: boolean;
};

export function HomeHub({ settings }: { settings: SiteSettings }) {
  const cards: HubCard[] = [
    {
      href: "/lien-he",
      title: "Liên hệ",
      desc: "Tư vấn & báo giá",
      icon: Mail,
      illustration: "contact",
      className: "md:col-span-5 md:row-span-2 md:col-start-8 md:row-start-1",
      accent: true,
    },
    {
      href: "/dich-vu",
      title: "Dịch vụ",
      desc: "Nội thất · Xây dựng · Phần mềm",
      icon: Briefcase,
      illustration: "services",
      className: "md:col-span-5 md:row-span-1 md:col-start-8 md:row-start-3",
    },
    {
      href: "/san-pham",
      title: "Sản phẩm",
      desc: "Giải pháp & catalog",
      icon: Package,
      illustration: "products",
      className: "md:col-span-4 md:row-span-2 md:col-start-1 md:row-start-4",
    },
    {
      href: "/ve-chung-toi",
      title: "Về Hoa Phong",
      desc: "Hành trình & năng lực",
      icon: Building2,
      illustration: "about",
      className: "md:col-span-4 md:row-span-2 md:col-start-5 md:row-start-4",
    },
    {
      href: "/blog",
      title: "Blog",
      desc: "Tin tức & kiến thức",
      icon: FileText,
      illustration: "blog",
      className: "md:col-span-4 md:row-span-2 md:col-start-9 md:row-start-4",
    },
    {
      href: "/erp",
      title: "ERP nội bộ",
      desc: "Kho · SX · Marketing",
      icon: LayoutGrid,
      illustration: "erp",
      className: "md:col-span-3 md:row-span-1 md:col-start-10 md:row-start-6",
    },
  ];

  return (
    <section className="relative min-h-dvh flex flex-col overflow-hidden bg-navy text-white pt-[4.25rem]">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute -top-32 right-0 w-[480px] h-[480px] bg-sky/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-royal/25 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex-1 container-wide px-4 md:px-8 py-8 md:py-10 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 md:grid-rows-6 gap-3 md:gap-4 md:min-h-[min(680px,calc(100dvh-11rem))]">
          <div className="md:col-span-7 md:row-span-3 md:row-start-1 md:col-start-1 flex flex-col justify-start pt-1 md:pt-2 pb-2 md:pb-0 order-1">
            <p className="text-sky-light/90 text-xs font-medium tracking-[0.2em] uppercase mb-3">
              {settings.tagline}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.25rem] font-bold leading-[1.08] mb-4">
              {settings.heroTitle.split(" ").map((word, i, arr) =>
                i === arr.length - 1 ? (
                  <span key={i} className="text-gradient">
                    {" "}
                    {word}
                  </span>
                ) : (
                  <span key={i}>{word} </span>
                )
              )}
            </h1>
            <p className="text-slate-muted text-sm md:text-base max-w-md leading-relaxed mb-6">
              {settings.heroSubtitle}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/lien-he" className="btn-primary text-sm py-2.5 px-5">
                Bắt đầu dự án
              </Link>
              <Link
                href="/ve-chung-toi"
                className="inline-flex items-center gap-2 text-sm text-sky-light hover:text-white transition-colors"
              >
                Tìm hiểu thêm <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t border-white/10">
              {[
                { v: "500+", l: "Dự án" },
                { v: "10+", l: "Năm KN" },
                { v: "7", l: "Lĩnh vực" },
              ].map((s) => (
                <div key={s.l}>
                  <p className="text-lg font-bold text-sky-light leading-none">{s.v}</p>
                  <p className="text-[10px] text-slate-muted mt-0.5 uppercase tracking-wide">{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`home-bento-card group relative flex flex-col justify-between min-h-[120px] overflow-hidden order-2 ${card.className} ${
                card.accent ? "home-bento-card-accent" : ""
              }`}
            >
              <HubCardLineArt
                id={card.illustration}
                className={`absolute bottom-0 right-0 w-[52%] max-w-[140px] h-auto translate-x-2 translate-y-2 opacity-[0.42] transition-all duration-500 group-hover:opacity-[0.62] group-hover:translate-x-1 group-hover:translate-y-1 ${
                  card.accent ? "max-w-[160px] opacity-[0.5] group-hover:opacity-[0.7]" : ""
                }`}
              />

              <div className="flex items-start justify-between gap-2 relative z-10">
                <span
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0 border transition-all duration-300 group-hover:scale-105 ${
                    card.accent
                      ? "bg-sky/20 border-sky/40 text-sky-light"
                      : "bg-navy/60 border-white/15 text-sky-light backdrop-blur-sm group-hover:border-sky/35"
                  }`}
                >
                  <card.icon size={20} strokeWidth={1.75} />
                </span>
                <ArrowUpRight
                  size={18}
                  className="text-white/30 group-hover:text-sky-light group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0"
                />
              </div>
              <div className="relative z-10 mt-auto pt-4 max-w-[58%]">
                <h2 className="font-display text-lg font-semibold">{card.title}</h2>
                <p className="text-xs text-slate-muted mt-0.5 leading-snug">{card.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
