"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ERP_MODULE_GROUPS } from "@/lib/erp/modules";
import { ERP } from "@/lib/paths";
import {
  Grid3X3,
  LogOut,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CompanySwitcher } from "@/components/projects/CompanySwitcher";
import { CompanyWebsiteNavLink } from "@/components/erp/CompanyWebsiteNavLink";
import {
  COMPANY_CHANGED_EVENT,
  COMPANY_MODULES_CHANGED_EVENT,
} from "@/lib/erp/events";

const SIDEBAR_EXPANDED = 240;
const SIDEBAR_COLLAPSED = 56;
const SIDEBAR_STORAGE_KEY = "hoaphong_erp_sidebar_collapsed";
const SIDEBAR_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
/** Đồng bộ gói module cho user khác / tab khác (Ultimate vừa bật tắt). */
const MODULE_ACCESS_POLL_MS = 25_000;

interface MyAccess {
  isPlatformAdmin: boolean;
  activeCompanyId: number | null;
  enabledModuleIds: string[];
  user?: { id: number; name: string; email: string };
}

function accessEquals(a: MyAccess | null, b: MyAccess | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (
    a.isPlatformAdmin !== b.isPlatformAdmin ||
    a.activeCompanyId !== b.activeCompanyId ||
    a.enabledModuleIds.length !== b.enabledModuleIds.length
  ) {
    return false;
  }
  for (let i = 0; i < a.enabledModuleIds.length; i++) {
    if (a.enabledModuleIds[i] !== b.enabledModuleIds[i]) return false;
  }
  return a.user?.id === b.user?.id && a.user?.email === b.user?.email;
}

export function ErpShell({
  children,
  title,
  groupId: _groupId,
  fillHeight,
  contentBleed,
}: {
  children: React.ReactNode;
  title: string;
  groupId?: string;
  fillHeight?: boolean;
  contentBleed?: boolean;
}) {
  const pathname = usePathname();
  const [access, setAccess] = useState<MyAccess | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHoverOpen, setSidebarHoverOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1") {
        setSidebarCollapsed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const navScrollRef = useRef<HTMLElement | null>(null);
  const navScrollTopRef = useRef(0);

  const loadAccess = () => {
    if (navScrollRef.current) {
      navScrollTopRef.current = navScrollRef.current.scrollTop;
    }
    fetch("/api/platform/my-access")
      .then((r) => (r.ok ? r.json() : null))
      .then((next: MyAccess | null) => {
        setAccess((prev) => (accessEquals(prev, next) ? prev : next));
        requestAnimationFrame(() => {
          if (navScrollRef.current) {
            navScrollRef.current.scrollTop = navScrollTopRef.current;
          }
        });
      })
      .catch(() => setAccess(null));
  };

  useEffect(() => {
    loadAccess();

    const onCompanyChanged = () => loadAccess();
    const onModulesChanged = () => loadAccess();
    const onFocus = () => {
      if (document.visibilityState === "visible") loadAccess();
    };

    window.addEventListener(COMPANY_CHANGED_EVENT, onCompanyChanged);
    window.addEventListener(COMPANY_MODULES_CHANGED_EVENT, onModulesChanged);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") loadAccess();
    }, MODULE_ACCESS_POLL_MS);

    return () => {
      window.removeEventListener(COMPANY_CHANGED_EVENT, onCompanyChanged);
      window.removeEventListener(COMPANY_MODULES_CHANGED_EVENT, onModulesChanged);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.clearInterval(poll);
    };
  }, []);

  function pinSidebarExpanded() {
    setSidebarCollapsed(false);
    setSidebarHoverOpen(false);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, "0");
    } catch {
      // ignore
    }
  }

  function pinSidebarCollapsed() {
    setSidebarCollapsed(true);
    setSidebarHoverOpen(false);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }

  const isRail = sidebarCollapsed && !sidebarHoverOpen;
  const isHoverPeek = sidebarCollapsed && sidebarHoverOpen;
  const sidebarW = isRail ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  const visibleGroups =
    !access || access.isPlatformAdmin
      ? ERP_MODULE_GROUPS
      : ERP_MODULE_GROUPS.filter((g) =>
          access.enabledModuleIds.includes(g.id)
        );

  /** Ultimate: vẫn xem hết menu nhưng gắn nhãn bật/tắt theo công ty đang chọn. */
  const platformModulePreview = Boolean(
    access?.isPlatformAdmin && access.activeCompanyId != null
  );
  const enabledModuleSet = new Set(access?.enabledModuleIds ?? []);
  const enabledModuleCount = ERP_MODULE_GROUPS.filter((g) =>
    enabledModuleSet.has(g.id)
  ).length;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of ERP_MODULE_GROUPS) init[g.id] = false;
    return init;
  });

  /** Vào trang con thì mở đúng nhóm module (các nhóm khác vẫn đóng trừ khi user đã bật tay). */
  useEffect(() => {
    const active = ERP_MODULE_GROUPS.find(
      (g) => pathname === g.href || pathname.startsWith(`${g.href}/`)
    );
    if (!active) return;
    setOpenGroups((p) => ({ ...p, [active.id]: true }));
  }, [pathname]);

  useLayoutEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;
    el.scrollTop = navScrollTopRef.current;
  }, [access]);

  function toggle(id: string) {
    if (navScrollRef.current) {
      navScrollTopRef.current = navScrollRef.current.scrollTop;
    }
    setOpenGroups((p) => ({ ...p, [id]: !p[id] }));
  }

  const displayName = access?.user?.name?.trim() || access?.user?.email || "—";
  const displayEmail =
    access?.user?.email && access.user.email !== access?.user?.name
      ? access.user.email
      : null;

  return (
    <div
      className={`bg-[#0b1630] flex ${
        fillHeight ? "h-screen max-h-screen overflow-hidden" : "min-h-screen"
      }`}
    >
      <aside
        onMouseEnter={() => sidebarCollapsed && setSidebarHoverOpen(true)}
        onMouseLeave={() => setSidebarHoverOpen(false)}
        className={`text-white flex flex-col shrink-0 overflow-hidden max-h-screen h-screen sticky top-0 transition-[width] duration-300 border-r border-white/10 ${
          isHoverPeek ? "z-40 shadow-2xl shadow-black/50" : ""
        }`}
        style={{
          width: sidebarW,
          transitionTimingFunction: SIDEBAR_EASE,
          background:
            "linear-gradient(180deg, rgba(5,10,22,1) 0%, rgba(8,14,30,1) 100%)",
        }}
      >
        <div
          className={`border-b border-white/10 flex items-center shrink-0 ${
            isRail ? "justify-center p-2" : "justify-between p-4"
          }`}
        >
          {isRail ? (
            <Link
              href={ERP.base}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 text-sky-light font-bold text-sm"
              title="Hoa Phong ERP"
            >
              HP
            </Link>
          ) : (
            <>
              <Link href={ERP.base} className="font-semibold text-sm hover:text-sky-light truncate">
                Hoa Phong ERP
              </Link>
              <div className="flex items-center gap-0.5 shrink-0">
                {isHoverPeek && (
                  <button
                    type="button"
                    onClick={pinSidebarExpanded}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-sky-light"
                    title="Ghim mở menu"
                  >
                    <PanelLeftOpen size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={pinSidebarCollapsed}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-muted"
                  title="Thu gọn menu"
                >
                  <PanelLeftClose size={16} />
                </button>
              </div>
            </>
          )}
        </div>
        <CompanySwitcher collapsed={isRail} />
        {access?.isPlatformAdmin && (
          <Link
            href="/erp/platform/cong-ty"
            className={`mt-2 mb-1 flex items-center rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 text-xs ${
              isRail ? "mx-auto w-10 h-10 justify-center" : "mx-3 gap-2 px-2 py-2"
            }`}
            title="Platform Admin"
          >
            <ShieldCheck size={14} />
            {!isRail && "Công ty & gói module"}
          </Link>
        )}
        <nav
          ref={navScrollRef}
          onScroll={() => {
            if (navScrollRef.current) {
              navScrollTopRef.current = navScrollRef.current.scrollTop;
            }
          }}
          className="flex-1 min-h-0 p-2 text-sm overflow-y-auto overflow-x-hidden overscroll-contain"
        >
          {access?.isPlatformAdmin && !isRail && !access.activeCompanyId && (
            <div className="mx-1 mb-2 px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] text-slate-400">
              Chọn công ty ở trên để xem nhãn <strong className="text-slate-300">Bật/Tắt</strong>{" "}
              từng module.
            </div>
          )}
          {platformModulePreview && !isRail && (
            <div className="mx-1 mb-2 px-2 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[10px] leading-snug text-amber-100/95">
              <span className="font-semibold tabular-nums">
                {enabledModuleCount}/{ERP_MODULE_GROUPS.length}
              </span>{" "}
              module đang bật cho công ty này
            </div>
          )}
          {visibleGroups.length === 0 && access && !isRail && (
            <div className="px-2 py-3 text-xs text-slate-muted">
              Công ty này chưa được Hoa Phong bật module nào. Hãy liên hệ Hoa Phong để mở quyền
              sử dụng.
            </div>
          )}
          {visibleGroups.map((g) => {
            const open = openGroups[g.id];
            const groupActive =
              pathname === g.href || pathname.startsWith(g.href + "/");
            const Icon = g.icon;
            const moduleOn = enabledModuleSet.has(g.id);
            const dimmed = platformModulePreview && !moduleOn;
            const moduleTitle = platformModulePreview
              ? `${g.title} — ${moduleOn ? "Đã bật gói" : "Chưa bật gói"}`
              : g.title;

            if (isRail) {
              return (
                <div key={g.id} className="mb-1 flex justify-center">
                  <span
                    className={`relative w-10 h-10 flex items-center justify-center rounded-lg ${
                      groupActive ? "bg-white/10 text-white" : "text-slate-muted"
                    } ${dimmed ? "opacity-40" : ""}`}
                    title={moduleTitle}
                  >
                    <Icon
                      size={18}
                      className={moduleOn ? "text-sky-light" : "text-slate-500"}
                    />
                    {platformModulePreview && (
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0b1630] ${
                          moduleOn ? "bg-emerald-400" : "bg-slate-600"
                        }`}
                      />
                    )}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={g.id}
                className={`mb-1 ${dimmed ? "opacity-50" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => toggle(g.id)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left ${
                    groupActive ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                  title={moduleTitle}
                >
                  {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Icon
                    size={16}
                    className={`shrink-0 ${moduleOn ? "text-sky-light" : "text-slate-500"}`}
                  />
                  <span className="truncate flex-1 min-w-0">{g.title}</span>
                  {platformModulePreview && (
                    <ModulePackageBadge on={moduleOn} />
                  )}
                </button>
                {open && (
                  <ul
                    className={`ml-4 mt-0.5 space-y-0.5 border-l pl-2 ${
                      moduleOn ? "border-white/10" : "border-white/5"
                    }`}
                  >
                    {g.items.map((item) => {
                      const active =
                        pathname === item.href ||
                        pathname.startsWith(item.href + "/");
                      return (
                        <li key={item.id}>
                          <Link
                            href={item.href}
                            className={`block px-2 py-1.5 rounded text-xs truncate ${
                              active
                                ? "bg-sky/30 text-white"
                                : dimmed
                                  ? "text-slate-600 hover:text-slate-400"
                                  : "text-slate-muted hover:text-white"
                            }`}
                          >
                            {item.title}
                            {item.status === "active" && moduleOn && (
                              <span className="ml-1 text-[10px] text-emerald-300">●</span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
        <div
          className={`border-t border-white/10 space-y-1 text-xs shrink-0 ${
            isRail ? "p-2 flex flex-col items-center" : "p-3"
          }`}
        >
          {access?.user && !isRail && (
            <div className="mb-2 px-2 py-2 rounded-lg bg-white/5 border border-white/10 w-full">
              <div className="text-[10px] uppercase text-slate-500 mb-0.5">Đang đăng nhập</div>
              <div className="text-sm font-medium text-white truncate">{displayName}</div>
              {displayEmail && (
                <div className="text-[11px] text-slate-400 truncate">{displayEmail}</div>
              )}
            </div>
          )}
          <CompanyWebsiteNavLink compact={isRail} />
          <Link
            href={ERP.base}
            className={`flex items-center rounded text-slate-muted hover:text-white hover:bg-white/5 ${
              isRail ? "w-10 h-10 justify-center" : "gap-2 px-2 py-2 w-full"
            }`}
            title="Đổi công ty"
          >
            <Grid3X3 size={14} />
            {!isRail && "Đổi công ty"}
          </Link>
          <Link
            href={ERP.login}
            className={`flex items-center rounded text-red-400 hover:text-red-300 hover:bg-white/5 ${
              isRail ? "w-10 h-10 justify-center" : "gap-2 px-2 py-2 w-full"
            }`}
            title="Đăng xuất"
          >
            <LogOut size={14} />
            {!isRail && "Đăng xuất"}
          </Link>
        </div>
      </aside>
      <main
        className={`erp-theme-scope flex-1 min-w-0 min-h-0 bg-[#0b1630] ${
          fillHeight ? "flex flex-col overflow-hidden" : "overflow-auto"
        }`}
      >
        <header className="px-8 py-4 shrink-0 border-b border-white/10 bg-[#0b1630]">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
        </header>
        <div
          key={`erp-co-${access?.activeCompanyId ?? "none"}`}
          className={
            fillHeight
              ? contentBleed
                ? "pt-4 pb-0 px-0 flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0b1630]"
                : "px-8 pt-4 pb-0 flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0b1630]"
              : "p-8 bg-[#0b1630]"
          }
        >
          {children}
        </div>
      </main>
    </div>
  );
}

function ModulePackageBadge({ on }: { on: boolean }) {
  return (
    <span
      className={`text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wide ${
        on
          ? "bg-emerald-500/25 text-emerald-300"
          : "bg-white/5 text-slate-500"
      }`}
    >
      {on ? "Bật" : "Tắt"}
    </span>
  );
}
