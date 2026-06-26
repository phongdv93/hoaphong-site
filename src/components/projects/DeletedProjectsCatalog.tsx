"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONES } from "@/lib/projects/constants";
import { formatDateVi } from "@/lib/dates";
import type { ProjectSummary } from "@/lib/projects/types";

export function DeletedProjectsCatalog({
  items,
  loading,
  onRestore,
}: {
  items: ProjectSummary[];
  loading: boolean;
  onRestore: (id: number) => void;
}) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400 border-t border-white/10 min-h-0 bg-[#0a1120]">
        Đang tải danh mục đã xóa…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-sm text-slate-400 border-t border-white/10 min-h-0 bg-[#0a1120] px-6">
        <Trash2 size={32} className="text-slate-600" />
        <p>Chưa có dự án nào trong thùng rác.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto border-t border-white/10 bg-[#0a1120]">
      <div className="px-8 py-4 max-w-5xl">
        <p className="text-xs text-slate-500 mb-3">
          Dự án đã xóa không hiển thị trên timeline. Bấm <strong className="text-slate-400">Khôi phục</strong> để đưa lại vào danh sách.
        </p>
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm text-slate-200">
            <thead className="bg-white/5 text-slate-400 text-xs">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Mã</th>
                <th className="px-3 py-2 text-left font-medium">Tên dự án</th>
                <th className="px-3 py-2 text-left font-medium">Trạng thái</th>
                <th className="px-3 py-2 text-left font-medium">Ngày xóa</th>
                <th className="px-3 py-2 text-right font-medium">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-white/10 hover:bg-white/[0.03]">
                  <td className="px-3 py-2 font-mono text-xs text-slate-400">{p.code || "—"}</td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${PROJECT_STATUS_TONES[p.status]}`}
                    >
                      {PROJECT_STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400 tabular-nums">
                    {formatDateVi(p.deletedAt)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onRestore(p.id)}
                      className="inline-flex items-center gap-1 text-xs text-sky-light hover:text-white border border-sky/30 rounded-lg px-2.5 py-1 hover:bg-sky/10"
                    >
                      <RotateCcw size={13} /> Khôi phục
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
