import { ErpShell } from "@/components/erp/ErpShell";
import { DbSetupBanner } from "@/components/erp/DbSetupBanner";
import { FactoryPartsCatalogClient } from "@/components/factory/FactoryPartsCatalogClient";
import { listFactoryParts } from "@/lib/factory/products";

export default async function FactoryPartsCatalogPage() {
  let parts: Awaited<ReturnType<typeof listFactoryParts>> = [];
  let loadError: string | null = null;
  try {
    parts = await listFactoryParts();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Lỗi database";
  }

  return (
    <ErpShell title="Danh mục chi tiết (tái sử dụng)" groupId="san-pham">
      <p className="text-midnight/60 text-sm mb-6 max-w-2xl">
        Chi tiết tạo/cập nhật từ BOM. Gỗ và bao bì: <strong>Dài × Sâu × Cao (mm)</strong> để tính m³/cái. Hardware thường không có 3 cạnh (kích thước ghi trong tên).
      </p>

      {loadError && (
        <>
          <DbSetupBanner />
          <p className="text-sm text-red-700 mt-2">{loadError}</p>
        </>
      )}

      {!loadError && <FactoryPartsCatalogClient initialParts={parts} />}
    </ErpShell>
  );
}
