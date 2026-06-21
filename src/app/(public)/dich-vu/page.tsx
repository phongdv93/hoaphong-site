import { PublicPageLayout } from "@/components/public/PublicPageLayout";
import { ServicesList } from "@/components/public/ServicesList";
import { getPublishedServices } from "@/lib/data";

export const metadata = { title: "Dịch vụ" };

export default async function ServicesPage() {
  const services = await getPublishedServices();

  return (
    <PublicPageLayout>
      <ServicesList services={services} />
    </PublicPageLayout>
  );
}
