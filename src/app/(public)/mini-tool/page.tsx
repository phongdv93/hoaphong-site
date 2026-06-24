import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";
import { PublicPageLayout } from "@/components/public/PublicPageLayout";

export const metadata = {
  title: "Mini tool",
  description: "Công cụ tiện ích miễn phí cho khách vãng lai — không cần đăng nhập.",
};

const TOOLS = [
  {
    href: "/mini-tool/bao-gia",
    title: "Mini tool báo giá",
    desc: "Tạo báo giá, thêm logo, bảng linh hoạt và tải PDF.",
    icon: FileText,
  },
] as const;

export default function MiniToolHubPage() {
  return (
    <PublicPageLayout>
      <div className="max-w-2xl">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-2">Mini tool</h2>
        <p className="text-slate-muted text-sm md:text-base mb-8">
          Công cụ miễn phí trên trình duyệt — dữ liệu lưu local, không cần tài khoản ERP.
        </p>
        <ul className="space-y-3">
          {TOOLS.map((tool) => (
            <li key={tool.href}>
              <Link
                href={tool.href}
                className="group flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:border-sky/40 hover:bg-white/[0.06] transition-colors"
              >
                <span className="shrink-0 rounded-lg bg-sky/15 p-2.5 text-sky">
                  <tool.icon size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold text-white group-hover:text-sky-light transition-colors">
                    {tool.title}
                  </span>
                  <span className="block text-sm text-slate-muted mt-0.5">{tool.desc}</span>
                </span>
                <ArrowRight
                  size={18}
                  className="shrink-0 text-slate-muted group-hover:text-sky mt-1 transition-colors"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PublicPageLayout>
  );
}
