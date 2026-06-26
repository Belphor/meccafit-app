"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ForjaAthleteCard } from "@/app/dashboard/forja/ForjaAthleteCard";
import { ForjaSignOutButton } from "@/app/dashboard/forja/ForjaSignOutButton";
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
  FORJA_SIDEBAR_SCROLL,
} from "@/lib/forja-config";
import { resolveForjaPanelSubtitle, resolveForjaRoleLabel } from "@/lib/forja-copy";
import type { ForjaBondedAthlete, ForjaDashboardPayload } from "@/lib/forja-dashboard";

type ForjadorVipWorkspaceProps = {
  payload: ForjaDashboardPayload;
  title: string;
  description: string;
  activeRoute: "/forjador/dieta" | "/forjador/medidas";
  children: (context: {
    athlete: ForjaBondedAthlete | null;
    disabled: boolean;
  }) => React.ReactNode;
};

const NAV_ITEMS = [
  { href: "/forjador/dieta" as const, label: "Dieta semanal" },
  { href: "/forjador/medidas" as const, label: "Medidas" },
  { href: "/dashboard/forja", label: "Painel Forja" },
];

export function ForjadorVipWorkspace({
  payload,
  title,
  description,
  activeRoute,
  children,
}: ForjadorVipWorkspaceProps) {
  const athletes = useMemo(() => {
    if (payload.operator.isSovereign) {
      return payload.athletes;
    }
    return payload.athletes.filter((athlete) => athlete.hasVipBond);
  }, [payload.athletes, payload.operator.isSovereign]);

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

  const workspaceDisabled = !selectedAthlete?.hasVipBond;

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
            <p className={`${FORJA_META} mt-1.5`}>
              {resolveForjaPanelSubtitle(payload.operator, athletes.length)}
            </p>
            <p className={`${FORJA_META} mt-1 max-w-2xl`}>{description}</p>
          </div>
          <ForjaSignOutButton className="shrink-0" />
        </header>

        <nav
          aria-label="Navegação VIP"
          className="mt-4 flex flex-wrap gap-2"
        >
          {NAV_ITEMS.map((item) => {
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
          <aside aria-label="Lista de atletas VIP">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className={FORJA_SECTION_CHIP}>
                {payload.operator.isSovereign ? "Atletas da academia" : "Meus clientes VIP"}
              </p>
              <span className="text-[10px] text-zinc-600">{athletes.length}</span>
            </div>

            {athletes.length === 0 ? (
              <div className={FORJA_EMPTY_STATE}>
                <p className={FORJA_META}>
                  {payload.operator.isSovereign
                    ? "Nenhum cliente cadastrado na academia."
                    : "Nenhum cliente VIP vinculado ao seu perfil."}
                </p>
              </div>
            ) : (
              <div className={FORJA_SIDEBAR_SCROLL}>
                {athletes.map((athlete) => (
                  <ForjaAthleteCard
                    key={athlete.clientId}
                    athlete={athlete}
                    isSelected={selectedClientId === athlete.clientId}
                    onSelect={handleSelectAthlete}
                  />
                ))}
              </div>
            )}
          </aside>

          <div className={FORJA_COMMAND_PANEL}>
            {!selectedAthlete ? (
              <div className={FORJA_EMPTY_STATE}>
                <p className={FORJA_SECTION_CHIP}>Nenhum atleta seleccionado</p>
                <p className={`${FORJA_META} mt-3 max-w-sm`}>
                  Selecione um atleta na lista para editar dados VIP.
                </p>
              </div>
            ) : !selectedAthlete.hasVipBond ? (
              <div className={FORJA_EMPTY_STATE}>
                <p className={FORJA_SECTION_CHIP}>Sem vínculo VIP</p>
                <p className={`${FORJA_META} mt-3 max-w-sm`}>
                  {selectedAthlete.displayName} não possui bond activo em forger_client_bonds.
                  Crie o vínculo antes de publicar dieta ou medidas.
                </p>
              </div>
            ) : (
              children({ athlete: selectedAthlete, disabled: workspaceDisabled })
            )}
          </div>
        </div>

        <FenyxiaBrandFooter className="mt-8" />
      </section>
    </main>
  );
}
