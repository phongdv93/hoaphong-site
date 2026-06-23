"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserMinus, UserPlus, Building2, Puzzle } from "lucide-react";
import { platformCompanyUrl } from "@/lib/platform/paths";
import {
  COMPANY_ROLE_LABELS,
  COMPANY_STATUS_LABELS,
} from "@/lib/projects/constants";
import type {
  Company,
  CompanyMember,
  CompanyMemberRole,
} from "@/lib/projects/types";
import { companyPublicCode } from "@/lib/projects/company-code";
import { AppSelect } from "@/components/ui/AppSelect";

const ROLE_OPTIONS: CompanyMemberRole[] = ["admin", "manager", "member"];

export function CompanyDetailClient({ companyId }: { companyId: number }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [myRole, setMyRole] = useState<CompanyMemberRole | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [platformAdmin, setPlatformAdmin] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const [cRes, mRes] = await Promise.all([
      fetch(`/api/companies/${companyId}`),
      fetch(`/api/companies/${companyId}/members`),
    ]);
    if (!cRes.ok) {
      const j = await cRes.json().catch(() => ({}));
      setError(j.error || "Không tải được công ty");
      return;
    }
    const cData = await cRes.json();
    setCompany(cData.company);
    setMyRole(cData.myRole);
    if (mRes.ok) setMembers(await mRes.json());
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/platform/my-access")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.isPlatformAdmin) setPlatformAdmin(true);
      })
      .catch(() => {});
  }, []);

  if (error) {
    return (
      <div className="erp-card border-amber-500/40 text-amber-100 rounded p-4 text-sm">
        {error}
        <Link href="/erp/cong-ty" className="block mt-2 underline">
          Về danh sách
        </Link>
      </div>
    );
  }
  if (!company) return <div className="text-sm text-slate-200/60">Đang tải…</div>;

  const isAdmin = myRole === "admin";

  async function changeRole(userId: number, role: CompanyMemberRole) {
    const res = await fetch(`/api/companies/${companyId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (res.ok) load();
  }

  async function removeMember(userId: number) {
    if (!confirm("Xóa thành viên này khỏi công ty?")) return;
    const res = await fetch(
      `/api/companies/${companyId}/members?userId=${userId}`,
      { method: "DELETE" }
    );
    if (res.ok) load();
    else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Xóa thất bại");
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="erp-card rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Link href="/erp/cong-ty" className="text-slate-200/50 hover:text-slate-200 mt-1">
            <ArrowLeft size={18} />
          </Link>
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logoUrl}
              alt=""
              className="w-12 h-12 rounded object-contain border border-navy/10"
            />
          ) : (
            <div className="w-12 h-12 rounded bg-white/10 flex items-center justify-center text-sky-light">
              <Building2 size={24} />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-200">{company.name}</h2>
            <div className="text-xs text-slate-200/60 font-mono tabular-nums">
              MST {companyPublicCode(company)} · {COMPANY_STATUS_LABELS[company.status]}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs px-2 py-1 rounded bg-white/10 text-slate-300">
              {myRole && COMPANY_ROLE_LABELS[myRole]}
            </span>
            {platformAdmin && (
              <Link
                href={platformCompanyUrl(companyId)}
                className="text-xs inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-500/25"
              >
                <Puzzle size={12} /> Quản lý gói module ERP
              </Link>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mt-5">
          {company.taxCode && <Field label="Mã số thuế" value={company.taxCode} />}
          {company.phone && <Field label="Điện thoại" value={company.phone} />}
          {company.email && <Field label="Email" value={company.email} />}
          {company.address && (
            <div className="col-span-2">
              <Field label="Địa chỉ" value={company.address} />
            </div>
          )}
          {company.notes && (
            <div className="col-span-2">
              <Field
                label="Ghi chú"
                value={<div className="whitespace-pre-wrap">{company.notes}</div>}
              />
            </div>
          )}
        </dl>
      </div>

      <div className="erp-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-200/80 text-sm">
            Thành viên công ty ({members.length})
          </h3>
          {isAdmin && (
            <button
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-2 bg-sky text-white text-sm px-3 py-1.5 rounded-lg hover:bg-sky-light"
            >
              <UserPlus size={14} /> Mời thành viên
            </button>
          )}
        </div>

        {inviteOpen && (
          <InviteForm
            companyId={companyId}
            onDone={() => {
              setInviteOpen(false);
              load();
            }}
            onCancel={() => setInviteOpen(false)}
          />
        )}

        <div className="border border-navy/10 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-navy/5 text-xs text-slate-200/70">
              <tr>
                <Th>Tên</Th>
                <Th>Email</Th>
                <Th>Vai trò</Th>
                <Th>Tham gia</Th>
                {isAdmin && <Th>&nbsp;</Th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.userId} className="border-t border-navy/5">
                  <td className="px-3 py-2 font-medium">{m.userName}</td>
                  <td className="px-3 py-2 text-slate-200/70 text-xs">{m.userEmail}</td>
                  <td className="px-3 py-2">
                    {isAdmin ? (
                      <AppSelect
                        value={m.role}
                        onChange={(v) => changeRole(m.userId, v as CompanyMemberRole)}
                        className="text-xs erp-card rounded px-2 py-1 w-36 text-left flex items-center justify-between"
                        options={ROLE_OPTIONS.map((r) => ({
                          value: r,
                          label: COMPANY_ROLE_LABELS[r],
                        }))}
                      />
                    ) : (
                      <span className="text-xs">{COMPANY_ROLE_LABELS[m.role]}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-200/60">
                    {new Date(m.joinedAt).toLocaleDateString("vi-VN")}
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => removeMember(m.userId)}
                        className="text-rose-500 hover:text-rose-700"
                        title="Xóa khỏi công ty"
                      >
                        <UserMinus size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium">{children}</th>;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-200/50">{label}</dt>
      <dd className="text-sm text-slate-200">{value}</dd>
    </div>
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
      setError(j.error || "Mời thất bại");
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-sky/10 border border-sky/30 rounded-lg p-3 mb-3 flex flex-wrap items-end gap-2 text-sm"
    >
      <div className="flex-1 min-w-[220px]">
        <label className="block text-xs text-slate-200/60 mb-1">Email của user *</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field py-1.5"
          placeholder="user@example.com"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-200/60 mb-1">Vai trò</label>
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
          className="border border-white/20 px-3 py-1.5 rounded-lg hover:bg-white/10 text-slate-300"
        >
          Hủy
        </button>
      </div>
      {error && (
        <div className="w-full text-rose-600 text-xs mt-1">
          {error}{" "}
          <span className="text-slate-200/60">
            (User phải đã có tài khoản ERP — đăng ký trước qua trang admin/users)
          </span>
        </div>
      )}
    </form>
  );
}
