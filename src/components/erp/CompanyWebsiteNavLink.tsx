"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Globe } from "lucide-react";

export function CompanyWebsiteNavLink({ compact }: { compact?: boolean }) {
  const [state, setState] = useState<{
    linked: boolean;
    publicUrl: string | null;
    companyName: string;
    canEdit: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/companies/website")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j) return;
        setState({
          linked: Boolean(j.linked),
          publicUrl: j.publicUrl ?? null,
          companyName: j.companyName ?? "công ty",
          canEdit: Boolean(j.canEdit),
        });
      })
      .catch(() => {});
  }, []);

  if (!state) return null;

  if (state.linked && state.publicUrl) {
    return (
      <a
        href={state.publicUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center rounded text-slate-muted hover:text-white hover:bg-white/5 ${
          compact ? "w-10 h-10 justify-center" : "gap-2 px-2 py-2 w-full"
        }`}
        title={`Website ${state.companyName}`}
      >
        <Globe size={14} />
        {!compact && "Website công ty"}
        {!compact && <ExternalLink size={11} className="ml-auto opacity-60" />}
      </a>
    );
  }

  return (
    <span
      className={`flex items-center rounded text-amber-400/70 ${
        compact ? "w-10 h-10 justify-center" : "gap-2 px-2 py-2 w-full text-xs"
      }`}
      title="Website công ty chưa được liên kết"
    >
      <Globe size={14} />
      {!compact && (
        <span>
          Website công ty (chưa có)
          {state.canEdit && (
            <>
              {" — "}
              <Link href="/erp/quan-tri/website" className="underline hover:text-amber-300">
                liên kết
              </Link>
            </>
          )}
        </span>
      )}
    </span>
  );
}
