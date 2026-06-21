"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FolderKanban, Users, ListChecks, ChartBar } from "lucide-react";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONES,
} from "@/lib/projects/constants";
import type {
  Project,
  ProjectMember,
  ProjectMemberRole,
  ProjectPhase,
} from "@/lib/projects/types";
import { ProjectOverviewTab } from "./tabs/ProjectOverviewTab";
import { ProjectPhasesTab } from "./tabs/ProjectPhasesTab";
import { ProjectMembersTab } from "./tabs/ProjectMembersTab";

type Tab = "tong-quan" | "cong-doan" | "nhan-su";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "tong-quan", label: "Tổng quan", icon: ChartBar },
  { id: "cong-doan", label: "Công đoạn", icon: ListChecks },
  { id: "nhan-su", label: "Thành viên", icon: Users },
];

export function ProjectDetailClient({ projectId }: { projectId: number }) {
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [myRole, setMyRole] = useState<ProjectMemberRole | null>(null);
  const [tab, setTab] = useState<Tab>("tong-quan");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErrorBanner(null);
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErrorBanner(j.error || "Không tải được dự án");
      setProject(null);
      return;
    }
    const data = await res.json();
    setProject(data.project);
    setPhases(data.phases);
    setMembers(data.members);
    setMyRole(data.myRole);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  if (errorBanner) {
    return (
      <div className="bg-amber-500/15 border border-amber-500/40 text-amber-100 rounded p-4 text-sm space-y-2">
        <div>{errorBanner}</div>
        <Link href="/erp/du-an" className="inline-flex items-center gap-1 underline">
          <ArrowLeft size={14} /> Về danh sách
        </Link>
      </div>
    );
  }
  if (!project) return <div className="text-sm text-slate-200/60">Đang tải…</div>;

  const canEdit = myRole === "owner" || myRole === "manager";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="erp-card rounded-xl p-5">
        <div className="flex items-start gap-4">
          <Link
            href="/erp/du-an"
            className="text-slate-200/50 hover:text-slate-200 mt-1 shrink-0"
            title="Về danh sách"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-200/60 font-mono">
              <FolderKanban size={14} /> {project.code}
            </div>
            <h2 className="text-xl font-semibold text-slate-200">{project.name}</h2>
            {project.customerName && (
              <div className="text-sm text-slate-200/70 mt-0.5">
                Khách hàng: <span className="font-medium">{project.customerName}</span>
              </div>
            )}
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded ${PROJECT_STATUS_TONES[project.status]}`}
          >
            {PROJECT_STATUS_LABELS[project.status]}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-white/10">
        {TABS.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px flex items-center gap-1.5 ${
                active
                  ? "border-sky text-sky-light font-medium"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      {tab === "tong-quan" && (
        <ProjectOverviewTab
          project={project}
          phases={phases}
          members={members}
          canEdit={canEdit}
          onChanged={load}
        />
      )}
      {tab === "cong-doan" && (
        <ProjectPhasesTab
          project={project}
          phases={phases}
          members={members}
          canEdit={canEdit}
          onChanged={load}
        />
      )}
      {tab === "nhan-su" && (
        <ProjectMembersTab
          project={project}
          members={members}
          canEdit={canEdit}
          onChanged={load}
        />
      )}
    </div>
  );
}
