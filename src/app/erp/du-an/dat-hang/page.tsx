import { ErpShell } from "@/components/erp/ErpShell";
import { ProjectPurchaseOrdersPageClient } from "@/components/purchase-orders/ProjectPurchaseOrdersPageClient";

export const metadata = {
  title: "Đơn đặt hàng dự án | ERP",
};

export default async function ProjectPurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const sp = await searchParams;
  const projectId = Number(sp.project ?? "");
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return (
      <ErpShell title="Đơn đặt hàng" groupId="du-an">
        <p className="text-sm text-slate-400">Thiếu mã dự án. Mở từ panel dự án hoặc thêm ?project=ID vào URL.</p>
      </ErpShell>
    );
  }

  return (
    <ErpShell title="Đơn đặt hàng dự án" groupId="du-an">
      <div className="max-w-3xl">
        <ProjectPurchaseOrdersPageClient projectId={projectId} />
      </div>
    </ErpShell>
  );
}
