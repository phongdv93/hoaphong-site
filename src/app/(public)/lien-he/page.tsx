import { PublicPageLayout } from "@/components/public/PublicPageLayout";
import { ContactSections } from "@/components/public/ContactSections";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Liên hệ" };

export default async function ContactPage() {
  const settings = await getSettings();

  return (
    <PublicPageLayout>
      <ContactSections address={settings.address} phone={settings.phone} email={settings.email} />
    </PublicPageLayout>
  );
}
