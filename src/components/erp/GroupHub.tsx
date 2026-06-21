import Link from "next/link";
import type { ErpModuleGroup } from "@/lib/erp/modules";
import { getDepartmentName } from "@/lib/erp/departments";
import { ErpShell } from "./ErpShell";

const STATUS = {
  active: "Đang dùng",
  beta: "Beta",
  planned: "Sắp có",
};

export function GroupHub({ group }: { group: ErpModuleGroup }) {
  return (
    <ErpShell title={group.title} groupId={group.id}>
      <p className="text-slate-400 mb-2 max-w-xl">{group.description}</p>
      {group.ownerDepartmentId && (
        <p className="text-xs text-slate-500 mb-6">
          Phòng chủ trì (gợi ý): {getDepartmentName(group.ownerDepartmentId)} — phân quyền sẽ cấu hình sau
        </p>
      )}
      {!group.ownerDepartmentId && <div className="mb-6" />}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {group.items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="erp-card-hover block"
          >
            <item.icon className="text-sky mb-3" size={24} />
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-semibold text-white text-sm">{item.title}</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-400">
                {STATUS[item.status]}
              </span>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
          </Link>
        ))}
      </div>
    </ErpShell>
  );
}
