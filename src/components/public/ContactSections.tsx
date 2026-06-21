"use client";

import { useState } from "react";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { FilterChips } from "./FilterChips";

const CONTACT_FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "form", label: "Gửi yêu cầu" },
  { id: "info", label: "Thông tin" },
] as const;

export function ContactSections({
  address,
  phone,
  email,
}: {
  address: string;
  phone: string;
  email: string;
}) {
  const [filter, setFilter] = useState<string>("all");

  const showInfo = filter === "all" || filter === "info";
  const showForm = filter === "all" || filter === "form";

  const items = [
    { icon: MapPin, label: "Địa chỉ", value: address },
    { icon: Phone, label: "Hotline", value: phone, href: `tel:${phone}` },
    { icon: Mail, label: "Email", value: email, href: `mailto:${email}` },
    { icon: Clock, label: "Giờ làm việc", value: "Tứ 2 – Tứ 6: 8:00 – 17:30" },
  ];

  return (
    <div className="space-y-4">
      <FilterChips options={[...CONTACT_FILTERS]} value={filter} onChange={setFilter} />

      <div className={`grid gap-3 ${showInfo && showForm ? "lg:grid-cols-12" : ""}`}>
        {showInfo && (
          <div className={`grid sm:grid-cols-2 gap-2 ${showForm ? "lg:col-span-5" : "lg:col-span-12"}`}>
            {items.map((item) => (
              <div key={item.label} className="public-card-compact flex gap-2.5 !p-3">
                <div className="w-8 h-8 rounded-lg bg-sky/15 flex items-center justify-center shrink-0">
                  <item.icon size={16} className="text-sky-light" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-muted uppercase tracking-wider">{item.label}</p>
                  {item.href ? (
                    <a href={item.href} className="text-xs text-white font-medium hover:text-sky-light transition-colors break-all">
                      {item.value}
                    </a>
                  ) : (
                    <p className="text-xs text-white font-medium">{item.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className={`public-card-compact ${showInfo ? "lg:col-span-7" : ""}`}>
            <p className="text-[11px] text-slate-muted mb-3">Phản hồi trong vòng 24 giờ làm việc.</p>
            <ContactForm dark />
          </div>
        )}
      </div>
    </div>
  );
}
