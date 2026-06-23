"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { companyWorkspacePath } from "@/lib/projects/company-code";
import type { CompanySummary } from "@/lib/projects/types";

export function CompanyCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          shortName,
          taxCode,
          phone,
          email,
          address,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra");
        return;
      }
      // Tự chuyển công ty mới thành active
      await fetch("/api/companies/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: data.id }),
      });
      // Lấy code công ty vừa tạo để chuyển vào workspace
      const myList = await fetch("/api/companies").then((r) => r.json());
      const created = Array.isArray(myList)
        ? (myList as CompanySummary[]).find((c) => c.id === data.id)
        : null;
      router.push(created ? companyWorkspacePath(created) : "/erp");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi mạng");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="erp-card rounded-xl p-6 max-w-2xl space-y-4">
      <Row label="Tên công ty *">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          placeholder="VD: Công ty TNHH Xây dựng ABC"
        />
      </Row>
      <Row label="Tên rút gọn">
        <input
          value={shortName}
          onChange={(e) => setShortName(e.target.value)}
          className="input"
          placeholder="VD: ABC"
        />
      </Row>
      <div className="grid grid-cols-2 gap-4">
        <Row label="Mã số thuế">
          <input value={taxCode} onChange={(e) => setTaxCode(e.target.value)} className="input" />
        </Row>
        <Row label="Điện thoại">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
        </Row>
      </div>
      <Row label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
      </Row>
      <Row label="Địa chỉ">
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          className="input"
        />
      </Row>
      <Row label="Ghi chú">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="input"
        />
      </Row>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg border border-white/20 text-sm text-slate-300 hover:bg-white/10"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="bg-sky text-white px-5 py-2 rounded-lg text-sm hover:bg-sky-light disabled:opacity-50"
        >
          {submitting ? "Đang tạo…" : "Tạo công ty"}
        </button>
      </div>
      <style jsx>{`
        :global(.input) {
          width: 100%;
          border: 1px solid rgba(15, 23, 42, 0.15);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          background: white;
          outline: none;
          transition: border-color 0.15s;
        }
        :global(.input:focus) {
          border-color: rgba(15, 23, 42, 0.45);
        }
      `}</style>
    </form>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-300/70 mb-1">{label}</span>
      {children}
    </label>
  );
}
