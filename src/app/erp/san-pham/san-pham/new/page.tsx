import { ErpShell } from "@/components/erp/ErpShell";
import { ProductEditor } from "@/components/factory/ProductEditor";
import { getCompany } from "@/lib/projects/companies";
import { requireActiveTenantCompany } from "@/lib/projects/with-active-tenant";

export default async function NewFactoryProductPage() {
  const ctx = await requireActiveTenantCompany();
  let defaultBrand = "";
  if (!("error" in ctx)) {
    const company = await getCompany(ctx.companyId);
    defaultBrand = company?.name?.trim() ?? "";
  }

  return (
    <ErpShell title="Sản phẩm mới" groupId="san-pham">
      <ProductEditor productId={null} defaultBrand={defaultBrand} />
    </ErpShell>
  );
}
