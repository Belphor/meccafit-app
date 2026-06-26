"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ForjaAntiFraudPanel } from "@/app/dashboard/forja/ForjaAntiFraudPanel";
import { ForjaAthleteCard } from "@/app/dashboard/forja/ForjaAthleteCard";
import { ForjaCommandPanel } from "@/app/dashboard/forja/ForjaCommandPanel";
import { ForjaSignOutButton } from "@/app/dashboard/forja/ForjaSignOutButton";
import { DietExcelDropzone } from "@/components/forjador/diet-excel-dropzone";
import { ExcelDropzone } from "@/components/forjador/excel-dropzone";
import { MeccafitCenterBrand } from "@/components/MeccafitCenterBrand";
import { FenyxiaBrandFooter } from "@/components/FenyxiaBrandFooter";
import {
  FORJA_AMBIENT,
  FORJA_COMMAND_PANEL,
  FORJA_EMPTY_STATE,
  FORJA_GHOST_BUTTON,
  FORJA_LAYOUT,
  FORJA_META,
  FORJA_PAGE_TITLE,
  FORJA_SECTION_CHIP,
  FORJA_SHELL,
  FORJA_SIDEBAR_SCROLL,
  FORJA_TAB_ACTIVE,
  FORJA_TAB_IDLE,
} from "@/lib/forja-config";
import {
  FORJA_COPY,
  FORJA_WORKSPACE_TABS,
  resolveForjaPanelSubtitle,
  resolveForjaPanelTitle,
  resolveForjaRoleLabel,
} from "@/lib/forja-copy";
import type {
  ForjaBondedAthlete,
  ForjaDashboardPayload,
  ForjaWorkspaceTab,
} from "@/lib/forja-dashboard";

type ForjaClientProps = {
  payload: ForjaDashboardPayload;
};

function ForjaEmptyWorkspace({ message }: { message: string }) {
  return (
    <div className={FORJA_EMPTY_STATE}>
      <p className={FORJA_SECTION_CHIP}>Nenhum atleta seleccionado</p>
      <p className={`${FORJA_META} mt-3 max-w-sm`}>{message}</p>
    </div>
  );
}

export function ForjaClient({ payload }: ForjaClientProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    payload.athletes[0]?.clientId ?? null,
  );
  const [activeTab, setActiveTab] = useState<ForjaWorkspaceTab>("comando");

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

  const visibleTabs = useMemo(
    () =>
      FORJA_WORKSPACE_TABS.filter(
        (tab) => !tab.vipOnly || selectedAthlete?.hasVipBond || payload.operator.isSovereign,
      ),
    [payload.operator.isSovereign, selectedAthlete?.hasVipBond],
  );

  const activeTabMeta = visibleTabs.find((tab) => tab.id === activeTab) ?? visibleTabs[0];

  const handleSelectAthlete = useCallback((clientId: string) => {
    setSelectedClientId(clientId);
  }, []);

  return (
    <main className={FORJA_SHELL}>
      <div className={FORJA_AMBIENT} aria-hidden />
      <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-col">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-900 pb-5">
          <div>
            <MeccafitCenterBrand variant="portal" />
            <p className={`${FORJA_SECTION_CHIP} mt-3`}>
              {resolveForjaRoleLabel(payload.operator.role)}
            </p>
            <h1 className={`${FORJA_PAGE_TITLE} mt-1`}>
              {resolveForjaPanelTitle(payload.operator)}
            </h1>
            <p className={`${FORJA_META} mt-1.5`}>
              {resolveForjaPanelSubtitle(payload.operator, payload.athletes.length)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/forjador/dieta" className={FORJA_GHOST_BUTTON}>
              Dieta semanal VIP
            </Link>
            <Link href="/forjador/medidas" className={FORJA_GHOST_BUTTON}>
              Medidas VIP
            </Link>
            <ForjaSignOutButton className="shrink-0" />
          </div>
        </header>

        <div className={`${FORJA_LAYOUT} mt-6`}>
          <aside aria-label="Lista de atletas">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className={FORJA_SECTION_CHIP}>
                {payload.operator.isSovereign ? FORJA_COPY.sidebarSovereign : FORJA_COPY.sidebarPersonal}
              </p>
              <span className="text-xs tabular-nums text-zinc-600">{payload.athletes.length}</span>
            </div>

            <div className={FORJA_SIDEBAR_SCROLL}>
              {payload.athletes.length === 0 ? (
                <p
                  className={`${FORJA_META} rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center`}
                >
                  {payload.operator.isSovereign
                    ? FORJA_COPY.emptyAthletesSovereign
                    : FORJA_COPY.emptyAthletes}
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
            <nav
              aria-label="Secções do painel"
              className="mb-5 flex flex-col gap-3 border-b border-zinc-800/80 pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
            >
              <div className="flex flex-wrap gap-2">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                      activeTab === tab.id ? FORJA_TAB_ACTIVE : FORJA_TAB_IDLE
                    }`}
                  >
                    {tab.label}
                    {tab.vipOnly ? (
                      <span className="ml-1.5 text-[10px] uppercase text-emerald-400/80">VIP</span>
                    ) : null}
                  </button>
                ))}
              </div>
              {activeTabMeta ? (
                <p className={`${FORJA_META} max-w-md text-left sm:text-right`}>
                  {activeTabMeta.description}
                </p>
              ) : null}
            </nav>

            {activeTab === "comando" ? (
              <ForjaCommandPanel
                key={selectedAthlete?.clientId ?? "forja-command-empty"}
                athlete={selectedAthlete}
              />
            ) : null}

            {activeTab === "planilha" ? (
              selectedAthlete ? (
                <ExcelDropzone
                  atletaId={selectedAthlete.clientId}
                  atletaName={selectedAthlete.displayName}
                />
              ) : (
                <ForjaEmptyWorkspace message={FORJA_COPY.selectAthlete} />
              )
            ) : null}

            {activeTab === "planilha_dieta" ? (
              selectedAthlete ? (
                selectedAthlete.hasVipBond ? (
                  <DietExcelDropzone athlete={selectedAthlete} />
                ) : (
                  <ForjaEmptyWorkspace message={FORJA_COPY.planilhaDieta.vipRequired} />
                )
              ) : (
                <ForjaEmptyWorkspace message={FORJA_COPY.selectAthlete} />
              )
            ) : null}

            {activeTab === "antifraude" ? (
              <ForjaAntiFraudPanel
                athlete={selectedAthlete}
                isSovereign={payload.operator.isSovereign}
                scopeClientId={selectedAthlete?.clientId ?? null}
              />
            ) : null}
          </div>
        </div>

        <FenyxiaBrandFooter className="mt-10 border-zinc-900" />
      </section>
    </main>
  );
}
