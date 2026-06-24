import { QuoteBuilder } from "@/components/quote/QuoteBuilder";
import { PublicPageLayout } from "@/components/public/PublicPageLayout";
import { getSettings } from "@/lib/settings";

export const metadata = {
  title: "Mini tool báo giá",
  description:
    "Công cụ miễn phí cho khách vãng lai: tạo báo giá, thêm logo, bảng linh hoạt và tải PDF.",
};

export default async function MiniToolBaoGiaPage() {
  const settings = await getSettings();

  return (
    <PublicPageLayout fillViewport>
      <QuoteBuilder
        variant="mini"
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
