"use client";

import { useEffect, useState } from "react";
import type { ContactRequest } from "@/lib/types";
import { AppSelect } from "@/components/ui/AppSelect";

export function ContactsManager() {
  const [contacts, setContacts] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/contacts");
    setContacts(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: number, status: string) {
    await fetch("/api/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  if (loading) return <p className="text-gray-500">Đang tải...</p>;

  return (
    <div className="space-y-4">
      {contacts.length === 0 ? (
        <p className="text-gray-500">Chưa có yêu cầu nào.</p>
      ) : (
        contacts.map((c) => (
          <article key={c.id} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex flex-wrap justify-between gap-2 mb-3">
              <div>
                <h3 className="font-semibold text-midnight">{c.name}</h3>
                <p className="text-sm text-gray-500">
                  {c.email} {c.phone && `• ${c.phone}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    c.status === "new"
                      ? "bg-emerald/10 text-emerald"
                      : c.status === "read"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {c.status === "new" ? "Mới" : c.status === "read" ? "Đã đọc" : "Đã phản hồi"}
                </span>
                <AppSelect
                  variant="light"
                  size="sm"
                  value={c.status}
                  onChange={(v) => updateStatus(c.id, v)}
                  className="w-32"
                  options={[
                    { value: "new", label: "Mới" },
                    { value: "read", label: "Đã đọc" },
                    { value: "replied", label: "Đã phản hồi" },
                  ]}
                />
              </div>
            </div>
            {c.subject && <p className="text-sm font-medium text-midnight mb-1">Chủ đề: {c.subject}</p>}
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.message}</p>
            <p className="text-xs text-gray-400 mt-3">
              {new Date(c.createdAt).toLocaleString("vi-VN")}
            </p>
          </article>
        ))
      )}
    </div>
  );
}
