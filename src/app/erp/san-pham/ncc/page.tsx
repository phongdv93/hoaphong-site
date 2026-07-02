import { ErpShell } from "@/components/erp/ErpShell";
import { SuppliersClient } from "@/components/suppliers/SuppliersClient";
import { listSuppliers } from "@/lib/suppliers/repository";
import { requireActiveTenantCompany } from "@/lib/projects/with-active-tenant";

export default async function SuppliersPage() {
  const ctx = await requireActiveTenantCompany();
  if ("error" in ctx) {
    return (
      <ErpShell title="Nhà cung cấp" groupId="san-pham">
        <p className="text-sm text-rose-300">{ctx.error}</p>
      </ErpShell>
    );
  }

  const suppliers = await ctx.run(() => listSuppliers(ctx.companyId));

  return (
    <ErpShell title="Nhà cung cấp" groupId="san-pham">
      <p className="text-slate-400 text-sm mb-4 max-w-2xl">
        Danh mục NCC dùng chung cho đơn đặt hàng (kế toán & dự án) và giá mua trên sản phẩm.
      </p>
      <SuppliersClient initialSuppliers={suppliers} />
    </ErpShell>
  );
}
