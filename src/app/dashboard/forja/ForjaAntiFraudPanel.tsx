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
import type { ForjaActionResult } from "@/lib/forja-sovereign-actions";
import {
  fetchForjaFraudSignals,
  sovereignDeactivateAccount,
  sovereignModifyStatistics,
  sovereignPurifyToAshes,
  sovereignReactivateAccount,
  type ForjaFraudSignal,
} from "@/lib/forja-sovereign-actions";

type ForjaAntiFraudPanelProps = {
  athlete: ForjaBondedAthlete | null;
  isSovereign: boolean;
  scopeClientId?: string | null;
};

type PanelPhase = "idle" | "loading" | "acting" | "error";

const SEVERITY_LABELS: Record<ForjaFraudSignal["severity"], string> = {
  warn: "Atenção",
  critical: "Crítico",
};

function severityClass(severity: ForjaFraudSignal["severity"]): string {
  return severity === "critical"
    ? "border-red-900/50 bg-red-950/25 text-red-200/90"
    : "border-amber-900/40 bg-amber-950/20 text-amber-100/90";
}

function ForjaAntiFraudPanelComponent({
  athlete,
  isSovereign,
  scopeClientId,
}: ForjaAntiFraudPanelProps) {
  const [signals, setSignals] = useState<ForjaFraudSignal[]>([]);
  const [phase, setPhase] = useState<PanelPhase>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [phaseTierDraft, setPhaseTierDraft] = useState("1");
  const [vtcDeltaDraft, setVtcDeltaDraft] = useState("");

  const loadSignals = useCallback(async () => {
    setPhase("loading");
    setFeedback(null);

    const result = await fetchForjaFraudSignals(scopeClientId ?? athlete?.clientId ?? null);

    if (!result.ok) {
      setPhase("error");
      setFeedback(result.message);
      setSignals([]);
      return;
    }

    setSignals(result.signals);
    setPhase("idle");
  }, [athlete?.clientId, scopeClientId]);

  useEffect(() => {
    void loadSignals();
  }, [loadSignals]);

  useEffect(() => {
    if (athlete) {
      setPhaseTierDraft(String(athlete.phaseTier));
    }
  }, [athlete]);

  const runSovereignAction = useCallback(
    async (action: () => Promise<ForjaActionResult>) => {
      if (!athlete || !isSovereign) return;

      setPhase("acting");
      setFeedback(null);

      const result = await action();

      if (!result.ok) {
        setPhase("error");
        setFeedback(result.message ?? "Operação recusada.");
        return;
      }

      setPhase("idle");
      setFeedback(FORJA_COPY.monitor.actionSuccess);
      await loadSignals();
    },
    [athlete, isSovereign, loadSignals],
  );

  const handlePurify = useCallback(() => {
    if (!athlete || !window.confirm(FORJA_COPY.monitor.purifyConfirm(athlete.displayName))) {
      return;
    }
    void runSovereignAction(() => sovereignPurifyToAshes(athlete.clientId));
  }, [athlete, runSovereignAction]);

  const handleDeactivate = useCallback(() => {
    if (!athlete || !window.confirm(FORJA_COPY.monitor.deactivateConfirm(athlete.displayName))) {
      return;
    }
    void runSovereignAction(() => sovereignDeactivateAccount(athlete.clientId, "Monitor ARGOS"));
  }, [athlete, runSovereignAction]);

  const handleReactivate = useCallback(() => {
    if (!athlete) return;
    void runSovereignAction(() => sovereignReactivateAccount(athlete.clientId));
  }, [athlete, runSovereignAction]);

  const handleModifyStats = useCallback(() => {
    if (!athlete) return;

    const phaseTier = Number.parseInt(phaseTierDraft, 10);
    const vtcDelta = vtcDeltaDraft.trim() ? Number(vtcDeltaDraft) : undefined;

    if (!Number.isFinite(phaseTier) || phaseTier < 1 || phaseTier > 5) {
      setFeedback(FORJA_COPY.monitor.invalidPhase);
      setPhase("error");
      return;
    }

    void runSovereignAction(() =>
      sovereignModifyStatistics(athlete.clientId, {
        phase_tier: phaseTier,
        ...(Number.isFinite(vtcDelta) && vtcDelta !== undefined && vtcDelta > 0
          ? { vtc_today_delta: vtcDelta }
          : {}),
      }),
    );
  }, [athlete, phaseTierDraft, runSovereignAction, vtcDeltaDraft]);

  const isBusy = phase === "loading" || phase === "acting";

  return (
    <section aria-label="Monitoramento ARGOS">
      <div className={FORJA_COMMAND_INNER}>
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div>
            <p className={FORJA_SECTION_CHIP}>{FORJA_COPY.monitor.title}</p>
            <h2 className={`${FORJA_SECTION_TITLE} mt-1`}>Alertas de integridade</h2>
            <p className={`${FORJA_META} mt-1`}>{FORJA_COPY.monitor.hint}</p>
          </div>
          <button
            type="button"
            className={FORJA_GHOST_BUTTON}
            disabled={isBusy}
            onClick={() => void loadSignals()}
          >
            {FORJA_COPY.monitor.refresh}
          </button>
        </header>

        <div className="mt-4 space-y-2">
          {signals.length === 0 ? (
            <p className={`${FORJA_META} rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center`}>
              {phase === "loading" ? FORJA_COPY.monitor.loading : FORJA_COPY.monitor.empty}
            </p>
          ) : (
            signals.map((signal) => (
              <article
                key={`${signal.code}-${signal.atleta_id}`}
                className={`rounded-xl border px-4 py-3 text-sm ${severityClass(signal.severity)}`}
              >
                <p className="text-xs font-medium uppercase tracking-wide opacity-80">
                  {SEVERITY_LABELS[signal.severity]} · {signal.code.replace(/_/g, " ")}
                </p>
                <p className="mt-1 font-medium">{signal.display_name}</p>
                <p className="mt-1 text-xs leading-relaxed opacity-90">{signal.message}</p>
              </article>
            ))
          )}
        </div>

        {!isSovereign ? (
          <p className={`${FORJA_META} mt-4 rounded-xl border border-zinc-800/80 px-4 py-3`}>
            {FORJA_COPY.monitor.readOnly}
          </p>
        ) : null}
      </div>

      {isSovereign && athlete ? (
        <div className={`${FORJA_COMMAND_INNER} mt-4 border-red-950/30`}>
          <p className={FORJA_SECTION_CHIP}>{FORJA_COPY.monitor.tribunal}</p>
          <p className={`${FORJA_META} mt-2`}>
            {athlete.displayName}
            {athlete.statusAltar ? ` · ${athlete.statusAltar}` : ""}
          </p>
          <p className={`${FORJA_META} mt-1 text-zinc-500`}>{FORJA_COPY.monitor.tribunalHint}</p>

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
            </div>
            <div>
              <label htmlFor="forja-vtc-delta" className={FORJA_LABEL}>
                {FORJA_COPY.monitor.vtcToday}
              </label>
              <input
                id="forja-vtc-delta"
                type="number"
                min={0}
                step={1}
                value={vtcDeltaDraft}
                onChange={(event) => setVtcDeltaDraft(event.target.value)}
                placeholder="Opcional"
                className={FORJA_INPUT}
                disabled={isBusy}
              />
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
