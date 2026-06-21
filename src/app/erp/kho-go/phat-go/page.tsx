"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { WoodAppShell } from "@/components/wood/WoodAppShell";
import { IssueToolbar } from "@/components/wood/IssueToolbar";
import { BoardGridView } from "@/components/wood/BoardGridView";
import { formatM3, formatMm } from "@/lib/wood/volume";
import { parseGridFromNotes, boardsToDisplayGrid } from "@/lib/wood/grid";
import type { WoodBundle, ProductionOrder, WoodBoard } from "@/lib/wood/types";
import { Box, ChevronDown, ChevronRight } from "lucide-react";
import { ERP } from "@/lib/paths";
import { AppSelect } from "@/components/ui/AppSelect";

const BundleViewer3D = dynamic(
  () => import("@/components/wood/BundleViewer3D").then((m) => m.BundleViewer3D),
  { ssr: false, loading: () => <div className="h-[400px] bg-mist rounded-xl animate-pulse" /> }
);

export default function PhatGoPage() {
  const [bundles, setBundles] = useState<WoodBundle[]>([]);
  const [bundleDetails, setBundleDetails] = useState<Map<number, WoodBundle>>(new Map());
  const [activeBundleIds, setActiveBundleIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [view3dId, setView3dId] = useState<number | null>(null);
  const [pos, setPos] = useState<ProductionOrder[]>([]);
  const [poId, setPoId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/wood/bundles")
      .then((r) => r.json())
      .then((data: WoodBundle[]) => setBundles(data.filter((b) => b.status !== "depleted")));
    fetch("/api/wood/po")
      .then((r) => r.json())
      .then((data: ProductionOrder[]) => {
        const open = data.filter((p) => p.status === "open");
        setPos(open);
        if (open[0]) setPoId(String(open[0].id));
      });
  }, []);

  const loadBundle = useCallback(async (id: number) => {
    const res = await fetch(`/api/wood/bundles/${id}`);
    if (!res.ok) return;
    const b: WoodBundle = await res.json();
    setBundleDetails((prev) => {
      if (prev.has(id)) return prev;
      return new Map(prev).set(id, b);
    });
  }, []);

  async function toggleBundle(id: number) {
    const next = new Set(activeBundleIds);
    if (next.has(id)) {
      next.delete(id);
      setSelectedIds((sel) => {
        const boards = bundleDetails.get(id)?.boards ?? [];
        const boardIds = new Set(boards.map((b) => b.id));
        return new Set([...sel].filter((bid) => !boardIds.has(bid)));
      });
    } else {
      next.add(id);
      await loadBundle(id);
      setExpandedId(id);
    }
    setActiveBundleIds(next);
  }

  const allBoards = useMemo(() => {
    const list: WoodBoard[] = [];
    for (const id of activeBundleIds) {
      const b = bundleDetails.get(id);
      if (b?.boards) list.push(...b.boards);
    }
    return list;
  }, [activeBundleIds, bundleDetails]);

  const selectedBoards = useMemo(
    () => allBoards.filter((b) => selectedIds.has(b.id) && b.status === "available"),
    [allBoards, selectedIds]
  );

  const selectedVolume = useMemo(
    () => selectedBoards.reduce((s, b) => s + b.volumeM3, 0),
    [selectedBoards]
  );

  const currentPo = pos.find((p) => String(p.id) === poId) ?? null;

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

  async function issueSelected() {
    if (!poId) {
      setMsg("Chọn PO trước");
      return;
    }
    if (!selectedBoards.length) {
      setMsg("Chọn thanh từ một hoặc nhiều kiện");
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
      setMsg(`Đã phát ${json.issued ?? selectedBoards.length} thanh từ ${new Set(selectedBoards.map((b) => b.bundleId)).size} kiện`);
      setSelectedIds(new Set());
      setBundleDetails(new Map());
      setActiveBundleIds(new Set());
      const listRes = await fetch("/api/wood/bundles");
      setBundles(await listRes.json());
    } else {
      setMsg(json.error || "Lỗi phát gỗ");
    }
  }

  return (
    <WoodAppShell title="Phát gỗ — nhiều kiện / một PO">
      <p className="text-sm text-midnight/60 mb-6 max-w-2xl">
        Một PO có thể lấy gỗ từ nhiều kiện. Chọn các kiện bên dưới, chọn thanh trên lưới hoặc 3D, rồi phát một lần.
      </p>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-navy/10 p-5 space-y-3">
            <h3 className="font-semibold text-navy">PO nhà máy</h3>
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
              boards={allBoards}
              selectedIds={selectedIds}
              onChangeSelection={setSelectedIds}
              po={currentPo}
              selectedVolumeM3={selectedVolume}
            />
            {selectedBoards.length > 0 && (
              <button type="button" onClick={issueSelected} className="btn-primary w-full text-sm py-2">
                Phát {selectedBoards.length} thanh ({formatM3(selectedVolume)})
              </button>
            )}
            {msg && <p className="text-xs text-emerald">{msg}</p>}
          </div>

          <div className="bg-white rounded-xl border border-navy/10 p-4 space-y-2 max-h-[50vh] overflow-y-auto">
            <h3 className="font-semibold text-navy text-sm">Chọn kiện</h3>
            {bundles.length === 0 && <p className="text-xs text-midnight/50">Chưa có kiện trong kho</p>}
            {bundles.map((b) => {
              const on = activeBundleIds.has(b.id);
              return (
                <label
                  key={b.id}
                  className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer border ${
                    on ? "border-sky bg-sky/5" : "border-transparent hover:bg-mist"
                  }`}
                >
                  <input type="checkbox" checked={on} onChange={() => toggleBundle(b.id)} className="mt-1" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium">{b.code}</p>
                    <p className="text-xs text-midnight/50">
                      {b.speciesName} · {formatM3(b.remainingVolumeM3)} · {b.boardCount} thanh
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {activeBundleIds.size === 0 && (
            <p className="text-midnight/50 text-sm bg-white rounded-xl border p-8 text-center">
              Tick chọn ít nhất một kiện để chọn thanh phát gỗ
            </p>
          )}
          {[...activeBundleIds].map((id) => {
            const bundle = bundleDetails.get(id);
            if (!bundle) {
              return (
                <div key={id} className="bg-white rounded-xl border p-4 text-sm text-midnight/50">
                  Đang tải kiện…
                </div>
              );
            }
            const grid =
              parseGridFromNotes(bundle.notes) ?? boardsToDisplayGrid(bundle.boards ?? []);
            const expanded = expandedId === id;
            const boards = bundle.boards ?? [];

            return (
              <div key={id} className="bg-white rounded-xl border border-navy/10 overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-mist/50 text-left"
                  onClick={() => setExpandedId(expanded ? null : id)}
                >
                  <div>
                    <p className="font-semibold text-navy">
                      {bundle.code} — {bundle.packingListNo}
                    </p>
                    <p className="text-xs text-midnight/50">
                      Dài {formatMm(bundle.lengthMm)} · Dày {formatMm(bundle.thicknessMm)} · Còn{" "}
                      {formatM3(bundle.remainingVolumeM3)}
                    </p>
                  </div>
                  {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                {expanded && (
                  <div className="px-4 pb-4 space-y-4 border-t">
                    <div className="flex gap-2 flex-wrap pt-3">
                      <button
                        type="button"
                        onClick={() => setView3dId(view3dId === id ? null : id)}
                        className="text-xs px-2 py-1 rounded border border-navy/15 hover:bg-mist"
                      >
                        {view3dId === id ? "Ẩn 3D" : "Xem 3D kiện này"}
                      </button>
                      <Link href={ERP.kien(id)} className="text-xs px-2 py-1 rounded border text-sky flex items-center gap-1">
                        <Box size={12} /> Trang chi tiết kiện
                      </Link>
                    </div>
                    {view3dId === id && (
                      <BundleViewer3D
                        boards={boards}
                        selectedIds={selectedIds}
                        onChangeSelection={setSelectedIds}
                        className="h-[400px] w-full rounded-xl overflow-hidden bg-mist border border-navy/10"
                      />
                    )}
                    <BoardGridView
                      grid={grid}
                      boards={boards}
                      selectedIds={selectedIds}
                      onToggleBoard={toggleBoard}
                      onToggleCell={toggleCell}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </WoodAppShell>
  );
}
