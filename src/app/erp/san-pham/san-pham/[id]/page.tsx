import { notFound } from "next/navigation";
import { ErpShell } from "@/components/erp/ErpShell";
import { ProductEditor } from "@/components/factory/ProductEditor";

export default async function EditFactoryProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const num = Number(id);
  if (!Number.isFinite(num) || num < 1) notFound();

  return (
    <ErpShell title="Sản phẩm" groupId="san-pham" fillHeight contentBleed>
      <ProductEditor productId={num} />
    </ErpShell>
  );
}
