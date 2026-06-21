import { ErpShell } from "@/components/erp/ErpShell";
import { ProductEditor } from "@/components/factory/ProductEditor";

export default function NewFactoryProductPage() {
  return (
    <ErpShell title="Sản phẩm mới" groupId="san-pham">
      <ProductEditor productId={null} />
    </ErpShell>
  );
}
