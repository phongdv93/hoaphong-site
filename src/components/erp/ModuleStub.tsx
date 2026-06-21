import Link from "next/link";
import type { ErpModuleItem } from "@/lib/erp/modules";
import { ErpShell } from "./ErpShell";
import { ArrowLeft, Construction } from "lucide-react";

const STATUS_LABEL = {
  active: { text: "Đang dùng", className: "bg-emerald-500/20 text-emerald-200" },
  beta: { text: "Beta", className: "bg-sky/20 text-sky-light" },
  planned: { text: "Sắp triển khai", className: "bg-white/10 text-slate-400" },
};

export function ModuleStub({
  module,
  groupId,
  groupTitle,
  groupHref,
}: {
  module: ErpModuleItem;
  groupId: string;
  groupTitle: string;
  groupHref: string;
}) {
  const st = STATUS_LABEL[module.status];

  return (
    <ErpShell title={module.title} groupId={groupId}>
      <Link href={groupHref} className="inline-flex items-center gap-1 text-sm text-sky mb-6 hover:underline">
        <ArrowLeft size={16} /> {groupTitle}
      </Link>

      <div className="max-w-2xl erp-card p-8">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-white/5">
            <Construction className="text-slate-400" size={32} />
          </div>
          <div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.className}`}>{st.text}</span>
            <h2 className="text-xl font-bold text-white mt-2">{module.title}</h2>
            <p className="text-slate-400 mt-1">{module.description}</p>
          </div>
        </div>

        {module.plannedFeatures && module.plannedFeatures.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-white mb-3">Chức năng dự kiến</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              {module.plannedFeatures.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-sky">•</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {module.status === "active" && (
          <Link href={module.href} className="btn-primary inline-block mt-8 text-sm">
            Mở module
          </Link>
        )}
      </div>
    </ErpShell>
  );
}
