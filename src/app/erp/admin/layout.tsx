import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/platform/access";
import { ERP } from "@/lib/paths";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect(ERP.login);

  const platformAdmin = await isPlatformAdmin(user.id);
  if (!platformAdmin) {
    redirect("/erp?error=platform_admin_only");
  }

  return <>{children}</>;
}
