import { PublicPageLayout } from "@/components/public/PublicPageLayout";
import { ProductsList } from "@/components/public/ProductsList";
import { getPublishedProducts } from "@/lib/data";

export const metadata = { title: "Sản phẩm" };

export default async function ProductsPage() {
  const products = await getPublishedProducts();

  return (
    <PublicPageLayout>
      <ProductsList products={products} />
    </PublicPageLayout>
  );
}
