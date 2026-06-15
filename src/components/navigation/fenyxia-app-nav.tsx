"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { DASHBOARD_TAP_TARGET } from "@/lib/dashboard-config";
import {
  buildDashboardHref,
  DEFAULT_DASHBOARD_TAB,
  normalizeDashboardTabParam,
  type DashboardTabId,
} from "@/lib/dashboard-tabs";

const APP_TABS: { tab: DashboardTabId; label: string }[] = [
  { tab: "treino", label: "Treino" },
  { tab: "evolucao", label: "Evolução" },
  { tab: "comunidade", label: "Comunidade" },
  { tab: "perfil", label: "Perfil" },
];

function resolveActiveTab(searchParams: URLSearchParams): DashboardTabId {
  return normalizeDashboardTabParam(searchParams.get("tab")) ?? DEFAULT_DASHBOARD_TAB;
}

export function FenyxiaAppNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  if (!onDashboard) {
    return null;
  }

  const activeTab = resolveActiveTab(searchParams);

  return (
    <nav
      className="sticky bottom-0 z-40 border-t border-orange-500/10 bg-black/85 px-2 py-2 backdrop-blur-md"
      aria-label="Navegação principal"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-between gap-1">
        {APP_TABS.map((item) => {
          const isActive = activeTab === item.tab;

          return (
            <li key={item.tab} className="flex-1">
              <Link
                href={buildDashboardHref({ tab: item.tab })}
                className={`${DASHBOARD_TAP_TARGET} flex h-full w-full items-center justify-center rounded-xl border px-1 py-2.5 text-center transition-[border-color,background-color,color] duration-200 ${
                  isActive
                    ? "border-emerald-500/35 bg-emerald-950/25 text-emerald-100"
                    : "border-transparent bg-transparent text-neutral-500 hover:border-orange-500/12 hover:text-neutral-300"
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
