import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: {
      default: `${settings.companyName} — ${settings.tagline}`,
      template: `%s | ${settings.companyName}`,
    },
    description: settings.description,
    keywords: ["Hoa Phong", "công nghệ", "tư vấn", "phần mềm", "chuyển đổi số"],
    icons: {
      icon: [{ url: "/logo/hoa-phong-mark.svg", type: "image/svg+xml" }],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={plusJakarta.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
