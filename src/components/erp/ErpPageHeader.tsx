"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useMemo,
} from "react";

type HeaderCtx = {
  actions: ReactNode;
  setActions: (node: ReactNode) => void;
};

const Ctx = createContext<HeaderCtx | null>(null);

export function ErpHeaderActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode>(null);
  const value = useMemo(() => ({ actions, setActions }), [actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useErpHeaderActionsSlot() {
  const ctx = useContext(Ctx);
  if (!ctx) return null;
  return ctx.setActions;
}

export function useErpHeaderActions() {
  return useContext(Ctx)?.actions ?? null;
}

export function ErpHeaderActionsSlot() {
  const actions = useErpHeaderActions();
  if (!actions) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 justify-end min-w-0 flex-1">
      {actions}
    </div>
  );
}
