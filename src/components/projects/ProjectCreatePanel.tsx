"use client";

import { X } from "lucide-react";
import type { Customer } from "@/lib/marketing/customer-types";
import { ProjectCreateWizard } from "./ProjectCreateWizard";
import { PROJECT_PANEL_W } from "./ProjectTaskPanel";

export function ProjectCreatePanel({
  customers,
  onCreated,
  onClose,
}: {
  customers: Customer[];
  onCreated: (projectId: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="flex flex-col h-full min-h-0 w-full overflow-hidden border-l border-white/10"
      style={{ width: PROJECT_PANEL_W, background: "#0a1120" }}
    >
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white">Tạo dự án mới</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"
          title="Đóng"
        >
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <ProjectCreateWizard
          customers={customers}
          onCreated={onCreated}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
