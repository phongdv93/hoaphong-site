import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "./Logo";
import type { SiteSettings } from "@/lib/types";
import type { NavLink } from "@/lib/nav-menu";

export function Footer({
  settings,
  navLinks,
}: {
  settings: SiteSettings;
  navLinks: NavLink[];
}) {
  return (
    <footer className="bg-navy text-white border-t border-white/5 shrink-0">
      <div className="py-10 md:py-12 px-4 md:px-8 container-wide max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex mb-4">
              <Logo light showWordmark />
            </Link>
            <p className="text-slate-muted text-sm leading-relaxed">{settings.description}</p>
          </div>

          <div>
            <h4 className="font-display text-lg mb-4 text-sky-light">Liên kết</h4>
            <ul className="space-y-2 text-sm text-slate-muted">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-sky-light transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-lg mb-4 text-sky-light">Liên hệ</h4>
            <ul className="space-y-3 text-sm text-slate-muted">
              <li className="flex items-start gap-2">
                <MapPin size={16} className="text-sky-light mt-0.5 shrink-0" />
                {settings.address}
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="text-sky-light shrink-0" />
                <a href={`tel:${settings.phone}`} className="hover:text-white transition-colors">{settings.phone}</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} className="text-sky-light shrink-0" />
                <a href={`mailto:${settings.email}`} className="hover:text-white transition-colors">{settings.email}</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-lg mb-4 text-sky-light">Mạng xã hội</h4>
            <div className="flex flex-col gap-2 text-sm">
              {settings.facebook && (
                <a href={settings.facebook} target="_blank" rel="noopener noreferrer" className="text-slate-muted hover:text-sky-light transition-colors">
                  Facebook
                </a>
              )}
              {settings.linkedin && (
                <a href={settings.linkedin} target="_blank" rel="noopener noreferrer" className="text-slate-muted hover:text-sky-light transition-colors">
                  LinkedIn
                </a>
              )}
              {settings.zalo && (
                <span className="text-slate-muted">Zalo: {settings.zalo}</span>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-muted">
          <p>© {new Date().getFullYear()} {settings.companyName}. Bảo lưu mọi quyền.</p>
          <Link href="/erp/login" className="hover:text-sky-light transition-colors">
            Quản trị
          </Link>
        </div>
      </div>
    </footer>
  );
}
