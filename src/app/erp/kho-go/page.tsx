import Link from "next/link";
import { WoodAppShell } from "@/components/wood/WoodAppShell";
import { getWoodStats, listBundles } from "@/lib/wood/repository";
import { formatM3 } from "@/lib/wood/volume";
import { ERP } from "@/lib/paths";
import { DbSetupBanner } from "@/components/erp/DbSetupBanner";
import { Plus, Box } from "lucide-react";

async function loadKhoGo() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const stats = await getWoodStats();
    const bundles = (await listBundles()).slice(0, 10);
    return { stats, bundles };
  } catch {
    return null;
  }
}

export default async function KhoGoDashboardPage() {
  const data = await loadKhoGo();

  if (!data) {
    return (
      <WoodAppShell title="Tổng quan kho gỗ">
        <DbSetupBanner />
        <p className="text-midnight/60 text-sm">
          Sau khi cấu hình DB, vào lại trang này hoặc chạy seed kho gỗ demo.
        </p>
      </WoodAppShell>
    );
  }

  const { stats, bundles } = data;

  return (
    <WoodAppShell title="Tổng quan kho gỗ">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Kiện trong kho", value: String(stats.bundleCount) },
          { label: "Khối còn lại", value: formatM3(stats.totalVolumeM3) },
          { label: "Thanh khả dụng", value: String(stats.availableBoards) },
          { label: "PO đang mở", value: String(stats.openPOs) },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-navy/10 p-5">
            <p className="text-2xl font-bold text-navy">{s.value}</p>
            <p className="text-sm text-midnight/50 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-lg text-navy">Kiện gỗ gần đây</h2>
        <Link href={ERP.khoGoNhap} className="btn-primary text-sm py-2">
          <Plus size={16} /> Nhập kiện mới
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-navy/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-mist text-left">
            <tr>
              <th className="px-4 py-3">Mã kiện</th>
              <th className="px-4 py-3">Loại gỗ</th>
              <th className="px-4 py-3">Packing list</th>
              <th className="px-4 py-3">Khối còn</th>
              <th className="px-4 py-3">Thanh</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {bundles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-midnight/50">
                  Chưa có kiện. Chạy <code className="text-sky">npm run db:seed-wood</code> hoặc nhập kho mới.
                </td>
              </tr>
            ) : (
              bundles.map((b) => (
                <tr key={b.id} className="border-t border-navy/5 hover:bg-mist/50">
                  <td className="px-4 py-3 font-medium">{b.code}</td>
                  <td className="px-4 py-3">{b.speciesName}</td>
                  <td className="px-4 py-3">{b.packingListNo}</td>
                  <td className="px-4 py-3">{formatM3(b.remainingVolumeM3)}</td>
                  <td className="px-4 py-3">{b.boardCount}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={ERP.kien(b.id)}
                      className="text-sky font-medium hover:underline inline-flex items-center gap-1"
                    >
                      <Box size={14} /> 3D / Phát
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </WoodAppShell>
  );
}
