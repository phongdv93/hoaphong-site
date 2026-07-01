"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PurchaseOrdersWorkspace } from "@/components/purchase-orders/PurchaseOrdersWorkspace";
import type { ProjectItem } from "@/lib/projects/types";

export function ProjectPurchaseOrdersPageClient({ projectId }: { projectId: number }) {
  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [items, setItems] = useState<ProjectItem[]>([]);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/workspace`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j) return;
        setProjectName(j.project?.name ?? "");
        setProjectCode(j.project?.code ?? "");
        setItems(Array.isArray(j.items) ? j.items : []);
      })
      .catch(() => undefined);
  }, [projectId]);

  const base = `/api/projects/${projectId}/purchase-orders`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/erp/du-an?p=${projectId}`}
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft size={14} />
          Về dự án
        </Link>
        {(projectCode || projectName) && (
          <span className="text-xs text-slate-500">
            {projectCode ? `${projectCode} · ` : ""}
            {projectName}
          </span>
        )}
      </div>
      <PurchaseOrdersWorkspace
        listUrl={base}
        detailUrlPrefix={base}
        projectId={projectId}
        projectItems={items}
        canEdit
        hint="Mỗi đơn một NCC từ danh mục. «Đề xuất đơn» tách hạng mục dự án theo NCC trên sản phẩm."
      />
    </div>
  );
}
