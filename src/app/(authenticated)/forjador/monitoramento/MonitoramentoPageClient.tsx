"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ForjaAntiFraudPanel } from "@/app/dashboard/forja/ForjaAntiFraudPanel";
import { ForjaSignOutButton } from "@/app/dashboard/forja/ForjaSignOutButton";
import { ForjaVtcFeedPanel, type ClientAlertSeverity } from "@/app/dashboard/forja/ForjaVtcFeedPanel";
import { ForjaVtcPhaseReferencePanel } from "@/app/dashboard/forja/ForjaVtcPhaseReferencePanel";
import { ForjaAthleteSidebar } from "@/components/forjador/forja-athlete-sidebar";
import { ForjaMonitorSegmentFilter } from "@/components/forjador/forja-monitor-segment-filter";
import { ForjaMonitorStatsBar } from "@/components/forjador/forja-monitor-stats-bar";
import { MeccafitCenterBrand } from "@/components/MeccafitCenterBrand";
import { FenyxiaBrandFooter } from "@/components/FenyxiaBrandFooter";
import {
  FORJA_AMBIENT,
  FORJA_COMMAND_PANEL,
  FORJA_LAYOUT,
  FORJA_META,
  FORJA_PAGE_TITLE,
  FORJA_SECTION_CHIP,
  FORJA_SHELL,
} from "@/lib/forja-config";
import { FORJA_COPY, resolveForjaRoleLabel } from "@/lib/forja-copy";
import type { ForjaBondedAthlete, ForjaDashboardPayload, ForjaVtcFeedEntry } from "@/lib/forja-dashboard";
import {
  computeMonitorStats,
  filterAthletesByMonitorSegment,
  patchFeedEntryVtcAfterAdjust,
  type ForjaMonitorSegment,
} from "@/lib/forja-monitor-utils";
import { isAccountSuspended } from "@/lib/account-access-status";
import { resolveForjadorWorkspaceNav } from "@/lib/forjador-vip-nav";
import { fetchForjaMonitorAthletes } from "@/lib/forja-sovereign-actions";
import type { ForjaFraudSignal } from "@/lib/forja-sovereign-actions";

type MonitoramentoPageClientProps = {
  payload: ForjaDashboardPayload;
};

export function MonitoramentoPageClient({ payload }: MonitoramentoPageClientProps) {
  const [athletes, setAthletes] = useState<ForjaBondedAthlete[]>(payload.athletes);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [segment, setSegment] = useState<ForjaMonitorSegment>("vip");
  const [feedEntries, setFeedEntries] = useState<ForjaVtcFeedEntry[]>([]);
  const [feedVersion, setFeedVersion] = useState(0);
  const [clientAlertSeverity, setClientAlertSeverity] = useState<
    Record<string, ClientAlertSeverity>
  >({});

  const handleSignalsLoaded = useCallback((signals: ForjaFraudSignal[]) => {
    const map: Record<string, ClientAlertSeverity> = {};
    for (const signal of signals) {
      const current = map[signal.atleta_id];
      if (signal.severity === "critical") {
        map[signal.atleta_id] = "critical";
      } else if (!current) {
        map[signal.atleta_id] = "warn";
      }
    }
    setClientAlertSeverity(map);
  }, []);

  const filteredAthletes = useMemo(
    () => filterAthletesByMonitorSegment(athletes, segment),
    [athletes, segment],
  );

  const segmentCounts = useMemo(
    () => ({
      vip: athletes.filter(
        (athlete) => athlete.hasVipBond && !isAccountSuspended(athlete.statusAltar),
      ).length,
      comum: athletes.filter(
        (athlete) => !athlete.hasVipBond && !isAccountSuspended(athlete.statusAltar),
      ).length,
      suspenso: athletes.filter((athlete) => isAccountSuspended(athlete.statusAltar)).length,
    }),
    [athletes],
  );

  const vipBondByClientId = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const athlete of athletes) {
      map[athlete.clientId] = Boolean(athlete.hasVipBond);
    }
    return map;
  }, [athletes]);

  const stats = useMemo(
    () => computeMonitorStats(athletes, payload.operator.userId, feedEntries),
    [feedEntries, athletes, payload.operator.userId],
  );

  const athleteById = useMemo(() => {
    const map = new Map(athletes.map((a) => [a.clientId, a]));
    return map;
  }, [athletes]);

  const selectedAthlete = useMemo(
    () => (selectedClientId ? (athleteById.get(selectedClientId) ?? null) : null),
    [athleteById, selectedClientId],
  );

  const handleSelectAthlete = useCallback((clientId: string) => {
    setSelectedClientId(clientId);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedClientId(null);
  }, []);

  const handleFeedLoaded = useCallback((entries: ForjaVtcFeedEntry[]) => {
    setFeedEntries(entries);
  }, []);

  const handleMonitorRefresh = useCallback(() => {
    setFeedVersion((value) => value + 1);
    void fetchForjaMonitorAthletes().then((result) => {
      if (result.ok) {
        setAthletes(result.athletes);
      }
    });
  }, []);

  const handleAthleteUpdated = useCallback((updated: ForjaBondedAthlete) => {
    setAthletes((current) =>
      current.map((row) => (row.clientId === updated.clientId ? { ...row, ...updated } : row)),
    );
    if (
      updated.vtcToday !== undefined &&
      (updated.clientId === selectedClientId || selectedClientId === null)
    ) {
      setFeedEntries((current) =>
        current.map((entry) =>
          entry.clientId === updated.clientId
            ? patchFeedEntryVtcAfterAdjust(entry, updated.vtcToday ?? entry.vtcToday)
            : entry,
        ),
      );
    }
  }, [selectedClientId]);

  const emptyMessage = FORJA_COPY.emptyAthletesSovereign;

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
            <h1 className={`${FORJA_PAGE_TITLE} mt-1`}>{FORJA_COPY.monitor.title}</h1>
            <p className={`${FORJA_META} mt-1.5 max-w-2xl`}>
              Acompanhe o{" "}
              <strong className="font-medium text-zinc-200">Volume de Carga Máxima (VTC)</strong> de
              todos os clientes da academia em tempo real.
            </p>
            <p className={`${FORJA_META} mt-1 max-w-2xl text-zinc-500`}>
              Todos os forjadores podem consultar; suspensões e punições ficam exclusivamente com o{" "}
              <strong className="font-medium text-zinc-400">Forjador Soberano</strong>.
            </p>
          </div>
          <ForjaSignOutButton className="shrink-0" />
        </header>

        <nav aria-label="Navegação forjador" className="mt-4 flex flex-wrap gap-2">
          {resolveForjadorWorkspaceNav(payload.operator.isSovereign).map((item) => {
            const isActive = item.href === "/forjador/monitoramento";
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

        <div className="mt-6">
          <ForjaMonitorStatsBar stats={stats} />
        </div>

        <div className={`${FORJA_LAYOUT} mt-5`}>
          <aside aria-label="Lista de clientes">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className={FORJA_SECTION_CHIP}>{FORJA_COPY.sidebarSovereign}</p>
              <span className="text-xs tabular-nums text-zinc-600">{filteredAthletes.length}</span>
            </div>

            <div className="mb-3">
              <ForjaMonitorSegmentFilter
                value={segment}
                onChange={setSegment}
                counts={segmentCounts}
              />
            </div>

            <ForjaAthleteSidebar
              athletes={filteredAthletes}
              selectedClientId={selectedClientId}
              onSelect={handleSelectAthlete}
              emptyMessage={emptyMessage}
              splitByVip={false}
              searchable
            />
          </aside>

          <div className={`${FORJA_COMMAND_PANEL} space-y-4`}>
            <ForjaVtcPhaseReferencePanel />

            <ForjaVtcFeedPanel
              selectedClientId={selectedClientId}
              onSelectClient={handleSelectAthlete}
              refreshVersion={feedVersion}
              onFeedLoaded={handleFeedLoaded}
              vipBondByClientId={vipBondByClientId}
              clientAlertSeverity={clientAlertSeverity}
            />

            <ForjaAntiFraudPanel
              athlete={selectedAthlete}
              isSovereign={payload.operator.isSovereign}
              scopeClientId={selectedAthlete?.clientId ?? null}
              selectedClientId={selectedClientId}
              showGlobalWhenEmpty
              onSelectClient={handleSelectAthlete}
              onClearSelection={handleClearSelection}
              onActionComplete={handleMonitorRefresh}
              onAthleteUpdated={handleAthleteUpdated}
              onSignalsLoaded={handleSignalsLoaded}
            />
          </div>
        </div>

        <FenyxiaBrandFooter className="mt-8" />
      </section>
    </main>
  );
}
