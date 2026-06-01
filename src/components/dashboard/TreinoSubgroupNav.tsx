"use client";

import Link from "next/link";
import { subgroupsCatalog } from "@/lib/exercise-catalog";
import { buildDashboardHref, type DashboardTabId } from "@/lib/dashboard-tabs";

type TreinoSubgroupNavProps = {
  activeSubgroupId: string;
  tabParam?: DashboardTabId | null;
};

export function TreinoSubgroupNav({ activeSubgroupId, tabParam }: TreinoSubgroupNavProps) {
  return (
    <nav
      className="mb-4 flex flex-wrap justify-center gap-2"
      aria-label="Subgrupos musculares do catálogo"
    >
      {subgroupsCatalog.map((subgroup) => {
        const isActive = subgroup.id === activeSubgroupId;
        const href = buildDashboardHref({
          tab: tabParam && tabParam !== "treino" ? tabParam : null,
          subgrupo: subgroup.slug,
        });

        return (
          <Link
            key={subgroup.id}
            href={href}
            className={[
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              isActive
                ? "border-orange-500/80 bg-orange-500/15 text-orange-200"
                : "border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:text-white",
            ].join(" ")}
            aria-current={isActive ? "page" : undefined}
          >
            {subgroup.monumentalTitle}
          </Link>
        );
      })}
    </nav>
  );
}
