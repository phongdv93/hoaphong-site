"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { WoodAppShell } from "@/components/wood/WoodAppShell";
import { IssueToolbar } from "@/components/wood/IssueToolbar";
import { BoardGridView } from "@/components/wood/BoardGridView";
import { formatM3, formatMm } from "@/lib/wood/volume";
import { parseGridFromNotes, boardsToDisplayGrid } from "@/lib/wood/grid";
import {
  BUNDLE_WIDTH_MM,
  BUNDLE_HEIGHT_MM,
  BUNDLE_LENGTH_MM,
} from "@/lib/wood/layout";
import type { WoodBundle, ProductionOrder, WoodBoard } from "@/lib/wood/types";
import { ArrowLeft, LayoutGrid, Box } from "lucide-react";
import { ERP } from "@/lib/paths";
import { AppSelect } from "@/components/ui/AppSelect";

const BundleViewer3D = dynamic(
  () => import("@/components/wood/BundleViewer3D").then((m) => m.BundleViewer3D),
  { ssr: false, loading: () => <div className="h-[560px] bg-white/5 rounded-xl animate-pulse" /> }
);

type ViewMode = "3d" | "grid";

export default function KienDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [bundle, setBundle] = useState<WoodBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("3d");
  const [pos, setPos] = useState<ProductionOrder[]>([]);
  const [poId, setPoId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    const res = await fetch(`/api/wood/bundles/${id}`);
    if (res.status === 404) {
      setBundle(null);
      setNotFound(true);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setBundle(null);
      setLoading(false);
      return;
    }
    setBundle(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
    fetch("/api/wood/po")
      .then((r) => r.json())
      .then((data: ProductionOrder[]) => {
        setPos(data.filter((p) => p.status === "open"));
        if (data[0]) setPoId(String(data[0].id));
      });
  }, [load]);

  const boards = useMemo(() => bundle?.boards ?? [], [bundle?.boards]);
  const displayGrid = useMemo(() => {
    if (!bundle) return null;
    return parseGridFromNotes(bundle.notes) ?? boardsToDisplayGrid(boards);
  }, [bundle, boards]);

  const available = useMemo(() => boards.filter((b) => b.status === "available"), [boards]);
  const selectedBoards = useMemo(
    () => boards.filter((b) => selectedIds.has(b.id) && b.status === "available"),
    [boards, selectedIds]
  );
  const selectedVolume = useMemo(
    () => selectedBoards.reduce((s, b) => s + b.volumeM3, 0),
    [selectedBoards]
  );
  const currentPo = pos.find((p) => String(p.id) === poId) ?? null;

  async function issueSelected() {
    if (!poId) {
      setMsg("Chọn PO nhà máy trước");
      return;
    }
    if (!selectedBoards.length) {
      setMsg("Chọn ít nhất một thanh");
      return;
    }
    const res = await fetch("/api/wood/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardIds: selectedBoards.map((b) => b.id),
        poId: Number(poId),
      }),
    });
    const json = await res.json();
    if (res.ok) {
      const n = json.issued ?? selectedBoards.length;
      setMsg(`Đã phát ${n} thanh — trừ khối tự động`);
      setSelectedIds(new Set());
      load();
    } else {
      setMsg(json.error || "Lỗi phát gỗ");
    }
  }

  function toggleBoard(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCell(ids: number[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allIn = ids.every((id) => next.has(id));
      if (allIn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  if (loading) {
    return (
      <WoodAppShell title="Chi tiết kiện">
        <p className="text-midnight/50">Đang tải...</p>
      </WoodAppShell>
    );
  }

  if (notFound || !bundle) {
    return (
      <WoodAppShell title="Không tìm thấy kiện">
        <Link href={ERP.khoGo} className="inline-flex items-center gap-1 text-sm text-sky mb-4 hover:underline">
          <ArrowLeft size={16} /> Về tổng quan kho
        </Link>
        <p className="text-midnight/70">
          Không có kiện id <strong>{id}</strong>. Mở <Link href={ERP.khoGo} className="text-sky underline">tổng quan</Link> để chọn kiện hiện có.
        </p>
      </WoodAppShell>
    );
  }

  return (
    <WoodAppShell title={`Kiện ${bundle.code}`}>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <Link href={ERP.khoGo} className="inline-flex items-center gap-1 text-sm text-sky hover:underline">
          <ArrowLeft size={16} /> Tổng quan
        </Link>
        <Link href={ERP.khoGoPhat} className="text-sm text-sky hover:underline">
          Phát gỗ nhiều kiện →
        </Link>
      </div>

      <div className="bg-gradient-to-r from-navy/5 to-sky/5 rounded-xl border border-navy/10 px-5 py-4 mb-6 flex flex-wrap gap-6 text-sm">
        <div>
          <p className="text-xs text-midnight/50 uppercase tracking-wide">Bìa kiện</p>
          <p className="font-bold text-navy text-lg">{bundle.code}</p>
          <p className="text-midnight/70">{bundle.speciesName}</p>
        </div>
        <div>
          <p className="text-xs text-midnight/50">Chiều dài</p>
          <p className="font-semibold">{formatMm(bundle.lengthMm)}</p>
        </div>
        <div>
          <p className="text-xs text-midnight/50">Chiều dày</p>
          <p className="font-semibold">{formatMm(bundle.thicknessMm)}</p>
        </div>
        <div>
          <p className="text-xs text-midnight/50">Khung chuẩn</p>
          <p className="font-medium text-xs">
            {formatMm(BUNDLE_WIDTH_MM)} × {formatMm(BUNDLE_HEIGHT_MM)} × {formatMm(BUNDLE_LENGTH_MM)}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setViewMode("3d")}
            className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 ${
              viewMode === "3d" ? "bg-sky text-white" : "bg-white border"
            }`}
          >
            <Box size={14} /> 3D
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 ${
              viewMode === "grid" ? "bg-sky text-white" : "bg-white border"
            }`}
          >
            <LayoutGrid size={14} /> Lưới
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 erp-card p-4">
          {viewMode === "3d" ? (
            <>
              <BundleViewer3D boards={boards} selectedIds={selectedIds} onChangeSelection={setSelectedIds} />
              <p className="text-xs text-midnight/50 mt-2 text-center">
                Trái: chọn thêm · Phải: bỏ chọn · Kéo nền: chọn vùng
              </p>
            </>
          ) : (
            displayGrid && (
              <BoardGridView
                grid={displayGrid}
                boards={boards}
                selectedIds={selectedIds}
                onToggleBoard={toggleBoard}
                onToggleCell={toggleCell}
              />
            )
          )}
        </div>
        <div className="space-y-4">
          <div className="erp-card p-5 space-y-2 text-sm">
            <p>
              <strong>Packing list:</strong> {bundle.packingListNo}
            </p>
            <p>
              <strong>Tổng khối:</strong> {formatM3(bundle.totalVolumeM3)}
            </p>
            <p>
              <strong>Còn lại:</strong> {formatM3(bundle.remainingVolumeM3)}
            </p>
            <p>
              <strong>Thanh:</strong> {available.length} / {boards.length} khả dụng
            </p>
          </div>

          <div className="erp-card p-5 space-y-3">
            <h3 className="font-semibold text-navy">Phát xuống PO</h3>
            <AppSelect
              variant="light"
              value={poId}
              onChange={setPoId}
              options={pos.map((p) => ({
                value: String(p.id),
                label: `${p.poNumber} — ${p.customerName}`,
              }))}
            />
            <IssueToolbar
              boards={boards}
              selectedIds={selectedIds}
              onChangeSelection={setSelectedIds}
              po={currentPo}
              selectedVolumeM3={selectedVolume}
            />
            {selectedBoards.length > 0 && (
              <div className="text-sm space-y-2">
                <p>
                  <strong>{selectedBoards.length}</strong> thanh · {formatM3(selectedVolume)}
                </p>
                <button type="button" onClick={issueSelected} className="btn-primary w-full text-sm py-2">
                  Phát {selectedBoards.length} thanh
                </button>
              </div>
            )}
            {msg && <p className="text-xs text-emerald">{msg}</p>}
          </div>
        </div>
      </div>

      <div className="erp-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Rộng</th>
              <th className="px-3 py-2 text-left">Dài</th>
              <th className="px-3 py-2 text-left">Dày</th>
              <th className="px-3 py-2 text-left">Khối</th>
              <th className="px-3 py-2 text-left">TT</th>
            </tr>
          </thead>
          <tbody>
            {boards.map((b) => (
              <tr
                key={b.id}
                className={`border-t cursor-pointer ${
                  selectedIds.has(b.id) ? "bg-sky/10" : b.status === "issued" ? "opacity-50" : ""
                }`}
                onClick={() => b.status === "available" && toggleBoard(b.id)}
              >
                <td className="px-3 py-2">{b.seqNo}</td>
                <td className="px-3 py-2">{formatMm(b.widthMm)}</td>
                <td className="px-3 py-2">{formatMm(b.lengthMm)}</td>
                <td className="px-3 py-2">{formatMm(b.thicknessMm)}</td>
                <td className="px-3 py-2">{formatM3(b.volumeM3)}</td>
                <td className="px-3 py-2">{b.status === "issued" ? "Đã phát" : "Trong kho"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WoodAppShell>
  );
}
