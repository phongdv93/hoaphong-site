"use client";

import { useEffect, useState } from "react";
import type { CustomsMasterType } from "@/lib/customs/master-data";

export interface MasterHint {
  code: string;
  name: string;
  extra?: string;
}

export function useCustomsMasterHints(
  type: CustomsMasterType,
  query: string,
  enabled = true,
  limit = 8
): MasterHint[] {
  const [hints, setHints] = useState<MasterHint[]>([]);

  useEffect(() => {
    if (!enabled) {
      setHints([]);
      return;
    }
    const t = setTimeout(() => {
      void fetch(
        `/api/customs/master-data?type=${type}&q=${encodeURIComponent(query.trim())}&limit=${limit}`
      )
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((j) =>
          setHints(
            (j.items ?? []).map((x: { code: string; name: string; extra?: string }) => ({
              code: x.code,
              name: x.name,
              extra: x.extra,
            }))
          )
        )
        .catch(() => setHints([]));
    }, 200);
    return () => clearTimeout(t);
  }, [type, query, enabled, limit]);

  return hints;
}
