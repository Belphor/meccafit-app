"use client";

import { useCallback, useMemo, useState } from "react";
import { ForjaAthleteCard } from "@/app/dashboard/forja/ForjaAthleteCard";
import { ForjaCommandPanel } from "@/app/dashboard/forja/ForjaCommandPanel";
import { ForjaSignOutButton } from "@/app/dashboard/forja/ForjaSignOutButton";
import { MeccafitCenterBrand } from "@/components/MeccafitCenterBrand";
import { FenyxiaBrandFooter } from "@/components/FenyxiaBrandFooter";
import {
  FORJA_COMMAND_PANEL,
  FORJA_LAYOUT,
  FORJA_META,
  FORJA_SECTION_CHIP,
  FORJA_SECTION_TITLE,
  FORJA_SHELL,
  FORJA_SIDEBAR_SCROLL,
} from "@/lib/forja-config";
import type { ForjaBondedAthlete, ForjaDashboardPayload } from "@/lib/forja-dashboard";

type ForjaClientProps = {
  payload: ForjaDashboardPayload;
};

export function ForjaClient({ payload }: ForjaClientProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    payload.athletes[0]?.clientId ?? null,
  );

  const athleteById = useMemo(() => {
    const map = new Map<string, ForjaBondedAthlete>();
    for (const athlete of payload.athletes) {
      map.set(athlete.clientId, athlete);
    }
    return map;
  }, [payload.athletes]);

  const selectedAthlete = useMemo(
    () => (selectedClientId ? (athleteById.get(selectedClientId) ?? null) : null),
    [athleteById, selectedClientId],
  );

  const handleSelectAthlete = useCallback((clientId: string) => {
    setSelectedClientId(clientId);
  }, []);

  return (
    <main className={FORJA_SHELL}>
      <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-900 pb-5">
          <div>
            <MeccafitCenterBrand variant="portal" />
            <p className={`${FORJA_SECTION_CHIP} mt-3`}>Painel da Forja · {payload.sovereign.role}</p>
            <h1 className={`${FORJA_SECTION_TITLE} mt-1`}>Comando Soberano</h1>
            <p className={`${FORJA_META} mt-1`}>
              {payload.sovereign.displayName} · {payload.athletes.length} atleta
              {payload.athletes.length === 1 ? "" : "s"} vinculado
              {payload.athletes.length === 1 ? "" : "s"}
            </p>
          </div>
          <ForjaSignOutButton className="shrink-0" />
        </header>

        <div className={`${FORJA_LAYOUT} mt-6`}>
          <aside aria-label="Atletas vinculados">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className={FORJA_SECTION_CHIP}>Linhagem VIP</p>
              <span className="text-[10px] tabular-nums text-zinc-600">{payload.athletes.length}</span>
            </div>

            <div className={FORJA_SIDEBAR_SCROLL}>
              {payload.athletes.length === 0 ? (
                <p className={`${FORJA_META} rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center`}>
                  Nenhum vínculo activo em forger_client_bonds. Personais podem forjar bonds com
                  clientes VIP.
                </p>
              ) : (
                payload.athletes.map((athlete) => (
                  <ForjaAthleteCard
                    key={athlete.bondId}
                    athlete={athlete}
                    isSelected={selectedClientId === athlete.clientId}
                    onSelect={handleSelectAthlete}
                  />
                ))
              )}
            </div>
          </aside>

          <div className={FORJA_COMMAND_PANEL}>
            <ForjaCommandPanel
              key={selectedAthlete?.clientId ?? "forja-command-empty"}
              athlete={selectedAthlete}
            />
          </div>
        </div>

        <FenyxiaBrandFooter className="mt-10 border-zinc-900" />
      </section>
    </main>
  );
}
