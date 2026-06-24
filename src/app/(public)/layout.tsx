import { PublicLayout } from "@/components/PublicLayout";

/** Menu đọc từ DB (CMS) — không bake tĩnh lúc build. */
export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}
