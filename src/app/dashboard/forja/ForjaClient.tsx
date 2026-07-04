"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ForjaAthleteSidebar } from "@/components/forjador/forja-athlete-sidebar";
import { ForjaCommandPanel } from "@/app/dashboard/forja/ForjaCommandPanel";
import { ForjaSignOutButton } from "@/app/dashboard/forja/ForjaSignOutButton";
import { TreinoPrescriptionExcelDropzone } from "@/components/forjador/treino-prescription-excel-dropzone";
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
import { resolveForjadorWorkspaceNav } from "@/lib/forjador-vip-nav";

type ForjaClientProps = {
  payload: ForjaDashboardPayload;
};

function ForjaEmptyWorkspace({ message }: { message: string }) {
  return (
    <div className={FORJA_EMPTY_STATE}>
      <p className={FORJA_SECTION_CHIP}>Selecione um cliente</p>
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

  const handleSelectAthlete = useCallback((clientId: string) => {
    setSelectedClientId(clientId);
  }, []);

  const emptyMessage = payload.operator.isSovereign
    ? FORJA_COPY.emptyAthletesSovereign
    : FORJA_COPY.emptyAthletes;

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
          <ForjaSignOutButton className="shrink-0" />
        </header>

        <nav aria-label="Navegação forjador" className="mt-4 flex flex-wrap gap-2">
          {resolveForjadorWorkspaceNav(payload.operator.isSovereign).map((item) => {
            const isActive = item.href === "/dashboard/forja";
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
          <aside aria-label="Lista de clientes">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className={FORJA_SECTION_CHIP}>
                {payload.operator.isSovereign ? "Clientes" : "Meus clientes"}
              </p>
              <span className="text-xs tabular-nums text-zinc-600">{payload.athletes.length}</span>
            </div>

            <ForjaAthleteSidebar
              athletes={payload.athletes}
              selectedClientId={selectedClientId}
              onSelect={handleSelectAthlete}
              emptyMessage={emptyMessage}
              splitByVip
              searchable
            />
          </aside>

          <div className={FORJA_COMMAND_PANEL}>
            <nav
              aria-label="Secções do painel"
              className="mb-5 flex flex-col gap-3 border-b border-zinc-800/80 pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
            >
              <div className="flex flex-wrap gap-2">
                {FORJA_WORKSPACE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                      activeTab === tab.id ? FORJA_TAB_ACTIVE : FORJA_TAB_IDLE
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <p className={`${FORJA_META} max-w-md text-left sm:text-right`}>
                {activeTab === "comando" ? (
                  <>
                    Escolha o <strong className="font-medium text-zinc-300">dia da planilha</strong>
                    {" "}(1 a 6), marque os grupos musculares e monte cada exercício.
                  </>
                ) : (
                  <>
                    Envie dias, grupos e exercícios numa só planilha. O treino anterior é{" "}
                    <strong className="font-medium text-zinc-300">substituído por completo</strong>.
                  </>
                )}
              </p>
            </nav>

            {activeTab === "comando" ? (
              <ForjaCommandPanel
                key={selectedAthlete?.clientId ?? "forja-command-empty"}
                athlete={selectedAthlete}
              />
            ) : null}

            {activeTab === "planilha" ? (
              selectedAthlete ? (
                <TreinoPrescriptionExcelDropzone athlete={selectedAthlete} />
              ) : (
                <ForjaEmptyWorkspace message={FORJA_COPY.selectAthlete} />
              )
            ) : null}
          </div>
        </div>

        <FenyxiaBrandFooter className="mt-10 border-zinc-900" />
      </section>
    </main>
  );
}
