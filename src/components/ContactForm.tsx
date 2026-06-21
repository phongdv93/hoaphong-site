"use client";

import { useState } from "react";
import { Send, CheckCircle, AlertCircle } from "lucide-react";

export function ContactForm({ dark = true }: { dark?: boolean }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const inputClass = dark ? "input-field-dark" : "input-field";
  const labelClass = dark ? "text-white/80" : "text-midnight/80";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gửi thất bại");
      setStatus("success");
      setMessage("Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm nhất.");
      form.reset();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Đã xảy ra lỗi. Vui lòng thử lại.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Họ và tên *" name="name" required placeholder="Nguyễn Văn A" inputClass={inputClass} labelClass={labelClass} />
        <Field label="Email *" name="email" type="email" required placeholder="email@congty.vn" inputClass={inputClass} labelClass={labelClass} />
        <Field label="Số điện thoại" name="phone" placeholder="0901 234 567" inputClass={inputClass} labelClass={labelClass} />
        <Field label="Chủ đề" name="subject" placeholder="Tư vấn dịch vụ..." inputClass={inputClass} labelClass={labelClass} />
      </div>

      <div>
        <label className={`block text-sm font-medium mb-1.5 ${labelClass}`}>Nội dung *</label>
        <textarea
          name="message"
          required
          rows={5}
          placeholder="Mô tả nhu cầu của bạn..."
          className={`${inputClass} resize-none`}
        />
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 p-4 rounded-xl text-sm ${
            status === "success"
              ? dark
                ? "bg-sky/15 text-sky-light border border-sky/25"
                : "bg-emerald/10 text-emerald"
              : dark
                ? "bg-red-500/10 text-red-300 border border-red-500/20"
                : "bg-red-50 text-red-600"
          }`}
        >
          {status === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message}
        </div>
      )}

      <button type="submit" disabled={status === "loading"} className="btn-primary w-full md:w-auto disabled:opacity-60">
        <Send size={18} />
        {status === "loading" ? "Đang gửi..." : "Gửi yêu cầu"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  inputClass,
  labelClass,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  inputClass: string;
  labelClass: string;
}) {
  return (
    <div>
      <label className={`block text-sm font-medium mb-1.5 ${labelClass}`}>{label}</label>
      <input name={name} type={type} required={required} placeholder={placeholder} className={inputClass} />
    </div>
  );
}
