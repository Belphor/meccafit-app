"use client";

import { memo, useCallback, useEffect, useState } from "react";
import {
  FORJA_COMMAND_INNER,
  FORJA_DANGER_BUTTON,
  FORJA_EMPTY_STATE,
  FORJA_FEEDBACK_ERROR,
  FORJA_FEEDBACK_OK,
  FORJA_GHOST_BUTTON,
  FORJA_INPUT,
  FORJA_LABEL,
  FORJA_META,
  FORJA_PRIMARY_BUTTON,
  FORJA_SECTION_CHIP,
  FORJA_SECTION_TITLE,
} from "@/lib/forja-config";
import { FORJA_COPY } from "@/lib/forja-copy";
import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";
import { resolveAccountAccessDisplay } from "@/lib/account-access-status";
import {
  patchAthleteVtcAfterAdjust,
  resolveFraudSignalMessage,
  resolveFraudSignalTitle,
} from "@/lib/forja-monitor-utils";
import type { ForjaActionResult } from "@/lib/forja-sovereign-actions";
import {
  fetchForjaFraudSignals,
  forjaAdjustClientVtc,
  sovereignDeactivateAccount,
  sovereignModifyStatistics,
  sovereignPurifyToAshes,
  sovereignReactivateAccount,
  type ForjaFraudSignal,
} from "@/lib/forja-sovereign-actions";

type ForjaAntiFraudPanelProps = {
  athlete: ForjaBondedAthlete | null;
  isSovereign: boolean;
  canAdjustVtc?: boolean;
  scopeClientId?: string | null;
  /** Quando true, mostra alertas de todos os clientes se nenhum estiver selecionado. */
  showGlobalWhenEmpty?: boolean;
  onSelectClient?: (clientId: string) => void;
  onActionComplete?: () => void;
  onAthleteUpdated?: (athlete: ForjaBondedAthlete) => void;
  onSignalsLoaded?: (signals: ForjaFraudSignal[]) => void;
  onClearSelection?: () => void;
  selectedClientId?: string | null;
};

type PanelPhase = "idle" | "loading" | "acting" | "error";

function severityClass(severity: ForjaFraudSignal["severity"]): string {
  return severity === "critical"
    ? "border-red-900/50 bg-red-950/25 text-red-200/90"
    : "border-amber-900/40 bg-amber-950/20 text-amber-100/90";
}

function ForjaAntiFraudPanelComponent({
  athlete,
  isSovereign,
  canAdjustVtc = true,
  scopeClientId,
  showGlobalWhenEmpty = false,
  onSelectClient,
  onActionComplete,
  onAthleteUpdated,
  onSignalsLoaded,
  onClearSelection,
  selectedClientId,
}: ForjaAntiFraudPanelProps) {
  const [signals, setSignals] = useState<ForjaFraudSignal[]>([]);
  const [phase, setPhase] = useState<PanelPhase>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [phaseTierDraft, setPhaseTierDraft] = useState("1");
  const [vtcSetDraft, setVtcSetDraft] = useState("");
  const [resetVtcToday, setResetVtcToday] = useState(false);

  const loadSignals = useCallback(async () => {
    setPhase("loading");
    setFeedback(null);

    const clientScope = scopeClientId ?? athlete?.clientId ?? null;
    const useGlobal = showGlobalWhenEmpty && !clientScope;
    const result = await fetchForjaFraudSignals(useGlobal ? null : clientScope);

    if (!result.ok) {
      setPhase("error");
      setFeedback(result.message);
      setSignals([]);
      return;
    }

    setSignals(result.signals);
    onSignalsLoaded?.(result.signals);
    setPhase("idle");
  }, [athlete?.clientId, scopeClientId, showGlobalWhenEmpty, onSignalsLoaded]);

  useEffect(() => {
    void loadSignals();
  }, [loadSignals]);

  useEffect(() => {
    if (athlete) {
      setPhaseTierDraft(String(athlete.phaseTier));
      setVtcSetDraft("");
      setResetVtcToday(false);
    }
  }, [athlete?.clientId, athlete?.phaseTier, athlete?.statusAltar]);

  const applyAthletePatch = useCallback(
    (patch: Partial<ForjaBondedAthlete>) => {
      if (!athlete) return;
      onAthleteUpdated?.({ ...athlete, ...patch });
    },
    [athlete, onAthleteUpdated],
  );

  const runSovereignAction = useCallback(
    async (
      action: () => Promise<ForjaActionResult>,
      patch?: Partial<ForjaBondedAthlete>,
    ) => {
      if (!athlete || !isSovereign) return;

      setPhase("acting");
      setFeedback(null);

      const result = await action();

      if (!result.ok) {
        setPhase("error");
        setFeedback(result.message ?? "Operação recusada.");
        return;
      }

      if (patch) {
        applyAthletePatch(patch);
      }

      setPhase("idle");
      setFeedback(FORJA_COPY.monitor.actionSuccess);
      setVtcSetDraft("");
      setResetVtcToday(false);
      await loadSignals();
      onActionComplete?.();
    },
    [applyAthletePatch, athlete, isSovereign, loadSignals, onActionComplete],
  );

  const handlePurify = useCallback(() => {
    if (!athlete || !window.confirm(FORJA_COPY.monitor.purifyConfirm(athlete.displayName))) {
      return;
    }
    void runSovereignAction(
      () => sovereignPurifyToAshes(athlete.clientId),
      { phaseTier: 1, statusAltar: "Purificado", vtcToday: 0 },
    );
  }, [athlete, runSovereignAction]);

  const handleDeactivate = useCallback(() => {
    if (!athlete || !window.confirm(FORJA_COPY.monitor.deactivateConfirm(athlete.displayName))) {
      return;
    }
    void runSovereignAction(
      () => sovereignDeactivateAccount(athlete.clientId, "Monitoramento"),
      { statusAltar: "Suspenso" },
    );
  }, [athlete, runSovereignAction]);

  const handleReactivate = useCallback(() => {
    if (!athlete) return;
    void runSovereignAction(
      () => sovereignReactivateAccount(athlete.clientId),
      { statusAltar: "Ativo" },
    );
  }, [athlete, runSovereignAction]);

  const handleModifyStats = useCallback(() => {
    if (!athlete) return;

    const phaseTier = phaseTierDraft.trim()
      ? Number.parseInt(phaseTierDraft, 10)
      : undefined;
    const vtcSet = vtcSetDraft.trim() ? Number(vtcSetDraft) : undefined;

    if (
      phaseTier !== undefined &&
      (!Number.isFinite(phaseTier) || phaseTier < 1 || phaseTier > 5)
    ) {
      setFeedback(FORJA_COPY.monitor.invalidPhase);
      setPhase("error");
      return;
    }

    if (
      phaseTier === undefined &&
      !resetVtcToday &&
      (vtcSet === undefined || !Number.isFinite(vtcSet) || vtcSet < 0)
    ) {
      setFeedback(FORJA_COPY.monitor.invalidVtc);
      setPhase("error");
      return;
    }

    const patch: Partial<ForjaBondedAthlete> = {};
    if (phaseTier !== undefined) patch.phaseTier = phaseTier;
    if (resetVtcToday) {
      Object.assign(patch, patchAthleteVtcAfterAdjust(athlete, 0));
    } else if (Number.isFinite(vtcSet) && vtcSet !== undefined) {
      Object.assign(patch, patchAthleteVtcAfterAdjust(athlete, vtcSet));
    }

    void runSovereignAction(
      () =>
        sovereignModifyStatistics(athlete.clientId, {
          ...(phaseTier !== undefined ? { phase_tier: phaseTier } : {}),
          ...(resetVtcToday ? { reset_vtc_today: true } : {}),
          ...(Number.isFinite(vtcSet) && vtcSet !== undefined && !resetVtcToday
            ? { vtc_today_set: vtcSet }
            : {}),
        }),
      patch,
    );
  }, [athlete, phaseTierDraft, resetVtcToday, runSovereignAction, vtcSetDraft]);

  const handleAdjustVtc = useCallback(() => {
    if (!athlete || !canAdjustVtc) return;

    const vtcSet = vtcSetDraft.trim() ? Number(vtcSetDraft) : undefined;

    if (
      !resetVtcToday &&
      (vtcSet === undefined || !Number.isFinite(vtcSet) || vtcSet < 0)
    ) {
      setFeedback(FORJA_COPY.monitor.invalidVtc);
      setPhase("error");
      return;
    }

    const patch: Partial<ForjaBondedAthlete> = {};
    if (resetVtcToday) {
      Object.assign(patch, patchAthleteVtcAfterAdjust(athlete, 0));
    } else if (Number.isFinite(vtcSet) && vtcSet !== undefined) {
      Object.assign(patch, patchAthleteVtcAfterAdjust(athlete, vtcSet));
    }

    setPhase("acting");
    setFeedback(null);

    void forjaAdjustClientVtc(athlete.clientId, {
      ...(resetVtcToday ? { reset_vtc_today: true } : {}),
      ...(Number.isFinite(vtcSet) && vtcSet !== undefined && !resetVtcToday
        ? { vtc_today_set: vtcSet }
        : {}),
    }).then(async (result) => {
      if (!result.ok) {
        setPhase("error");
        setFeedback(result.message ?? "Operação recusada.");
        return;
      }

      const serverToday = Number(result.data?.vtc_today);
      const server30d = Number(result.data?.vtc_30d);
      if (Number.isFinite(serverToday) && Number.isFinite(server30d)) {
        applyAthletePatch({ vtcToday: serverToday, vtc30d: server30d });
      } else {
        applyAthletePatch(patch);
      }
      setPhase("idle");
      setFeedback(FORJA_COPY.monitor.adjustVtcSuccess);
      setVtcSetDraft("");
      setResetVtcToday(false);
      await loadSignals();
      onActionComplete?.();
    });
  }, [
    applyAthletePatch,
    athlete,
    canAdjustVtc,
    loadSignals,
    onActionComplete,
    resetVtcToday,
    vtcSetDraft,
  ]);

  const isBusy = phase === "loading" || phase === "acting";
  const isGlobalView = showGlobalWhenEmpty && !athlete && !scopeClientId;
  const panelTitle = isGlobalView
    ? FORJA_COPY.monitor.globalAlerts
    : (athlete?.displayName ?? "—");
  const panelHint = isGlobalView
    ? FORJA_COPY.monitor.globalHint
    : athlete
      ? FORJA_COPY.monitor.clientSelectedHint
      : FORJA_COPY.monitor.hint;
  const emptyLabel = isGlobalView ? FORJA_COPY.monitor.globalEmpty : FORJA_COPY.monitor.empty;

  return (
    <section aria-label="Monitoramento de clientes">
      <div className={FORJA_COMMAND_INNER}>
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div>
            <p className={FORJA_SECTION_CHIP}>{FORJA_COPY.monitor.title}</p>
            <h2 className={`${FORJA_SECTION_TITLE} mt-1`}>{panelTitle}</h2>
            <p className={`${FORJA_META} mt-1`}>{panelHint}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedClientId && onClearSelection ? (
              <button type="button" className={FORJA_GHOST_BUTTON} onClick={onClearSelection}>
                {FORJA_COPY.monitor.clearSelection}
              </button>
            ) : null}
            <button
              type="button"
              className={FORJA_GHOST_BUTTON}
              disabled={isBusy}
              onClick={() => void loadSignals()}
            >
              {FORJA_COPY.monitor.refresh}
            </button>
          </div>
        </header>

        <div className="mt-4 space-y-2">
          {signals.length === 0 ? (
            <p className={`${FORJA_META} rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center`}>
              {phase === "loading" ? FORJA_COPY.monitor.loading : emptyLabel}
            </p>
          ) : (
            signals.map((signal, index) => (
              <details
                key={`${signal.code}-${signal.atleta_id}`}
                open={index === 0}
                className={[
                  "group rounded-xl border text-sm",
                  severityClass(signal.severity),
                ].join(" ")}
              >
                <summary
                  className={[
                    "cursor-pointer list-none px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden",
                    onSelectClient ? "hover:brightness-110" : "",
                  ].join(" ")}
                  onClick={() => {
                    onSelectClient?.(signal.atleta_id);
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    {resolveFraudSignalTitle(signal)}
                  </p>
                  <p className="mt-1 font-medium text-zinc-200">{signal.display_name}</p>
                  <p className="mt-1 text-[10px] text-zinc-500 group-open:hidden">
                    {FORJA_COPY.monitor.alertExpandHint}
                  </p>
                </summary>
                <div className="border-t border-current/10 px-4 pb-3 pt-2">
                  <p className="text-xs leading-relaxed opacity-90">
                    {resolveFraudSignalMessage(signal)}
                  </p>
                </div>
              </details>
            ))
          )}
        </div>

        {!isSovereign ? (
          <p className={`${FORJA_META} mt-4 rounded-xl border border-zinc-800/80 px-4 py-3`}>
            {FORJA_COPY.monitor.readOnly}
          </p>
        ) : null}
      </div>

      {canAdjustVtc && athlete ? (
        <div className={`${FORJA_COMMAND_INNER} mt-4`}>
          <p className={FORJA_SECTION_CHIP}>{FORJA_COPY.monitor.vtcToday}</p>
          <p className={`${FORJA_META} mt-2`}>
            {athlete.displayName} · hoje: {Math.round(athlete.vtcToday ?? 0)} kg · últimos 30 dias:{" "}
            {Math.round(athlete.vtc30d ?? 0).toLocaleString("pt-BR")} kg
          </p>
          <p className={`${FORJA_META} mt-1 text-zinc-500`}>{FORJA_COPY.monitor.vtcTodayHint}</p>

          <div className="mt-4">
            <label htmlFor="forja-vtc-set" className={FORJA_LABEL}>
              {FORJA_COPY.monitor.vtcTodaySet}
            </label>
            <input
              id="forja-vtc-set"
              type="number"
              min={0}
              step={1}
              value={vtcSetDraft}
              onChange={(event) => setVtcSetDraft(event.target.value)}
              placeholder={`Atual: ${Math.round(athlete.vtcToday ?? 0)} kg`}
              className={FORJA_INPUT}
              disabled={isBusy || resetVtcToday}
            />
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={resetVtcToday}
              onChange={(event) => setResetVtcToday(event.target.checked)}
              disabled={isBusy}
            />
            {FORJA_COPY.monitor.vtcResetToday}
          </label>

          <div className="mt-4">
            <button
              type="button"
              className={FORJA_PRIMARY_BUTTON}
              disabled={isBusy}
              onClick={handleAdjustVtc}
            >
              {FORJA_COPY.monitor.adjustVtc}
            </button>
          </div>
        </div>
      ) : null}

      {isSovereign && athlete ? (
        <div className={`${FORJA_COMMAND_INNER} mt-4 border-red-950/30`}>
          <p className={FORJA_SECTION_CHIP}>{FORJA_COPY.monitor.tribunal}</p>
          <p className={`${FORJA_META} mt-2`}>
            {athlete.displayName}
            {` · ${resolveAccountAccessDisplay(athlete.statusAltar).label}`}
          </p>
          <p className={`${FORJA_META} mt-1 text-zinc-500`}>{FORJA_COPY.monitor.tribunalHint}</p>
          <p className={`${FORJA_META} mt-2 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2 text-zinc-500`}>
            {FORJA_COPY.monitor.resetMonthHint}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="forja-phase-tier" className={FORJA_LABEL}>
                {FORJA_COPY.monitor.phase}
              </label>
              <input
                id="forja-phase-tier"
                type="number"
                min={1}
                max={5}
                value={phaseTierDraft}
                onChange={(event) => setPhaseTierDraft(event.target.value)}
                className={FORJA_INPUT}
                disabled={isBusy}
              />
              <p className={`${FORJA_META} mt-1.5 text-zinc-500`}>{FORJA_COPY.monitor.phaseHint}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className={FORJA_PRIMARY_BUTTON}
              disabled={isBusy}
              onClick={handleModifyStats}
            >
              {FORJA_COPY.monitor.modifyStats}
            </button>
            <button type="button" className={FORJA_GHOST_BUTTON} disabled={isBusy} onClick={handleReactivate}>
              {FORJA_COPY.monitor.reactivate}
            </button>
            <button type="button" className={FORJA_GHOST_BUTTON} disabled={isBusy} onClick={handleDeactivate}>
              {FORJA_COPY.monitor.deactivate}
            </button>
            <button type="button" className={FORJA_DANGER_BUTTON} disabled={isBusy} onClick={handlePurify}>
              {FORJA_COPY.monitor.purify}
            </button>
          </div>
        </div>
      ) : null}

      {isSovereign && !athlete ? (
        <div className={`${FORJA_EMPTY_STATE} mt-4`}>
          <p className={`${FORJA_META} max-w-sm`}>{FORJA_COPY.selectAthlete}</p>
        </div>
      ) : null}

      {feedback ? (
        <p
          role={phase === "error" ? "alert" : "status"}
          className={phase === "error" ? FORJA_FEEDBACK_ERROR : FORJA_FEEDBACK_OK}
        >
          {feedback}
        </p>
      ) : null}
    </section>
  );
}

export const ForjaAntiFraudPanel = memo(ForjaAntiFraudPanelComponent);
