"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { DASHBOARD_TAP_TARGET } from "@/lib/dashboard-config";
import {
  DASHBOARD_BOND_EVENT,
  DASHBOARD_TAB_CHANGE_EVENT,
  readDashboardTabFromLocation,
  syncDashboardTabToUrl,
  type DashboardBondDetail,
  type DashboardTabChangeDetail,
} from "@/lib/dashboard-tab-navigation";
import {
  DEFAULT_DASHBOARD_TAB,
  filterDashboardTabs,
  type DashboardTabId,
} from "@/lib/dashboard-tabs";

export function FenyxiaAppNav() {
  const pathname = usePathname();
  const onDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const [activeTab, setActiveTab] = useState<DashboardTabId>(DEFAULT_DASHBOARD_TAB);
  const [hasPersonalBond, setHasPersonalBond] = useState(false);

  useEffect(() => {
    if (!onDashboard) return;

    const syncFromLocation = () => {
      setActiveTab(readDashboardTabFromLocation() ?? DEFAULT_DASHBOARD_TAB);
    };

    syncFromLocation();

    const onTabChange = (event: Event) => {
      const detail = (event as CustomEvent<DashboardTabChangeDetail>).detail;
      if (detail?.tab) setActiveTab(detail.tab);
    };

    const onBondChange = (event: Event) => {
      const detail = (event as CustomEvent<DashboardBondDetail>).detail;
      if (typeof detail?.hasPersonalBond === "boolean") {
        setHasPersonalBond(detail.hasPersonalBond);
      }
    };

    window.addEventListener(DASHBOARD_TAB_CHANGE_EVENT, onTabChange);
    window.addEventListener(DASHBOARD_BOND_EVENT, onBondChange);
    window.addEventListener("popstate", syncFromLocation);

    return () => {
      window.removeEventListener(DASHBOARD_TAB_CHANGE_EVENT, onTabChange);
      window.removeEventListener(DASHBOARD_BOND_EVENT, onBondChange);
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, [onDashboard]);

  const visibleTabs = useMemo(
    () => filterDashboardTabs(hasPersonalBond),
    [hasPersonalBond],
  );

  const handleTabPick = useCallback((tab: DashboardTabId) => {
    setActiveTab(tab);
    syncDashboardTabToUrl(tab, { dispatch: false });
    window.dispatchEvent(
      new CustomEvent<DashboardTabChangeDetail>(DASHBOARD_TAB_CHANGE_EVENT, {
        detail: { tab },
      }),
    );
  }, []);

  if (!onDashboard) {
    return null;
  }

  return (
    <nav
      className="sticky bottom-0 z-40 border-t border-orange-500/10 bg-black/85 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden"
      aria-label="Navegação principal"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-between gap-1">
        {visibleTabs.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <li key={item.id} className="min-w-0 flex-1">
              <button
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => handleTabPick(item.id)}
                className={`${DASHBOARD_TAP_TARGET} flex h-full w-full min-h-11 items-center justify-center rounded-xl border px-1 py-2.5 text-center transition-[border-color,background-color,color] duration-200 ${
                  isActive
                    ? "border-emerald-500/35 bg-emerald-950/25 text-emerald-100"
                    : "border-transparent bg-transparent text-neutral-500 hover:border-orange-500/12 hover:text-neutral-300"
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
