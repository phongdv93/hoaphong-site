"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Trash2, UserPlus, Users, UserRoundPlus } from "lucide-react";
import { CompanyPortalLink } from "@/components/erp/CompanyPortalLink";
import { COMPANY_MEMBER_STATUS_LABELS, COMPANY_ROLE_LABELS } from "@/lib/projects/constants";
import { ERP_DEPARTMENTS, getDepartmentName } from "@/lib/erp/departments";
import { COMPANY_MODULES_CHANGED_EVENT } from "@/lib/erp/events";
import type { CompanyMember, CompanyMemberRole } from "@/lib/projects/types";
import { AppSelect } from "@/components/ui/AppSelect";

const ROLE_OPTIONS: CompanyMemberRole[] = ["admin", "manager", "member"];

type AddMode = "create" | "invite";

interface CreatedStaff {
  email: string;
  name: string;
  password?: string;
  role: CompanyMemberRole;
  emailSent?: boolean;
  loginUrl?: string;
}

type ActiveModule = { id: string; name: string };

export function HrEmployeesClient() {
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [myRole, setMyRole] = useState<CompanyMemberRole | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("create");
  const [created, setCreated] = useState<CreatedStaff | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [companySubdomain, setCompanySubdomain] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [activeModules, setActiveModules] = useState<ActiveModule[]>([]);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/hr/staff");
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Không tải được danh sách nhân sự");
      setMembers([]);
      return;
    }
    const data = await res.json();
    setCompanyId(data.companyId);
    setCurrentUserId(data.currentUserId ?? null);
    setMyRole(data.myRole);
    setIsPlatformAdmin(Boolean(data.isPlatformAdmin));
    setMembers(data.members ?? []);
    setPendingCount(data.pendingCount ?? 0);
    setCompanySubdomain(data.company?.subdomain ?? null);
    setCompanyName(data.company?.name ?? null);
    setActiveModules(data.activeModules ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isAdmin = myRole === "admin" || isPlatformAdmin;

  if (error && companyId === null) {
    return (
      <div className="erp-card border-amber-500/40 p-4 text-sm text-amber-100 space-y-2">
        <p>{error}</p>
        {error.includes("module") && (
          <p className="text-xs text-amber-200/80">
            Platform admin: bật module HR tại{" "}
            <Link href="/erp/platform/cong-ty" className="text-sky-light underline">
              Platform → Công ty → Module
            </Link>
            .
          </p>
        )}
        <Link href="/erp" className="inline-block text-sky-light underline text-sm">
          Chọn công ty
        </Link>
      </div>
    );
  }

  if (companyId === null) {
    return <div className="text-sm text-slate-400">Đang tải…</div>;
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {companySubdomain && (
        <CompanyPortalLink subdomain={companySubdomain} companyName={companyName ?? undefined} />
      )}

      {isAdmin && pendingCount > 0 && (
        <PendingApprovalsBlock
          members={members.filter((m) => m.status === "pending")}
          activeModules={activeModules}
          onDone={load}
        />
      )}

      {created && (
        <div className="erp-card border-emerald-500/40 p-4 text-sm space-y-2">
          <p className="font-medium text-emerald-200">
            {created.emailSent
              ? "Đã tạo nhân viên — mật khẩu đã gửi qua email"
              : created.password
              ? "Đã tạo nhân viên — sao chép mật khẩu bên dưới (email chưa gửi được)"
              : "Đã thêm nhân viên"}
          </p>
          <CredentialsBlock staff={created} />
          <button
            type="button"
            onClick={() => setCreated(null)}
            className="text-xs text-slate-400 hover:text-white underline"
          >
            Đóng
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="erp-card rounded-xl p-4 text-xs text-slate-400 space-y-1.5">
          <p className="font-medium text-slate-300">Cách cấp quyền cho nhân viên</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              <strong className="text-slate-300">Module ERP</strong> — bấm &quot;Sửa quyền&quot;,
              chọn module (Dự án, Kho, XNK…). Admin/QL công ty: toàn bộ module đã bật.
            </li>
            <li>
              <strong className="text-slate-300">Dự án cụ thể</strong> — sau khi bật module{" "}
              <em>Quản lý dự án</em>, mở <em>Quản lý dự án</em> → bấm tên dự án trên timeline →
              panel phải → tab <em>Thành viên</em> (icon người) → <em>Thêm thành viên</em>.
            </li>
            <li>
              Module khác (kho, marketing…) — chỉ cần bật module; quyền chi tiết theo vai trò công
              ty.
            </li>
          </ol>
        </div>
      )}

      <div className="erp-card rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="font-semibold text-white text-sm inline-flex items-center gap-2">
            <Users size={18} className="text-sky" />
            Nhân sự công ty ({members.length})
          </h2>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setAddOpen((o) => !o);
                setAddMode("create");
              }}
              className="inline-flex items-center gap-2 bg-sky text-white text-sm px-3 py-1.5 rounded-lg hover:bg-sky-light"
            >
              <UserRoundPlus size={14} /> Thêm nhân sự
            </button>
          )}
        </div>

        {addOpen && isAdmin && (
          <div className="mb-4 space-y-3">
            <div className="inline-flex rounded-lg border border-white/15 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setAddMode("create")}
                className={`px-3 py-1.5 ${
                  addMode === "create"
                    ? "bg-sky text-white"
                    : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                Tạo tài khoản mới
              </button>
              <button
                type="button"
                onClick={() => setAddMode("invite")}
                className={`px-3 py-1.5 ${
                  addMode === "invite"
                    ? "bg-sky text-white"
                    : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                Mời user có sẵn
              </button>
            </div>
            {addMode === "create" ? (
              <CreateStaffForm
                activeModules={activeModules}
                onDone={(staff) => {
                  setAddOpen(false);
                  setCreated(staff);
                  load();
                }}
                onCancel={() => setAddOpen(false)}
              />
            ) : (
              <InviteForm
                companyId={companyId}
                onDone={() => {
                  setAddOpen(false);
                  load();
                }}
                onCancel={() => setAddOpen(false)}
              />
            )}
          </div>
        )}

        <div className="border border-white/10 rounded overflow-hidden">
          <table className="w-full text-sm text-slate-200">
            <thead className="bg-white/5 text-xs text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium w-10" />
                <th className="px-3 py-2 text-left font-medium">Tên</th>
                <th className="px-3 py-2 text-left font-medium">Email đăng nhập</th>
                <th className="px-3 py-2 text-left font-medium">Phòng ban</th>
                <th className="px-3 py-2 text-left font-medium">Vai trò</th>
                <th className="px-3 py-2 text-left font-medium">Module</th>
                <th className="px-3 py-2 text-left font-medium">Trạng thái</th>
                <th className="px-3 py-2 text-left font-medium">Tham gia</th>
                {isAdmin && <th className="px-3 py-2 text-left font-medium w-32" />}
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="px-3 py-6 text-center text-slate-500">
                    Chưa có nhân sự — tạo tài khoản test ở trên.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.userId} className="border-t border-white/10">
                    <td className="px-2 py-2">
                      <MemberAvatar
                        userId={m.userId}
                        name={m.userName ?? ""}
                        avatarUrl={m.userAvatarUrl}
                        canEdit={isAdmin}
                        onUpdated={load}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">{m.userName}</td>
                    <td className="px-3 py-2 text-slate-400 text-xs font-mono">
                      {m.userEmail}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {m.departmentId ? getDepartmentName(m.departmentId) : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {COMPANY_ROLE_LABELS[m.role]}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400 max-w-[140px]">
                      {m.status !== "active" ? (
                        "—"
                      ) : m.role === "admin" || m.role === "manager" ? (
                        <span className="text-emerald-400/90">Tất cả module</span>
                      ) : (m.moduleIds?.length ?? 0) > 0 ? (
                        <span className="line-clamp-2" title={m.moduleIds?.join(", ")}>
                          {m.moduleIds!
                            .map((id) => activeModules.find((x) => x.id === id)?.name ?? id)
                            .join(", ")}
                        </span>
                      ) : (
                        <span className="text-amber-400">Chưa gán module</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={
                          m.status === "pending"
                            ? "text-amber-300"
                            : m.status === "rejected"
                            ? "text-rose-400"
                            : "text-emerald-400"
                        }
                      >
                        {COMPANY_MEMBER_STATUS_LABELS[m.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {new Date(m.joinedAt).toLocaleDateString("vi-VN")}
                    </td>
                    {isAdmin && (
                      <td className="px-3 py-2">
                        {m.status === "active" && (
                          <div className="flex flex-col gap-1">
                            <EditMemberButton
                              member={m}
                              activeModules={activeModules}
                              onSaved={load}
                            />
                            {currentUserId !== m.userId && (
                              <DeleteMemberButton member={m} onDeleted={load} />
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isAdmin && (
          <p className="text-xs text-slate-500 mt-3">
            Chỉ admin công ty mới tạo / mời nhân sự.
          </p>
        )}
      </div>
    </div>
  );
}

function MemberAvatar({
  userId,
  name,
  avatarUrl,
  canEdit,
  onUpdated,
}: {
  userId: number;
  name: string;
  avatarUrl?: string | null;
  canEdit: boolean;
  onUpdated: () => void;
}) {
  const initial = (name || "?").charAt(0).toUpperCase();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    fd.set("userId", String(userId));
    const res = await fetch("/api/hr/avatar", { method: "POST", body: fd });
    if (res.ok) onUpdated();
    e.target.value = "";
  }

  return (
    <label
      className={`relative block w-8 h-8 rounded-full overflow-hidden bg-white/10 shrink-0 ${
        canEdit ? "cursor-pointer hover:ring-2 hover:ring-sky/40" : ""
      }`}
      title={canEdit ? "Đổi ảnh đại diện" : name}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="flex items-center justify-center w-full h-full text-xs text-slate-300">
          {initial}
        </span>
      )}
      {canEdit && <input type="file" accept="image/*" className="sr-only" onChange={onFile} />}
    </label>
  );
}

function PendingApprovalsBlock({
  members,
  activeModules,
  onDone,
}: {
  members: CompanyMember[];
  activeModules: ActiveModule[];
  onDone: () => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [modulePick, setModulePick] = useState<Record<number, string[]>>({});

  function toggleModule(userId: number, moduleId: string) {
    setModulePick((prev) => {
      const cur = prev[userId] ?? activeModules.map((m) => m.id);
      const next = cur.includes(moduleId)
        ? cur.filter((x) => x !== moduleId)
        : [...cur, moduleId];
      return { ...prev, [userId]: next };
    });
  }

  async function approve(userId: number, role: CompanyMemberRole) {
    setBusyId(userId);
    const moduleIds =
      role === "member"
        ? modulePick[userId] ?? activeModules.map((m) => m.id)
        : undefined;
    const res = await fetch(`/api/hr/staff/${userId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, moduleIds }),
    });
    setBusyId(null);
    if (res.ok) onDone();
  }

  async function reject(userId: number) {
    if (!confirm("Từ chối hồ sơ đăng ký này?")) return;
    setBusyId(userId);
    const res = await fetch(`/api/hr/staff/${userId}/reject`, { method: "POST" });
    setBusyId(null);
    if (res.ok) onDone();
  }

  return (
    <div className="erp-card border-amber-500/35 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-amber-100">
        Chờ duyệt ({members.length})
      </h3>
      <ul className="space-y-2">
        {members.map((m) => (
          <li
            key={m.userId}
            className="flex flex-wrap items-center gap-2 justify-between bg-black/20 rounded-lg px-3 py-2 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-white truncate">{m.userName}</p>
              <p className="text-xs text-slate-400 font-mono truncate">{m.userEmail}</p>
              {m.departmentId && (
                <p className="text-[10px] text-slate-500">{getDepartmentName(m.departmentId)}</p>
              )}
              {activeModules.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {activeModules.map((mod) => {
                    const picked =
                      modulePick[m.userId] ?? activeModules.map((x) => x.id);
                    const on = picked.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className="inline-flex items-center gap-1 text-[10px] text-slate-400"
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleModule(m.userId, mod.id)}
                          className="rounded"
                        />
                        {mod.name}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 shrink-0">
              <button
                type="button"
                disabled={busyId === m.userId}
                onClick={() => approve(m.userId, "member")}
                className="text-xs bg-emerald-600/80 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-lg disabled:opacity-50"
              >
                Duyệt (NV)
              </button>
              <button
                type="button"
                disabled={busyId === m.userId}
                onClick={() => approve(m.userId, "manager")}
                className="text-xs bg-sky/80 hover:bg-sky text-white px-2.5 py-1 rounded-lg disabled:opacity-50"
              >
                Duyệt (QL)
              </button>
              <button
                type="button"
                disabled={busyId === m.userId}
                onClick={() => reject(m.userId)}
                className="text-xs border border-rose-500/40 text-rose-300 px-2.5 py-1 rounded-lg hover:bg-rose-500/10 disabled:opacity-50"
              >
                Từ chối
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CredentialsBlock({ staff }: { staff: CreatedStaff }) {
  const login = staff.loginUrl ?? `${typeof window !== "undefined" ? window.location.origin : ""}/erp/login`;
  const text = staff.password
    ? `Email: ${staff.email}\nMật khẩu: ${staff.password}\nĐăng nhập: ${login}`
    : `Email: ${staff.email}\nĐăng nhập: ${login}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  return (
    <div className="bg-black/25 rounded-lg p-3 font-mono text-xs text-slate-200 space-y-1">
      {staff.emailSent && (
        <p className="text-emerald-300/90 mb-2">Đã gửi mật khẩu qua email nhân viên.</p>
      )}
      {!staff.emailSent && staff.password && (
        <p className="text-amber-300/90 mb-2">
          Email chưa gửi được — hãy sao chép mật khẩu và gửi cho nhân viên thủ công.
        </p>
      )}
      <div>
        <span className="text-slate-500">Email: </span>
        {staff.email}
      </div>
      {staff.password && (
        <div>
          <span className="text-slate-500">Mật khẩu: </span>
          {staff.password}
        </div>
      )}
      <div>
        <span className="text-slate-500">Vai trò công ty: </span>
        {COMPANY_ROLE_LABELS[staff.role]}
      </div>
      {staff.password && (
        <button
          type="button"
          onClick={copy}
          className="mt-2 inline-flex items-center gap-1 text-sky-light hover:underline"
        >
          <Copy size={12} /> Sao chép thông tin đăng nhập
        </button>
      )}
    </div>
  );
}

function CreateStaffForm({
  activeModules,
  onDone,
  onCancel,
}: {
  activeModules: ActiveModule[];
  onDone: (staff: CreatedStaff) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<CompanyMemberRole>("member");
  const [moduleIds, setModuleIds] = useState<string[]>(() => activeModules.map((m) => m.id));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function genPassword() {
    const raw = `Hp${Math.random().toString(36).slice(2, 8)}!`;
    setPassword(raw);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/hr/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password: password || undefined,
        role,
        moduleIds: role === "member" ? moduleIds : undefined,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      const j = await res.json();
      onDone({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: j.password,
        role,
        emailSent: j.emailSent,
        loginUrl: j.loginUrl,
      });
      setName("");
      setEmail("");
      setPassword("");
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Tạo thất bại");
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-sky/10 border border-sky/30 rounded-lg p-4 space-y-3 text-sm"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Họ tên *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field py-1.5"
            placeholder="Nguyễn Văn A"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Email đăng nhập *</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field py-1.5"
            placeholder="nhanvien@test.vn"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Mật khẩu (trống = tự tạo + gửi email)
          </label>
          <div className="flex gap-1">
            <input
              type="text"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field py-1.5 flex-1 font-mono text-xs"
              placeholder="để trống → email"
            />
            <button
              type="button"
              onClick={genPassword}
              className="shrink-0 px-2 py-1.5 rounded-lg border border-white/20 text-xs text-slate-300 hover:bg-white/10"
            >
              Tạo ngẫu nhiên
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Vai trò trong công ty</label>
          <AppSelect
            value={role}
            onChange={(v) => setRole(v as CompanyMemberRole)}
            className="input-field py-1.5 w-full text-left flex items-center justify-between"
            options={ROLE_OPTIONS.map((r) => ({ value: r, label: COMPANY_ROLE_LABELS[r] }))}
          />
          <p className="text-[10px] text-slate-500 mt-1">
            Admin/QL: mọi module công ty. NV: chọn module bên dưới.
            Email đã thuộc công ty khác → chỉ thêm vào công ty này (dùng mật khẩu cũ).
          </p>
        </div>
      </div>
      {role === "member" && activeModules.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeModules.map((mod) => (
            <label key={mod.id} className="inline-flex items-center gap-1 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={moduleIds.includes(mod.id)}
                onChange={() =>
                  setModuleIds((ids) =>
                    ids.includes(mod.id) ? ids.filter((x) => x !== mod.id) : [...ids, mod.id]
                  )
                }
                className="rounded"
              />
              {mod.name}
            </label>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-sky text-white px-4 py-2 rounded-lg hover:bg-sky-light disabled:opacity-50 inline-flex items-center gap-1"
        >
          <UserPlus size={14} />
          {submitting ? "Đang tạo…" : "Tạo & thêm vào công ty"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-white/20 px-4 py-2 rounded-lg hover:bg-white/5 text-slate-300"
        >
          Hủy
        </button>
      </div>
      {error && <p className="text-rose-300 text-xs">{error}</p>}
    </form>
  );
}

function InviteForm({
  companyId,
  onDone,
  onCancel,
}: {
  companyId: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CompanyMemberRole>("member");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/companies/${companyId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    setSubmitting(false);
    if (res.ok) onDone();
    else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Thêm thất bại");
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white/5 border border-white/15 rounded-lg p-4 flex flex-wrap items-end gap-2 text-sm"
    >
      <div className="flex-1 min-w-[220px]">
        <label className="block text-xs text-slate-400 mb-1">Email user đã có *</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field w-full py-1.5"
          placeholder="user@example.com"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Vai trò</label>
        <AppSelect
          value={role}
          onChange={(v) => setRole(v as CompanyMemberRole)}
          className="input-field py-1.5 w-40 text-left flex items-center justify-between"
          options={ROLE_OPTIONS.map((r) => ({ value: r, label: COMPANY_ROLE_LABELS[r] }))}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-sky text-white px-3 py-1.5 rounded-lg hover:bg-sky-light disabled:opacity-50"
        >
          Mời
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-white/20 px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          Hủy
        </button>
      </div>
      {error && <p className="w-full text-rose-300 text-xs">{error}</p>}
    </form>
  );
}

function EditMemberButton({
  member,
  activeModules,
  onSaved,
}: {
  member: CompanyMember;
  activeModules: ActiveModule[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<CompanyMemberRole>(member.role);
  const [departmentId, setDepartmentId] = useState(member.departmentId ?? "");
  const [moduleIds, setModuleIds] = useState<string[]>(
    () => member.moduleIds ?? activeModules.map((m) => m.id)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setRole(member.role);
    setDepartmentId(member.departmentId ?? "");
    setModuleIds(member.moduleIds ?? activeModules.map((m) => m.id));
    setError("");
  }, [open, member, activeModules]);

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/hr/staff/${member.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        departmentId: departmentId || null,
        moduleIds: role === "member" ? moduleIds : [],
      }),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      window.dispatchEvent(new CustomEvent(COMPANY_MODULES_CHANGED_EVENT));
      onSaved();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Lưu thất bại");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-sky-light hover:underline"
      >
        Sửa quyền
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-[#0f1a33] border border-white/15 rounded-xl p-4 w-full max-w-md shadow-xl text-sm space-y-3">
        <p className="font-medium text-white">Quyền · {member.userName}</p>
        <p className="text-xs text-slate-500 font-mono">{member.userEmail}</p>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Vai trò công ty</label>
          <AppSelect
            value={role}
            onChange={(v) => setRole(v as CompanyMemberRole)}
            className="input-field py-1.5 w-full text-left flex items-center justify-between"
            options={ROLE_OPTIONS.map((r) => ({ value: r, label: COMPANY_ROLE_LABELS[r] }))}
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Phòng ban</label>
          <AppSelect
            value={departmentId}
            onChange={setDepartmentId}
            className="input-field py-1.5 w-full text-left flex items-center justify-between"
            options={[
              { value: "", label: "— Chưa gán —" },
              ...ERP_DEPARTMENTS.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
        </div>

        {role === "member" && activeModules.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Module được phép dùng</p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-auto">
              {activeModules.map((mod) => (
                <label key={mod.id} className="inline-flex items-center gap-1 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={moduleIds.includes(mod.id)}
                    onChange={() =>
                      setModuleIds((ids) =>
                        ids.includes(mod.id)
                          ? ids.filter((x) => x !== mod.id)
                          : [...ids, mod.id]
                      )
                    }
                    className="rounded"
                  />
                  {mod.name}
                </label>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Module <em>Quản lý dự án</em>: cần thêm nhân viên vào từng dự án (tab Thành viên).
            </p>
          </div>
        )}

        {role !== "member" && (
          <p className="text-xs text-emerald-400/90">
            Admin / Quản lý: truy cập mọi module công ty đã bật.
          </p>
        )}

        {error && <p className="text-rose-300 text-xs">{error}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="border border-white/20 px-3 py-1.5 rounded-lg hover:bg-white/5 text-slate-300"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="bg-sky text-white px-3 py-1.5 rounded-lg hover:bg-sky-light disabled:opacity-50"
          >
            {saving ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteMemberButton({
  member,
  onDeleted,
}: {
  member: CompanyMember;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    const ok = window.confirm(
      `Xóa ${member.userName ?? member.userEmail} khỏi công ty?\n\nTài khoản đăng nhập vẫn tồn tại — chỉ gỡ quyền tại công ty này.`
    );
    if (!ok) return;

    setBusy(true);
    setError("");
    const res = await fetch(`/api/hr/staff/${member.userId}`, { method: "DELETE" });
    setBusy(false);

    if (res.ok) {
      window.dispatchEvent(new CustomEvent(COMPANY_MODULES_CHANGED_EVENT));
      onDeleted();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Xóa thất bại");
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={remove}
        className="text-xs text-rose-300 hover:underline inline-flex items-center gap-1 disabled:opacity-50"
      >
        <Trash2 size={12} />
        {busy ? "Đang xóa…" : "Xóa"}
      </button>
      {error && <p className="text-[10px] text-rose-400 mt-0.5">{error}</p>}
    </div>
  );
}
