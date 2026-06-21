import { QuoteBuilder } from "@/components/quote/QuoteBuilder";
import { PublicPageLayout } from "@/components/public/PublicPageLayout";
import { getSettings } from "@/lib/settings";

export const metadata = {
  title: "Báo giá online",
  description: "Tạo báo giá, thêm logo, thông tin khách hàng, bảng linh hoạt và tải PDF.",
};

export default async function BaoGiaPage() {
  const settings = await getSettings();

  return (
    <PublicPageLayout fillViewport>
      <QuoteBuilder
        defaultSeller={{
          company: settings.companyName,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
        }}
      />
    </PublicPageLayout>
  );
}
