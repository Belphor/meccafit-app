"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ForjaAntiFraudPanel } from "@/app/dashboard/forja/ForjaAntiFraudPanel";
import { ForjaSignOutButton } from "@/app/dashboard/forja/ForjaSignOutButton";
import { ForjaVtcFeedPanel } from "@/app/dashboard/forja/ForjaVtcFeedPanel";
import { ForjaAthleteSidebar } from "@/components/forjador/forja-athlete-sidebar";
import { ForjaMonitorSegmentFilter } from "@/components/forjador/forja-monitor-segment-filter";
import { ForjaMonitorStatsBar } from "@/components/forjador/forja-monitor-stats-bar";
import { MeccafitCenterBrand } from "@/components/MeccafitCenterBrand";
import { FenyxiaBrandFooter } from "@/components/FenyxiaBrandFooter";
import {
  FORJA_AMBIENT,
  FORJA_COMMAND_PANEL,
  FORJA_GHOST_BUTTON,
  FORJA_LAYOUT,
  FORJA_META,
  FORJA_PAGE_TITLE,
  FORJA_SECTION_CHIP,
  FORJA_SHELL,
} from "@/lib/forja-config";
import { FORJA_COPY, resolveForjaRoleLabel } from "@/lib/forja-copy";
import type { ForjaDashboardPayload, ForjaVtcFeedEntry } from "@/lib/forja-dashboard";
import {
  computeMonitorStats,
  filterAthletesByMonitorSegment,
  type ForjaMonitorSegment,
} from "@/lib/forja-monitor-utils";
import { FORJADOR_WORKSPACE_NAV } from "@/lib/forjador-vip-nav";

type MonitoramentoPageClientProps = {
  payload: ForjaDashboardPayload;
};

export function MonitoramentoPageClient({ payload }: MonitoramentoPageClientProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [segment, setSegment] = useState<ForjaMonitorSegment>("todos");
  const [feedEntries, setFeedEntries] = useState<ForjaVtcFeedEntry[]>([]);
  const [feedVersion, setFeedVersion] = useState(0);

  const filteredAthletes = useMemo(
    () => filterAthletesByMonitorSegment(payload.athletes, segment, payload.operator.userId),
    [payload.athletes, payload.operator.userId, segment],
  );

  const segmentCounts = useMemo(
    () => ({
      todos: payload.athletes.length,
      vip: payload.athletes.filter((athlete) => athlete.hasVipBond).length,
      comum: payload.athletes.filter((athlete) => !athlete.hasVipBond).length,
      meus: payload.athletes.filter((athlete) => !athlete.isGlobalListing).length,
    }),
    [payload.athletes],
  );

  const stats = useMemo(
    () => computeMonitorStats(payload.athletes, payload.operator.userId, feedEntries),
    [feedEntries, payload.athletes, payload.operator.userId],
  );

  const athleteById = useMemo(() => {
    const map = new Map(payload.athletes.map((a) => [a.clientId, a]));
    return map;
  }, [payload.athletes]);

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
  }, []);

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
            <p className={`${FORJA_META} mt-1.5 max-w-2xl`}>{FORJA_COPY.monitor.hint}</p>
            <p className={`${FORJA_META} mt-1 max-w-2xl text-zinc-500`}>
              {FORJA_COPY.monitor.globalHint}
            </p>
          </div>
          <ForjaSignOutButton className="shrink-0" />
        </header>

        <nav aria-label="Navegação forjador" className="mt-4 flex flex-wrap gap-2">
          {FORJADOR_WORKSPACE_NAV.map((item) => {
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={FORJA_SECTION_CHIP}>
                {selectedAthlete
                  ? `${FORJA_COPY.monitor.clientDetail} · ${selectedAthlete.displayName}`
                  : FORJA_COPY.monitor.globalAlerts}
              </p>
              {selectedClientId ? (
                <button
                  type="button"
                  className={FORJA_GHOST_BUTTON}
                  onClick={handleClearSelection}
                >
                  {FORJA_COPY.monitor.clearSelection}
                </button>
              ) : null}
            </div>

            <ForjaVtcFeedPanel
              selectedClientId={selectedClientId}
              onSelectClient={handleSelectAthlete}
              refreshVersion={feedVersion}
              onFeedLoaded={handleFeedLoaded}
            />

            <ForjaAntiFraudPanel
              athlete={selectedAthlete}
              isSovereign={payload.operator.isSovereign}
              scopeClientId={selectedAthlete?.clientId ?? null}
              showGlobalWhenEmpty
              onSelectClient={handleSelectAthlete}
              onActionComplete={handleMonitorRefresh}
            />
          </div>
        </div>

        <FenyxiaBrandFooter className="mt-8" />
      </section>
    </main>
  );
}
