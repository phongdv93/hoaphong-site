"use client";

import { useEffect, useState } from "react";
import { Plus, UserMinus } from "lucide-react";
import { MEMBER_ROLE_LABELS } from "@/lib/projects/constants";
import type {
  CompanyMember,
  Project,
  ProjectMember,
  ProjectMemberRole,
} from "@/lib/projects/types";
import { AppSelect } from "@/components/ui/AppSelect";

const ROLE_OPTIONS: ProjectMemberRole[] = ["owner", "manager", "member", "viewer"];

export function ProjectMembersTab({
  project,
  members,
  canEdit,
  onChanged,
}: {
  project: Project;
  members: ProjectMember[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [addingOpen, setAddingOpen] = useState(false);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [candidateRoleByUser, setCandidateRoleByUser] = useState<Record<number, ProjectMemberRole>>({});

  useEffect(() => {
    if (!addingOpen) return;
    fetch(`/api/companies/${project.companyId}/members`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setCompanyMembers);
  }, [addingOpen, project.companyId]);

  const existingIds = new Set(members.map((m) => m.userId));
  const candidates = companyMembers.filter(
    (c) => c.status === "active" && !existingIds.has(c.userId)
  );

  async function addMember(userId: number, role: ProjectMemberRole) {
    const res = await fetch(`/api/projects/${project.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (res.ok) {
      setAddingOpen(false);
      onChanged();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Thêm thất bại");
    }
  }

  async function changeRole(userId: number, role: ProjectMemberRole) {
    const res = await fetch(`/api/projects/${project.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (res.ok) onChanged();
  }

  async function removeMember(userId: number) {
    if (!confirm("Xóa thành viên này khỏi dự án?")) return;
    const res = await fetch(
      `/api/projects/${project.id}/members?userId=${userId}`,
      { method: "DELETE" }
    );
    if (res.ok) onChanged();
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={() => setAddingOpen(true)}
            className="inline-flex items-center gap-2 bg-sky text-white px-3 py-1.5 rounded-lg text-sm hover:bg-sky-light"
          >
            <Plus size={14} /> Thêm thành viên
          </button>
        </div>
      )}

      {addingOpen && (
        <div className="bg-sky/10 border border-sky/30 rounded-lg p-3 space-y-2">
          <div className="text-xs text-slate-200/70">
            Chọn từ thành viên công ty (đã thuộc{" "}
            <span className="font-medium">không gian công ty</span>):
          </div>
          {candidates.length === 0 ? (
            <div className="text-sm text-slate-200/60">
              Không còn ai khả dụng. Hãy mời user vào công ty trước (trang Công ty).
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {candidates.map((c) => (
                <div
                  key={c.userId}
                  className="erp-card rounded p-2 flex items-center gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{c.userName}</div>
                    <div className="text-[11px] text-slate-200/50 truncate">{c.userEmail}</div>
                  </div>
                  <AppSelect
                    value={candidateRoleByUser[c.userId] ?? "member"}
                    onChange={(v) =>
                      setCandidateRoleByUser((prev) => ({
                        ...prev,
                        [c.userId]: v as ProjectMemberRole,
                      }))
                    }
                    size="sm"
                    className="w-36"
                    options={ROLE_OPTIONS.map((r) => ({ value: r, label: MEMBER_ROLE_LABELS[r] }))}
                  />
                  <button
                    onClick={() => {
                      addMember(c.userId, candidateRoleByUser[c.userId] ?? "member");
                    }}
                    className="bg-sky text-white text-xs px-2 py-1 rounded hover:bg-sky-light"
                  >
                    Thêm
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="text-right">
            <button
              onClick={() => setAddingOpen(false)}
              className="text-xs text-slate-200/60 hover:underline"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      <div className="erp-card rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="erp-table-head text-xs">
            <tr>
              <Th>Tên</Th>
              <Th>Email</Th>
              <Th>Vai trò</Th>
              <Th>Tham gia</Th>
              {canEdit && <Th>&nbsp;</Th>}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr>
                <td
                  colSpan={canEdit ? 5 : 4}
                  className="px-4 py-6 text-center text-slate-200/60"
                >
                  Chưa có thành viên nào.
                </td>
              </tr>
            )}
            {members.map((m) => (
              <tr key={m.userId} className="erp-table-row">
                <td className="px-3 py-2 font-medium">{m.userName}</td>
                <td className="px-3 py-2 text-slate-200/70 text-xs">{m.userEmail}</td>
                <td className="px-3 py-2">
                  {canEdit ? (
                    <AppSelect
                      value={m.role}
                      onChange={(v) => changeRole(m.userId, v as ProjectMemberRole)}
                      size="sm"
                      className="w-36"
                      options={ROLE_OPTIONS.map((r) => ({ value: r, label: MEMBER_ROLE_LABELS[r] }))}
                    />
                  ) : (
                    <span className="text-xs">{MEMBER_ROLE_LABELS[m.role]}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-slate-200/60">
                  {new Date(m.joinedAt).toLocaleDateString("vi-VN")}
                </td>
                {canEdit && (
                  <td className="px-3 py-2 text-right">
                    {m.role !== "owner" && (
                      <button
                        onClick={() => removeMember(m.userId)}
                        className="text-rose-500 hover:text-rose-700"
                        title="Xóa khỏi dự án"
                      >
                        <UserMinus size={14} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium">{children}</th>;
}
