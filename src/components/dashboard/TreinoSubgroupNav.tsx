"use client";

import Link from "next/link";
import { subgroupsCatalog } from "@/lib/exercise-catalog";
import { buildDashboardHref } from "@/lib/dashboard-tabs";

type TreinoSubgroupNavProps = {
  activeSubgroupId: string;
};

export function TreinoSubgroupNav({ activeSubgroupId }: TreinoSubgroupNavProps) {
  return (
    <nav
      className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:justify-center sm:overflow-visible [&::-webkit-scrollbar]:hidden"
      aria-label="Subgrupos musculares do catálogo"
    >
      {subgroupsCatalog.map((subgroup) => {
        const isActive = subgroup.id === activeSubgroupId;
        const href = buildDashboardHref({ subgrupo: subgroup.slug });

        return (
          <Link
            key={subgroup.id}
            href={href}
            className={[
              "inline-flex min-h-11 shrink-0 items-center rounded-full border px-3 py-2 text-xs font-medium transition-colors",
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
