"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ForjaSignOutButton } from "@/app/dashboard/forja/ForjaSignOutButton";
import { ForjaAthleteSidebar } from "@/components/forjador/forja-athlete-sidebar";
import { MeccafitCenterBrand } from "@/components/MeccafitCenterBrand";
import { FenyxiaBrandFooter } from "@/components/FenyxiaBrandFooter";
import {
  FORJA_AMBIENT,
  FORJA_COMMAND_PANEL,
  FORJA_EMPTY_STATE,
  FORJA_LAYOUT,
  FORJA_META,
  FORJA_PAGE_TITLE,
  FORJA_SECTION_CHIP,
  FORJA_SHELL,
} from "@/lib/forja-config";
import { resolveForjaRoleLabel } from "@/lib/forja-copy";
import { filterVipAthletes } from "@/lib/forja-athlete-lists";
import type { ForjaBondedAthlete, ForjaDashboardPayload } from "@/lib/forja-dashboard";
import { FORJADOR_WORKSPACE_NAV, type ForjadorNavRoute } from "@/lib/forjador-vip-nav";

type ForjadorVipWorkspaceProps = {
  payload: ForjaDashboardPayload;
  title: string;
  description: string;
  activeRoute: ForjadorNavRoute;
  children: (context: {
    athlete: ForjaBondedAthlete | null;
    disabled: boolean;
  }) => React.ReactNode;
};

export function ForjadorVipWorkspace({
  payload,
  title,
  description,
  activeRoute,
  children,
}: ForjadorVipWorkspaceProps) {
  const athletes = useMemo(
    () => filterVipAthletes(payload.athletes, payload.operator.userId, payload.operator.isSovereign),
    [payload.athletes, payload.operator.isSovereign, payload.operator.userId],
  );

  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    athletes[0]?.clientId ?? null,
  );

  const athleteById = useMemo(() => {
    const map = new Map<string, ForjaBondedAthlete>();
    for (const athlete of athletes) {
      map.set(athlete.clientId, athlete);
    }
    return map;
  }, [athletes]);

  const selectedAthlete = useMemo(
    () => (selectedClientId ? (athleteById.get(selectedClientId) ?? null) : null),
    [athleteById, selectedClientId],
  );

  const handleSelectAthlete = useCallback((clientId: string) => {
    setSelectedClientId(clientId);
  }, []);

  const emptyMessage = payload.operator.isSovereign
    ? "Nenhum cliente VIP na academia."
    : "Nenhum cliente VIP no seu vínculo.";

  return (
    <main className={FORJA_SHELL}>
      <div className={FORJA_AMBIENT} aria-hidden />
      <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-col">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-900 pb-5">
          <div>
            <MeccafitCenterBrand variant="portal" />
            <p className={`${FORJA_SECTION_CHIP} mt-3`}>
              VIP · {resolveForjaRoleLabel(payload.operator.role)}
            </p>
            <h1 className={`${FORJA_PAGE_TITLE} mt-1`}>{title}</h1>
            <p className={`${FORJA_META} mt-1.5 max-w-2xl`}>{description}</p>
          </div>
          <ForjaSignOutButton className="shrink-0" />
        </header>

        <nav aria-label="Navegação forjador" className="mt-4 flex flex-wrap gap-2">
          {FORJADOR_WORKSPACE_NAV.map((item) => {
            const isActive = item.href === activeRoute;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "inline-flex min-h-11 items-center rounded-xl border px-4 py-2.5 text-xs font-medium transition",
                  isActive
                    ? "border-zinc-500 bg-zinc-800/80 text-zinc-100"
                    : "border-zinc-800 bg-zinc-950/40 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={`${FORJA_LAYOUT} mt-6`}>
          <aside aria-label="Clientes VIP">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className={FORJA_SECTION_CHIP}>
                {payload.operator.isSovereign ? "Clientes VIP" : "Meus VIP"}
              </p>
              <span className="text-xs tabular-nums text-zinc-600">{athletes.length}</span>
            </div>

            <ForjaAthleteSidebar
              athletes={athletes}
              selectedClientId={selectedClientId}
              onSelect={handleSelectAthlete}
              emptyMessage={emptyMessage}
              splitByVip={false}
              vipOnly
            />
          </aside>

          <div className={FORJA_COMMAND_PANEL}>
            {!selectedAthlete ? (
              <div className={FORJA_EMPTY_STATE}>
                <p className={FORJA_SECTION_CHIP}>Selecione um cliente</p>
                <p className={`${FORJA_META} mt-3 max-w-sm`}>{emptyMessage}</p>
              </div>
            ) : (
              children({ athlete: selectedAthlete, disabled: false })
            )}
          </div>
        </div>

        <FenyxiaBrandFooter className="mt-8" />
      </section>
    </main>
  );
}
