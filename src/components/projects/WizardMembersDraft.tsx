"use client";

import { useEffect, useState } from "react";
import { Plus, UserMinus } from "lucide-react";
import { MEMBER_ROLE_LABELS } from "@/lib/projects/constants";
import type { CompanyMember, ProjectMemberRole } from "@/lib/projects/types";
import type { WizardDraftMember } from "@/lib/projects/wizard-draft";
import { AppSelect } from "@/components/ui/AppSelect";

const ROLE_OPTIONS: ProjectMemberRole[] = ["owner", "manager", "member", "viewer"];

export function WizardMembersDraft({
  companyId,
  members,
  onChange,
}: {
  companyId: number | null;
  members: WizardDraftMember[];
  onChange: (members: WizardDraftMember[]) => void;
}) {
  const [addingOpen, setAddingOpen] = useState(false);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [candidateRoleByUser, setCandidateRoleByUser] = useState<
    Record<number, ProjectMemberRole>
  >({});

  useEffect(() => {
    if (!addingOpen || !companyId) return;
    fetch(`/api/companies/${companyId}/members`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setCompanyMembers);
  }, [addingOpen, companyId]);

  const existingIds = new Set(members.map((m) => m.userId));
  const candidates = companyMembers.filter(
    (c) => c.status === "active" && !existingIds.has(c.userId)
  );

  function addMember(userId: number, userName: string, role: ProjectMemberRole) {
    onChange([...members, { userId, userName, role }]);
    setAddingOpen(false);
  }

  function changeRole(userId: number, role: ProjectMemberRole) {
    onChange(members.map((m) => (m.userId === userId ? { ...m, role } : m)));
  }

  function removeMember(userId: number) {
    onChange(members.filter((m) => m.userId !== userId));
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setAddingOpen(true)}
          disabled={!companyId}
          className="inline-flex items-center gap-2 bg-sky text-white px-3 py-1.5 rounded-lg text-sm hover:bg-sky-light disabled:opacity-50"
        >
          <Plus size={14} /> Thêm thành viên
        </button>
      </div>

      {addingOpen && (
        <div className="bg-sky/10 border border-sky/30 rounded-lg p-3 space-y-2">
          {candidates.length === 0 ? (
            <div className="text-sm text-slate-200/60">
              Không còn ai khả dụng. Hãy mời user vào công ty trước (trang Công ty).
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {candidates.map((c) => {
                const role = candidateRoleByUser[c.userId] ?? "member";
                return (
                  <div
                    key={c.userId}
                    className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5"
                  >
                    <div className="flex-1 min-w-0 text-sm truncate">
                      {c.userName || c.userEmail}
                    </div>
                    <AppSelect
                      value={role}
                      onChange={(v) =>
                        setCandidateRoleByUser((prev) => ({
                          ...prev,
                          [c.userId]: v as ProjectMemberRole,
                        }))
                      }
                      options={ROLE_OPTIONS.map((r) => ({
                        value: r,
                        label: MEMBER_ROLE_LABELS[r],
                      }))}
                      className="w-28 shrink-0"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        addMember(c.userId, c.userName || c.userEmail || `#${c.userId}`, role)
                      }
                      className="text-xs text-sky-light hover:text-white shrink-0"
                    >
                      Thêm
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={() => setAddingOpen(false)}
            className="text-xs text-slate-400 hover:text-white"
          >
            Đóng
          </button>
        </div>
      )}

      {members.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center border border-dashed border-white/10 rounded-lg">
          Chưa chọn thành viên — có thể bỏ qua và thêm sau.
        </p>
      ) : (
        <ul className="divide-y divide-white/10 rounded-lg border border-white/10 overflow-hidden">
          {members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center gap-2 px-3 py-2 bg-white/[0.02]"
            >
              <span className="flex-1 min-w-0 text-sm text-white truncate">{m.userName}</span>
              <AppSelect
                value={m.role}
                onChange={(v) => changeRole(m.userId, v as ProjectMemberRole)}
                options={ROLE_OPTIONS.map((r) => ({
                  value: r,
                  label: MEMBER_ROLE_LABELS[r],
                }))}
                className="w-28 shrink-0"
              />
              <button
                type="button"
                onClick={() => removeMember(m.userId)}
                className="p-1 text-slate-500 hover:text-rose-400"
                title="Bỏ"
              >
                <UserMinus size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
