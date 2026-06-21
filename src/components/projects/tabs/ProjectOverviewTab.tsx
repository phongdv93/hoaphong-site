"use client";

import type {
  Project,
  ProjectMember,
  ProjectPhase,
} from "@/lib/projects/types";
import { formatDateVi } from "@/lib/dates";

export function ProjectOverviewTab({
  project,
  phases,
  members,
}: {
  project: Project;
  phases: ProjectPhase[];
  members: ProjectMember[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const totalPhase = phases.length;
  const donePhase = phases.filter((p) => p.status === "done").length;
  const inProgressPhase = phases.filter((p) => p.status === "in_progress").length;
  const delayedPhase = phases.filter((p) => p.status === "delayed").length;
  const progress = totalPhase > 0 ? Math.round((donePhase / totalPhase) * 100) : 0;

  const upcoming = phases
    .filter((p) => p.deadlineAt && p.status !== "done")
    .sort((a, b) => (a.deadlineAt! < b.deadlineAt! ? -1 : 1))
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card title="Thông tin chung">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Field label="Mã dự án" value={<span className="font-mono">{project.code}</span>} />
            <Field
              label="Giá hợp đồng"
              value={
                project.contractValue
                  ? `${new Intl.NumberFormat("vi-VN").format(project.contractValue)} ₫`
                  : "—"
              }
            />
            <Field label="Ngày ký HĐ" value={fmt(project.contractSignedAt)} />
            <Field label="Khởi công" value={fmt(project.startDate)} />
            <Field label="Dự kiến HT" value={fmt(project.expectedEndDate)} />
            <Field label="Hoàn thành thực" value={fmt(project.actualEndDate)} />
            <Field
              label="Khách hàng"
              value={project.customerName || <span className="text-slate-200/40">—</span>}
            />
            <Field
              label="Quản lý DA"
              value={project.managerName || <span className="text-slate-200/40">—</span>}
            />
            <div className="col-span-2">
              <Field label="Địa chỉ" value={project.address || "—"} />
            </div>
            {project.notes && (
              <div className="col-span-2">
                <Field
                  label="Ghi chú"
                  value={<div className="whitespace-pre-wrap">{project.notes}</div>}
                />
              </div>
            )}
          </dl>
        </Card>

        <Card title="Deadline sắp tới">
          {upcoming.length === 0 ? (
            <div className="text-sm text-slate-200/60">Không có deadline nào sắp tới.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcoming.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    {p.assigneeName && (
                      <div className="text-xs text-slate-200/60">{p.assigneeName}</div>
                    )}
                  </div>
                  <div className="text-xs tabular-nums text-slate-200/80 whitespace-nowrap">
                    {fmt(p.deadlineAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <Card title="Tiến độ">
          <div className="flex items-end gap-3 mb-3">
            <div className="text-3xl font-semibold tabular-nums text-white">{progress}%</div>
            <div className="text-xs text-slate-200/60 mb-1.5">
              {donePhase}/{totalPhase} công đoạn xong
            </div>
          </div>
          <div className="h-2 bg-white/10 rounded overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-xs text-center">
            <Stat label="Đang làm" value={inProgressPhase} tone="bg-amber-500/20 text-amber-200" />
            <Stat label="Trễ" value={delayedPhase} tone="bg-rose-500/20 text-rose-200" />
            <Stat label="Xong" value={donePhase} tone="bg-emerald-500/20 text-emerald-200" />
          </div>
        </Card>

        <Card title="Đội ngũ">
          <div className="text-2xl font-semibold text-white">{members.length}</div>
          <div className="text-xs text-slate-200/60">thành viên</div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="erp-card rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-200/80 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-200/50">{label}</dt>
      <dd className="text-sm text-slate-200">{value}</dd>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded p-2 ${tone}`}>
      <div className="text-lg font-semibold">{value}</div>
      <div>{label}</div>
    </div>
  );
}

function fmt(iso: string | null): string {
  return formatDateVi(iso);
}
