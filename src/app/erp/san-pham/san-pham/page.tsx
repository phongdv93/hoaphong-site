import { ErpShell } from "@/components/erp/ErpShell";
import { DbSetupBanner } from "@/components/erp/DbSetupBanner";
import { FactoryProductListClient } from "@/components/factory/FactoryProductListClient";
import { listFactoryProducts } from "@/lib/factory/products";
import { requireActiveTenantCompany } from "@/lib/projects/with-active-tenant";

export default async function FactoryProductListPage() {
  const ctx = await requireActiveTenantCompany();
  if ("error" in ctx) {
    return (
      <ErpShell title="Sản phẩm & BOM" groupId="san-pham">
        <p className="text-sm text-rose-300">{ctx.error}</p>
      </ErpShell>
    );
  }

  let rows: Awaited<ReturnType<typeof listFactoryProducts>> = [];
  let loadError: string | null = null;
  try {
    rows = await ctx.run(() => listFactoryProducts());
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Không kết nối được database";
  }

  return (
    <ErpShell title="Sản phẩm & BOM" groupId="san-pham">
      <p className="text-slate-400 text-sm mb-6 max-w-2xl">
        Danh mục sản phẩm — tìm nhanh, dán từ Excel để thêm nhiều SP. Chi tiết BOM xem khi mở từng sản phẩm.
      </p>

      {loadError && (
        <>
          <DbSetupBanner />
          <p className="text-sm text-rose-300 mt-2">{loadError}</p>
        </>
      )}

      {!loadError && <FactoryProductListClient initialProducts={rows} />}
    </ErpShell>
  );
}
