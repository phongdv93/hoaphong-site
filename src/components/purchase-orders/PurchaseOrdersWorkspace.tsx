"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, ShoppingCart, Sparkles, Trash2 } from "lucide-react";
import { ErpDateInput } from "@/components/erp/ErpDateInput";
import { AppSelect } from "@/components/ui/AppSelect";
import { formatDimensionsMm, shortDescription } from "@/lib/factory/display";
import type { ProjectItem } from "@/lib/projects/types";
import type { PurchaseOrder, PurchaseOrderStatus } from "@/lib/purchase-orders/types";
import { PO_STATUS_LABELS } from "@/lib/purchase-orders/types";
import type { Supplier } from "@/lib/suppliers/types";
import { SupplierPicker } from "@/components/suppliers/SupplierPicker";
import { ProductSearchPicker } from "./ProductSearchPicker";

const FIELD =
  "block w-full max-w-full box-border rounded-md border border-white/15 bg-[#0f1a2e] px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky/40";

export function PurchaseOrdersWorkspace({
  listUrl,
  detailUrlPrefix,
  projectId,
  projectItems: projectItemsProp,
  canEdit,
  hint,
}: {
  listUrl: string;
  detailUrlPrefix: string;
  projectId?: number;
  projectItems?: ProjectItem[];
  canEdit: boolean;
  hint: string;
}) {
  const detailUrl = useCallback((poId: number) => `${detailUrlPrefix}/${poId}`, [detailUrlPrefix]);

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [projectItems, setProjectItems] = useState<ProjectItem[]>(projectItemsProp ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [orderedAt, setOrderedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<PurchaseOrder | null>(null);
  const [addFromItemsOpen, setAddFromItemsOpen] = useState(false);
  const [addFromCatalogOpen, setAddFromCatalogOpen] = useState(false);
  const [suggestMsg, setSuggestMsg] = useState("");

  useEffect(() => {
    if (projectItemsProp) setProjectItems(projectItemsProp);
  }, [projectItemsProp]);

  useEffect(() => {
    if (!projectId || projectItemsProp?.length) return;
    fetch(`/api/projects/${projectId}/workspace`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.items) setProjectItems(j.items as ProjectItem[]);
      })
      .catch(() => undefined);
  }, [projectId, projectItemsProp]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(listUrl);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Không tải được đơn đặt hàng");
      setOrders([]);
    } else {
      const j = await res.json();
      setOrders(j.items ?? []);
    }
    setLoading(false);
  }, [listUrl]);

  const loadDetail = useCallback(
    async (poId: number) => {
      const res = await fetch(detailUrl(poId));
      if (res.ok) {
        const j = await res.json();
        setDetail(j.order ?? null);
      }
    },
    [detailUrl]
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (expandedId) void loadDetail(expandedId);
    else setDetail(null);
  }, [expandedId, loadDetail]);

  const statusOptions = useMemo(
    () => Object.entries(PO_STATUS_LABELS).map(([value, label]) => ({ value, label })),
    []
  );

  async function createOrder() {
    if (!supplier?.name?.trim()) {
      setError("Chọn nhà cung cấp");
      return;
    }
    setBusy(true);
    setError("");
    const lines = [...selectedItemIds].map((projectItemId) => ({
      source: "item" as const,
      projectItemId,
    }));
    const res = await fetch(listUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierName: supplier.name.trim(),
        supplierId: supplier.id,
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
    setSupplier(null);
    setOrderedAt("");
    setNotes("");
    setSelectedItemIds(new Set());
    setShowCreate(false);
    await loadList();
  }

  async function suggestOrders() {
    if (!projectId) return;
    setBusy(true);
    setError("");
    setSuggestMsg("");
    const res = await fetch(`/api/projects/${projectId}/purchase-orders/suggest`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(j.error || "Đề xuất thất bại");
      return;
    }
    const n = Number(j.created ?? 0);
    const warns = (j.suggestions as { warnings?: string[] }[] | undefined)?.flatMap((s) => s.warnings ?? []) ?? [];
    setSuggestMsg(
      n > 0
        ? `Đã tạo ${n} đơn nháp theo NCC.${warns.length ? ` Cảnh báo: ${warns.slice(0, 3).join("; ")}` : ""}`
        : "Không tạo được đơn — kiểm tra NCC trên sản phẩm / hạng mục."
    );
    await loadList();
  }

  async function updateOrder(poId: number, patch: Record<string, unknown>) {
    const res = await fetch(detailUrl(poId), {
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
    const res = await fetch(detailUrl(poId), { method: "DELETE" });
    if (res.ok) {
      if (expandedId === poId) setExpandedId(null);
      await loadList();
    }
  }

  async function addLines(
    poId: number,
    lines: Array<
      | { source: "item"; projectItemId: number }
      | { source: "catalog"; factoryProductId: number; quantity?: number }
    >
  ) {
    setBusy(true);
    const res = await fetch(detailUrl(poId), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addLines: lines }),
    });
    setBusy(false);
    if (res.ok) {
      setAddFromItemsOpen(false);
      setAddFromCatalogOpen(false);
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
      <p className="text-[10px] text-slate-500">{hint}</p>

      {error && <p className="text-xs text-rose-400">{error}</p>}
      {suggestMsg && <p className="text-xs text-emerald-400/90">{suggestMsg}</p>}

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="inline-flex items-center gap-1 px-3 h-[30px] rounded-lg border border-white/15 text-xs text-slate-200 hover:bg-white/10"
          >
            <Plus size={14} /> Đơn mới (1 NCC)
          </button>
          {projectId ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void suggestOrders()}
              className="inline-flex items-center gap-1 px-3 h-[30px] rounded-lg border border-sky/30 text-xs text-sky hover:bg-sky/10 disabled:opacity-50"
            >
              <Sparkles size={14} /> Đề xuất đơn theo NCC
            </button>
          ) : null}
        </div>
      )}

      {showCreate && canEdit && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
          <label className="block text-[10px] uppercase text-slate-500">Nhà cung cấp *</label>
          <SupplierPicker
            valueId={supplier?.id ?? null}
            valueName={supplier?.name ?? ""}
            onChange={setSupplier}
            disabled={busy}
          />
          <label className="block text-[10px] uppercase text-slate-500 mt-2">Ngày đặt</label>
          <ErpDateInput value={orderedAt} onChange={setOrderedAt} className="text-xs !h-[30px]" />
          <label className="block text-[10px] uppercase text-slate-500 mt-2">Ghi chú</label>
          <input className={FIELD} value={notes} onChange={(e) => setNotes(e.target.value)} />
          {projectItems.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] text-slate-500 mb-1">Thêm từ hạng mục dự án (tùy chọn)</p>
              <div className="max-h-36 overflow-y-auto space-y-1 border border-white/10 rounded-lg p-2">
                {projectItems.map((it) => (
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
            const poSupplierId = open && detail?.id === po.id ? detail.supplierId : po.supplierId;
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
                        {projectItems.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setAddFromItemsOpen((v) => !v)}
                            className="text-[10px] px-2 py-1 rounded border border-white/15 text-slate-300 hover:bg-white/10"
                          >
                            + Hạng mục dự án
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setAddFromCatalogOpen((v) => !v)}
                          className="text-[10px] px-2 py-1 rounded border border-white/15 text-slate-300 hover:bg-white/10"
                        >
                          + Sản phẩm NCC
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

                    {addFromItemsOpen && canEdit && projectItems.length > 0 && (
                      <div className="border border-white/10 rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto">
                        {projectItems.map((it) => (
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
                      <div className="space-y-2">
                        {!poSupplierId ? (
                          <p className="text-[10px] text-amber-400/90">
                            Đơn chưa gắn NCC trong danh mục — tìm toàn bộ SP hoặc cập nhật NCC trên đơn.
                          </p>
                        ) : null}
                        <ProductSearchPicker
                          disabled={busy}
                          supplierId={poSupplierId}
                          onPick={(p) =>
                            void addLines(po.id, [{ source: "catalog", factoryProductId: p.id }])
                          }
                        />
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
