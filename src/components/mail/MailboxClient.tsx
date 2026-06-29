"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Inbox,
  Loader2,
  Mail,
  PenSquare,
  RefreshCw,
  Reply,
  Send,
  X,
} from "lucide-react";
import { formatDateVi } from "@/lib/dates";

interface MailStatus {
  imapEnabled: boolean;
  smtpEnabled: boolean;
  address: string;
  imapHost: string;
  smtpHost: string;
}

interface MailListItem {
  uid: number;
  subject: string;
  from: string;
  fromEmail: string;
  to: string;
  date: string;
  seen: boolean;
}

interface MailDetail {
  uid: number;
  subject: string;
  from: string;
  fromEmail: string;
  to: string[];
  cc: string[];
  date: string;
  text: string;
  html: string;
  seen: boolean;
}

type View = "inbox" | "compose" | "reply";

function formatMailDate(iso: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    }
    return formatDateVi(iso.slice(0, 10));
  } catch {
    return "—";
  }
}

export function MailboxClient() {
  const [status, setStatus] = useState<MailStatus | null>(null);
  const [messages, setMessages] = useState<MailListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [detail, setDetail] = useState<MailDetail | null>(null);
  const [view, setView] = useState<View>("inbox");
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [replyToMessageId, setReplyToMessageId] = useState<string | undefined>();

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/mail/status");
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || "Không kiểm tra được cấu hình mail");
    }
    return (await res.json()) as MailStatus;
  }, []);

  const loadInbox = useCallback(async () => {
    setListLoading(true);
    setError(null);
    const res = await fetch("/api/mail?limit=50");
    const j = await res.json().catch(() => ({}));
    setListLoading(false);
    if (!res.ok) {
      setError(j.error || "Không tải được hộp thư");
      setMessages([]);
      return;
    }
    setMessages(j.messages ?? []);
    setTotal(j.total ?? 0);
  }, []);

  const loadDetail = useCallback(async (uid: number) => {
    setDetailLoading(true);
    setError(null);
    const res = await fetch(`/api/mail/${uid}`);
    const j = await res.json().catch(() => ({}));
    setDetailLoading(false);
    if (!res.ok) {
      setError(j.error || "Không đọc được thư");
      setDetail(null);
      return;
    }
    setDetail(j as MailDetail);
    setMessages((prev) =>
      prev.map((m) => (m.uid === uid ? { ...m, seen: true } : m))
    );
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const s = await loadStatus();
        setStatus(s);
        if (s.imapEnabled) await loadInbox();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Lỗi tải hộp thư");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadStatus, loadInbox]);

  useEffect(() => {
    if (selectedUid == null) {
      setDetail(null);
      return;
    }
    if (view === "inbox") void loadDetail(selectedUid);
  }, [selectedUid, view, loadDetail]);

  function openCompose() {
    setView("compose");
    setSelectedUid(null);
    setDetail(null);
    setComposeTo("");
    setComposeCc("");
    setComposeSubject("");
    setComposeBody("");
    setReplyToMessageId(undefined);
  }

  function openReply() {
    if (!detail) return;
    setView("reply");
    setComposeTo(detail.fromEmail || detail.from);
    setComposeCc("");
    setComposeSubject(
      detail.subject.startsWith("Re:") ? detail.subject : `Re: ${detail.subject}`
    );
    setComposeBody(
      `\n\n---\n${detail.date ? formatMailDate(detail.date) : ""} — ${detail.from}:\n${detail.text}`
    );
    setReplyToMessageId(`<${detail.uid}@mailbox>`);
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    const res = await fetch("/api/mail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: composeTo,
        cc: composeCc || undefined,
        subject: composeSubject,
        text: composeBody,
        inReplyTo: replyToMessageId,
      }),
    });
    const j = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setError(j.error || "Gửi thư thất bại");
      return;
    }
    setView("inbox");
    setSelectedUid(null);
    setDetail(null);
    await loadInbox();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-8">
        <Loader2 size={18} className="animate-spin" /> Đang tải hộp thư…
      </div>
    );
  }

  if (!status?.imapEnabled || !status?.smtpEnabled) {
    return (
      <div className="erp-card border-amber-500/40 p-5 text-sm text-amber-100 space-y-3 max-w-2xl">
        <p className="font-medium text-amber-50">Chưa cấu hình email trên server</p>
        <p>
          Thêm vào file <code className="text-amber-200">.env</code> trên VPS (Tino):
        </p>
        <pre className="text-xs bg-black/30 rounded-lg p-3 overflow-x-auto text-slate-200">
{`IMAP_HOST=smtp.tino.vn
IMAP_PORT=993
IMAP_SECURE=1
SMTP_HOST=smtp.tino.vn
SMTP_PORT=587
SMTP_SECURE=0
SMTP_USER=contact@hoaphong.com.vn
SMTP_PASS=mật-khẩu-email
MAIL_FROM="Hoa Phong <contact@hoaphong.com.vn>"`}
        </pre>
        <p className="text-xs text-amber-200/80">
          IMAP: {status?.imapEnabled ? "OK" : "chưa có"} — SMTP:{" "}
          {status?.smtpEnabled ? "OK" : "chưa có"}
        </p>
      </div>
    );
  }

  const showCompose = view === "compose" || view === "reply";

  return (
    <div className="flex flex-col flex-1 min-h-0 border border-white/10 rounded-xl overflow-hidden bg-[#0f1729]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-white/5 shrink-0">
        <Mail size={16} className="text-sky-light" />
        <span className="text-sm text-slate-200 truncate flex-1">{status.address}</span>
        <span className="text-xs text-slate-500 hidden sm:inline">
          {total} thư trong INBOX
        </span>
        <button
          type="button"
          onClick={() => void loadInbox()}
          disabled={listLoading}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          title="Làm mới"
        >
          <RefreshCw size={16} className={listLoading ? "animate-spin" : ""} />
        </button>
        <button
          type="button"
          onClick={openCompose}
          className="inline-flex items-center gap-1.5 bg-sky text-white text-xs px-3 py-1.5 rounded-lg hover:bg-sky-light"
        >
          <PenSquare size={14} /> Soạn thư
        </button>
      </div>

      {error && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-100 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <aside className="w-full sm:w-72 lg:w-80 shrink-0 border-r border-white/10 flex flex-col min-h-0">
          <div className="px-3 py-2 text-xs text-slate-500 border-b border-white/10 flex items-center gap-1.5">
            <Inbox size={14} /> Hộp đến
          </div>
          <div className="flex-1 overflow-y-auto">
            {listLoading && messages.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">Đang tải…</div>
            ) : messages.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">Hộp thư trống</div>
            ) : (
              messages.map((m) => (
                <button
                  key={m.uid}
                  type="button"
                  onClick={() => {
                    setView("inbox");
                    setSelectedUid(m.uid);
                  }}
                  className={`w-full text-left px-3 py-2.5 border-b border-white/5 hover:bg-white/5 transition-colors ${
                    selectedUid === m.uid && !showCompose ? "bg-sky/10" : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`text-sm truncate ${m.seen ? "text-slate-300" : "text-white font-medium"}`}
                    >
                      {m.from || m.fromEmail || "—"}
                    </span>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {formatMailDate(m.date)}
                    </span>
                  </div>
                  <p
                    className={`text-xs truncate mt-0.5 ${m.seen ? "text-slate-500" : "text-slate-300"}`}
                  >
                    {m.subject}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col min-h-0">
          {showCompose ? (
            <div className="flex flex-col flex-1 min-h-0 p-4 gap-3 overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-white">
                  {view === "reply" ? "Trả lời" : "Soạn thư mới"}
                </h2>
                <button
                  type="button"
                  onClick={() => setView("inbox")}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <label className="block text-xs text-slate-400">
                Tới
                <input
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="mt-1 w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky/50"
                  placeholder="email@khachhang.com"
                />
              </label>
              <label className="block text-xs text-slate-400">
                CC (tuỳ chọn)
                <input
                  value={composeCc}
                  onChange={(e) => setComposeCc(e.target.value)}
                  className="mt-1 w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky/50"
                />
              </label>
              <label className="block text-xs text-slate-400">
                Tiêu đề
                <input
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="mt-1 w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky/50"
                />
              </label>
              <label className="block text-xs text-slate-400 flex-1 flex flex-col min-h-[200px]">
                Nội dung
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="mt-1 flex-1 min-h-[200px] w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky/50 resize-y"
                />
              </label>
              <div>
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending}
                  className="inline-flex items-center gap-2 bg-sky text-white px-4 py-2 rounded-lg text-sm hover:bg-sky-light disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  Gửi
                </button>
              </div>
            </div>
          ) : selectedUid == null ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-500 p-8">
              Chọn thư để đọc hoặc bấm Soạn thư
            </div>
          ) : detailLoading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 gap-2">
              <Loader2 size={18} className="animate-spin" /> Đang mở thư…
            </div>
          ) : detail ? (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 shrink-0">
                <h2 className="text-base font-medium text-white mb-2">{detail.subject}</h2>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>
                    <span className="text-slate-500">Từ:</span> {detail.from}{" "}
                    {detail.fromEmail && detail.fromEmail !== detail.from && (
                      <span className="text-slate-500">&lt;{detail.fromEmail}&gt;</span>
                    )}
                  </p>
                  {detail.to.length > 0 && (
                    <p>
                      <span className="text-slate-500">Tới:</span> {detail.to.join(", ")}
                    </p>
                  )}
                  {detail.cc.length > 0 && (
                    <p>
                      <span className="text-slate-500">CC:</span> {detail.cc.join(", ")}
                    </p>
                  )}
                  <p>
                    <span className="text-slate-500">Ngày:</span>{" "}
                    {detail.date
                      ? new Date(detail.date).toLocaleString("vi-VN")
                      : "—"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openReply}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-sky-light hover:text-white"
                >
                  <Reply size={14} /> Trả lời
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 text-sm text-slate-200">
                {detail.html ? (
                  <div
                    className="prose prose-invert prose-sm max-w-none [&_a]:text-sky-light"
                    dangerouslySetInnerHTML={{ __html: detail.html }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-slate-200">
                    {detail.text || "(Thư không có nội dung text)"}
                  </pre>
                )}
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
