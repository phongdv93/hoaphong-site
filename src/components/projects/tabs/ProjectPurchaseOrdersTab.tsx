"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { ErpDateInput } from "@/components/erp/ErpDateInput";
import { AppSelect } from "@/components/ui/AppSelect";
import {
  formatDimensionsMm,
  shortDescription,
} from "@/lib/factory/display";
import type { ProjectItem } from "@/lib/projects/types";
import type { PurchaseOrder, PurchaseOrderStatus } from "@/lib/purchase-orders/types";
import { PO_STATUS_LABELS } from "@/lib/purchase-orders/types";

const FIELD =
  "block w-full max-w-full box-border rounded-md border border-white/15 bg-[#0f1a2e] px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky/40";

export function ProjectPurchaseOrdersTab({
  projectId,
  items,
  canEdit,
}: {
  projectId: number;
  items: ProjectItem[];
  canEdit: boolean;
}) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [orderedAt, setOrderedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<PurchaseOrder | null>(null);
  const [catalog, setCatalog] = useState<Array<{ id: number; name: string }>>([]);
  const [pickCatalogId, setPickCatalogId] = useState("");
  const [addFromItemsOpen, setAddFromItemsOpen] = useState(false);
  const [addFromCatalogOpen, setAddFromCatalogOpen] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/projects/${projectId}/purchase-orders`);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Không tải được đơn đặt hàng");
      setOrders([]);
    } else {
      const j = await res.json();
      setOrders(j.items ?? []);
    }
    setLoading(false);
  }, [projectId]);

  const loadDetail = useCallback(
    async (poId: number) => {
      const res = await fetch(`/api/projects/${projectId}/purchase-orders/${poId}`);
      if (res.ok) {
        const j = await res.json();
        setDetail(j.order ?? null);
      }
    },
    [projectId]
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    fetch("/api/factory/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (!Array.isArray(list)) return;
        setCatalog(
          list.map((p: { id: number; name: string }) => ({
            id: p.id,
            name: p.name?.trim() || "—",
          }))
        );
      })
      .catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    if (expandedId) void loadDetail(expandedId);
    else setDetail(null);
  }, [expandedId, loadDetail]);

  const statusOptions = useMemo(
    () => Object.entries(PO_STATUS_LABELS).map(([value, label]) => ({ value, label })),
    []
  );

  async function createOrder() {
    if (!supplierName.trim()) {
      setError("Nhập tên nhà cung cấp");
      return;
    }
    setBusy(true);
    setError("");
    const lines = [...selectedItemIds].map((projectItemId) => ({
      source: "item" as const,
      projectItemId,
    }));
    const res = await fetch(`/api/projects/${projectId}/purchase-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierName: supplierName.trim(),
        orderedAt: orderedAt || null,
        notes,
        lines: lines.length ? lines : undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Không tạo được đơn");
      return;
    }
    setSupplierName("");
    setOrderedAt("");
    setNotes("");
    setSelectedItemIds(new Set());
    setShowCreate(false);
    await loadList();
  }

  async function updateOrder(poId: number, patch: Record<string, unknown>) {
    const res = await fetch(`/api/projects/${projectId}/purchase-orders/${poId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      await loadList();
      if (expandedId === poId) await loadDetail(poId);
    }
  }

  async function deleteOrder(poId: number) {
    if (!confirm("Xóa đơn đặt hàng này?")) return;
    const res = await fetch(`/api/projects/${projectId}/purchase-orders/${poId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      if (expandedId === poId) setExpandedId(null);
      await loadList();
    }
  }

  async function addLines(
    poId: number,
    lines: Array<
      | { source: "item"; projectItemId: number }
      | { source: "catalog"; factoryProductId: number }
    >
  ) {
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/purchase-orders/${poId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addLines: lines }),
    });
    setBusy(false);
    if (res.ok) {
      setAddFromItemsOpen(false);
      setAddFromCatalogOpen(false);
      setPickCatalogId("");
      await loadList();
      await loadDetail(poId);
    }
  }

  async function removeLine(poId: number, lineId: number) {
    if (!confirm("Xóa dòng này khỏi đơn?")) return;
    await updateOrder(poId, { removeLineIds: [lineId] });
  }

  function toggleItem(id: number) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return <p className="text-xs text-slate-500 py-4">Đang tải đơn đặt hàng…</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-slate-500">
        Mỗi đơn gắn một nhà cung cấp — lấy dòng từ hạng mục dự án hoặc danh mục sản phẩm (mua ngoài / outsource).
      </p>

      {error && <p className="text-xs text-rose-400">{error}</p>}

      {canEdit && (
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-1 px-3 h-[30px] rounded-lg border border-white/15 text-xs text-slate-200 hover:bg-white/10"
        >
          <Plus size={14} /> Đơn mới (1 NCC)
        </button>
      )}

      {showCreate && canEdit && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
          <label className="block text-[10px] uppercase text-slate-500">Nhà cung cấp *</label>
          <input
            className={FIELD}
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="Tên NCC"
          />
          <label className="block text-[10px] uppercase text-slate-500 mt-2">Ngày đặt</label>
          <ErpDateInput value={orderedAt} onChange={setOrderedAt} className="text-xs !h-[30px]" />
          <label className="block text-[10px] uppercase text-slate-500 mt-2">Ghi chú</label>
          <input className={FIELD} value={notes} onChange={(e) => setNotes(e.target.value)} />
          {items.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] text-slate-500 mb-1">Thêm từ hạng mục dự án (tùy chọn)</p>
              <div className="max-h-36 overflow-y-auto space-y-1 border border-white/10 rounded-lg p-2">
                {items.map((it) => (
                  <label
                    key={it.id}
                    className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedItemIds.has(it.id)}
                      onChange={() => toggleItem(it.id)}
                      className="mt-0.5"
                    />
                    <span>
                      {it.name}
                      {it.quantity !== 1 ? (
                        <span className="text-slate-500"> × {it.quantity}</span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void createOrder()}
            className="bg-sky text-white px-4 py-1.5 rounded-lg text-xs hover:bg-sky-light disabled:opacity-50 mt-2"
          >
            {busy ? "Đang tạo…" : "Tạo đơn"}
          </button>
        </div>
      )}

      {!orders.length ? (
        <p className="text-slate-400 text-center py-6 border border-dashed border-white/10 rounded-lg text-xs flex flex-col items-center gap-2">
          <ShoppingCart size={20} className="opacity-40" />
          Chưa có đơn đặt hàng.
        </p>
      ) : (
        <div className="space-y-2">
          {orders.map((po) => {
            const open = expandedId === po.id;
            const lines = open && detail?.id === po.id ? detail.lines ?? [] : [];
            return (
              <div
                key={po.id}
                className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5"
                  onClick={() => setExpandedId(open ? null : po.id)}
                >
                  {open ? (
                    <ChevronDown size={14} className="text-slate-500 shrink-0" />
                  ) : (
                    <ChevronRight size={14} className="text-slate-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">
                      {po.supplierName || "—"}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {po.poNumber} · {PO_STATUS_LABELS[po.status]}
                    </div>
                  </div>
                </button>

                {open && detail?.id === po.id && (
                  <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-2">
                    {canEdit && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500">Trạng thái</label>
                          <AppSelect
                            value={detail.status}
                            onChange={(v) =>
                              void updateOrder(po.id, { status: v as PurchaseOrderStatus })
                            }
                            className="input-field text-xs w-full !h-[28px]"
                            options={statusOptions}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500">Ngày đặt</label>
                          <ErpDateInput
                            value={detail.orderedAt ?? ""}
                            onChange={(v) => void updateOrder(po.id, { orderedAt: v || null })}
                            className="text-xs !h-[28px]"
                          />
                        </div>
                      </div>
                    )}

                    {lines.length === 0 ? (
                      <p className="text-[11px] text-slate-500 py-2">Chưa có dòng hàng.</p>
                    ) : (
                      <div className="space-y-1">
                        {lines.map((ln) => (
                          <div
                            key={ln.id}
                            className="rounded-lg border border-white/8 bg-white/[0.02] px-2 py-1.5 text-[11px]"
                          >
                            <div className="flex justify-between gap-2">
                              <span className="font-medium text-slate-200">{ln.name}</span>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => void removeLine(po.id, ln.id)}
                                  className="text-rose-400 hover:text-rose-300 shrink-0"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                            <div className="text-slate-500 mt-0.5">
                              {ln.productCode || "—"} ·{" "}
                              {formatDimensionsMm(ln.lengthMm, ln.depthMm, ln.heightMm)}
                            </div>
                            <div className="text-slate-500">
                              SL {ln.quantity} {ln.unit}
                              {ln.unitPrice ? ` · ${ln.unitPrice}` : ""}
                            </div>
                            {(ln.brand || ln.origin) && (
                              <div className="text-slate-600 text-[10px]">
                                {ln.brand}
                                {ln.brand && ln.origin ? " · " : ""}
                                {ln.origin}
                              </div>
                            )}
                            {ln.description ? (
                              <div className="text-slate-600 text-[10px] mt-0.5">
                                {shortDescription(ln.description, 80)}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}

                    {canEdit && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setAddFromItemsOpen((v) => !v)}
                          className="text-[10px] px-2 py-1 rounded border border-white/15 text-slate-300 hover:bg-white/10"
                        >
                          + Hạng mục dự án
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddFromCatalogOpen((v) => !v)}
                          className="text-[10px] px-2 py-1 rounded border border-white/15 text-slate-300 hover:bg-white/10"
                        >
                          + Danh mục SP
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteOrder(po.id)}
                          className="text-[10px] px-2 py-1 rounded border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 ml-auto"
                        >
                          Xóa đơn
                        </button>
                      </div>
                    )}

                    {addFromItemsOpen && canEdit && items.length > 0 && (
                      <div className="border border-white/10 rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto">
                        {items.map((it) => (
                          <button
                            key={it.id}
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void addLines(po.id, [{ source: "item", projectItemId: it.id }])
                            }
                            className="block w-full text-left text-[11px] text-slate-300 hover:bg-white/10 rounded px-2 py-1"
                          >
                            {it.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {addFromCatalogOpen && canEdit && (
                      <div className="flex gap-2 items-end">
                        <select
                          className={`${FIELD} flex-1`}
                          value={pickCatalogId}
                          onChange={(e) => setPickCatalogId(e.target.value)}
                        >
                          <option value="">Chọn sản phẩm…</option>
                          {catalog.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={busy || !pickCatalogId}
                          onClick={() =>
                            void addLines(po.id, [
                              {
                                source: "catalog",
                                factoryProductId: Number(pickCatalogId),
                              },
                            ])
                          }
                          className="bg-sky text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                        >
                          Thêm
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
