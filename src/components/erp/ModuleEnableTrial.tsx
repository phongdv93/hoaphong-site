"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ModuleEnableTrial({
  companyId,
  moduleId,
  moduleName,
}: {
  companyId: number;
  moduleId: string;
  moduleName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enable() {
    setLoading(true);
    setError(null);
    const res = await fetch(
      `/api/companies/${companyId}/modules/enable-trial`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId }),
      }
    );
    setLoading(false);
    if (res.ok) {
      router.refresh();
      return;
    }
    const j = await res.json().catch(() => ({}));
    setError(j.error || "Không bật được module");
  }

  return (
    <div className="pt-2 border-t border-white/10 mt-3 space-y-2">
      <p className="text-slate-300 text-xs">
        Bạn là <strong className="text-white">admin công ty</strong> — có thể bật{" "}
        <strong className="text-white">{moduleName}</strong> để dùng thử (môi trường dev /
        nội bộ).
      </p>
      <button
        type="button"
        onClick={enable}
        disabled={loading}
        className="bg-sky text-white text-sm px-4 py-2 rounded-lg hover:bg-sky-light disabled:opacity-50"
      >
        {loading ? "Đang bật…" : `Bật module ${moduleName}`}
      </button>
      {error && <p className="text-rose-300 text-xs">{error}</p>}
    </div>
  );
}
