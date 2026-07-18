"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ForjaAntiFraudPanel } from "@/app/dashboard/forja/ForjaAntiFraudPanel";
import { ForjaVtcFeedPanel, type ClientAlertSeverity } from "@/app/dashboard/forja/ForjaVtcFeedPanel";
import { ForjaVtcPhaseReferencePanel } from "@/app/dashboard/forja/ForjaVtcPhaseReferencePanel";
import { ForjaClientPicker } from "@/components/forjador/forja-client-picker";
import { ForjaMonitorSegmentFilter } from "@/components/forjador/forja-monitor-segment-filter";
import { ForjaMonitorStatsBar } from "@/components/forjador/forja-monitor-stats-bar";
import { ForjaWorkspaceFrame } from "@/components/forjador/forja-workspace-frame";
import { ForjaWorkspaceHeader } from "@/components/forjador/forja-workspace-header";
import { ForjaWorkspaceNav } from "@/components/forjador/forja-workspace-nav";
import { FORJA_COMMAND_PANEL, FORJA_META, FORJA_SECTION_CHIP } from "@/lib/forja-config";
import { FORJA_COPY, resolveForjaRoleLabel } from "@/lib/forja-copy";
import type { ForjaBondedAthlete, ForjaDashboardPayload, ForjaVtcFeedEntry } from "@/lib/forja-dashboard";
import {
  computeMonitorStats,
  filterAthletesByMonitorSegment,
  type ForjaMonitorSegment,
} from "@/lib/forja-monitor-utils";
import { isAccountSuspended } from "@/lib/account-access-status";
import { fetchForjaMonitorAthletes } from "@/lib/forja-sovereign-actions";
import type { ForjaFraudSignal } from "@/lib/forja-sovereign-actions";

type MonitoramentoPageClientProps = {
  payload: ForjaDashboardPayload;
};

export function MonitoramentoPageClient({ payload }: MonitoramentoPageClientProps) {
  const router = useRouter();
  const [athletes, setAthletes] = useState<ForjaBondedAthlete[]>(payload.athletes);
  const [segment, setSegment] = useState<ForjaMonitorSegment>("vip");
  const [feedEntries, setFeedEntries] = useState<ForjaVtcFeedEntry[]>([]);
  const [feedVersion, setFeedVersion] = useState(0);
  const [clientAlertSeverity, setClientAlertSeverity] = useState<
    Record<string, ClientAlertSeverity>
  >({});

  const handleSelectAthlete = useCallback(
    (clientId: string) => {
      router.push(`/forjador/monitoramento/${clientId}`);
    },
    [router],
  );

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

  const emptyMessage = FORJA_COPY.emptyAthletesSovereign;

  return (
    <ForjaWorkspaceFrame>
      <ForjaWorkspaceHeader
        chip={resolveForjaRoleLabel(payload.operator.role)}
        title={FORJA_COPY.monitor.title}
        subtitle={
          <>
            Acompanhe o{" "}
            <strong className="font-medium text-zinc-200">Volume de Carga Máxima (VTC)</strong> de
            todos os clientes da academia em tempo real. Todos os forjadores podem consultar;
            suspensões e punições ficam exclusivamente com o{" "}
            <strong className="font-medium text-zinc-400">Forjador Soberano</strong>.
          </>
        }
      />

      <ForjaWorkspaceNav
        isSovereign={payload.operator.isSovereign}
        activeHref="/forjador/monitoramento"
      />

      <div className="mt-6">
        <ForjaMonitorStatsBar stats={stats} />
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className={FORJA_SECTION_CHIP}>{FORJA_COPY.sidebarSovereign}</p>
          <span className="text-xs tabular-nums text-zinc-600">{filteredAthletes.length}</span>
        </div>

        <div className="mb-4">
          <ForjaMonitorSegmentFilter value={segment} onChange={setSegment} counts={segmentCounts} />
        </div>

        <p className={`${FORJA_META} mb-4`}>
          Pesquise pelo nome e{" "}
          <strong className="font-medium text-zinc-300">toque em um cliente</strong> para abrir o
          monitoramento dele em página própria.
        </p>

        <ForjaClientPicker
          athletes={filteredAthletes}
          onSelect={handleSelectAthlete}
          emptyMessage={emptyMessage}
        />
      </div>

      <div className={`${FORJA_COMMAND_PANEL} mt-6 space-y-4`}>
        <ForjaVtcPhaseReferencePanel />

        <ForjaVtcFeedPanel
          selectedClientId={null}
          onSelectClient={handleSelectAthlete}
          refreshVersion={feedVersion}
          onFeedLoaded={handleFeedLoaded}
          vipBondByClientId={vipBondByClientId}
          clientAlertSeverity={clientAlertSeverity}
        />

        <ForjaAntiFraudPanel
          athlete={null}
          isSovereign={payload.operator.isSovereign}
          scopeClientId={null}
          selectedClientId={null}
          showGlobalWhenEmpty
          onSelectClient={handleSelectAthlete}
          onActionComplete={handleMonitorRefresh}
          onSignalsLoaded={handleSignalsLoaded}
        />
      </div>
    </ForjaWorkspaceFrame>
  );
}
