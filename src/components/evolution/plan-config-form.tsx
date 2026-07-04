"use client";

import { useCallback, useMemo, useState } from "react";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
  DASHBOARD_TAP_TARGET,
  EVOLUTION_HINT,
  EVOLUTION_SECTION_SUBTITLE,
} from "@/lib/dashboard-config";
import { clientSyncPlanoMeta } from "@/lib/academia-actions";
import {
  buildMetaSyncLockedMessagePt,
  buildMonthLengthHintPt,
  formatMonthLabelPt,
  isMetaSyncedForCurrentMonth,
  resolveCurrentMonthKeySp,
  resolveDaysUntilCycleResetSp,
} from "@/lib/meta-sync-calendar";
import { LoreEm } from "@/lib/lore-emphasis";
import { VTC_DISPLAY_NAME, formatVtcKg } from "@/lib/vtc-labels";

export const PLAN_SESSIONS_MIN = 4;
export const PLAN_SESSIONS_MAX = 28;
export const PLAN_SESSIONS_DEFAULT = 16;

export type AthletePlanConfig = {
  totalTreinosMensaisPlanejados: number;
  metaSyncMes?: string | null;
};

export type PlanConfigFormState = {
  totalTreinosMensaisPlanejados: number;
};

type PlanConfigFormProps = {
  userId: string;
  initialPlan?: AthletePlanConfig;
  currentMetaVtcMensalKg?: number;
  onSyncComplete?: () => void;
  /** Dentro do card de Consistência — sem wrapper BrasaVivaCard */
  embedded?: boolean;
};

type SyncPhase = "idle" | "syncing" | "success" | "error";

function clampSessions(value: number): number {
  return Math.min(PLAN_SESSIONS_MAX, Math.max(PLAN_SESSIONS_MIN, Math.round(value)));
}

function monthlySessionsToDaysPerWeek(monthlySessions: number): number {
  return Math.min(7, Math.max(1, Math.round((monthlySessions * 7) / 30)));
}

function monthlySessionsToMetaFactor(monthlySessions: number): number {
  return Math.max(0.5, clampSessions(monthlySessions) / PLAN_SESSIONS_DEFAULT);
}

function buildPlanState(initialPlan?: AthletePlanConfig): PlanConfigFormState {
  return {
    totalTreinosMensaisPlanejados: clampSessions(
      initialPlan?.totalTreinosMensaisPlanejados ?? PLAN_SESSIONS_DEFAULT,
    ),
  };
}

function planStatesEqual(a: PlanConfigFormState, b: PlanConfigFormState): boolean {
  return a.totalTreinosMensaisPlanejados === b.totalTreinosMensaisPlanejados;
}

type PlanSessionsSliderProps = {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
};

function PlanSessionsSlider({ value, disabled, onChange }: PlanSessionsSliderProps) {
  const span = PLAN_SESSIONS_MAX - PLAN_SESSIONS_MIN;
  const fillPercent = span > 0 ? ((value - PLAN_SESSIONS_MIN) / span) * 100 : 0;

  return (
    <div className="mt-5 space-y-3">
      <div className="relative h-2 rounded-full bg-neutral-900 ring-1 ring-orange-500/10">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-600/35 via-emerald-500/55 to-amber-500/45 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
          style={{ width: `${fillPercent}%` }}
          aria-hidden
        />
        <input
          type="range"
          min={PLAN_SESSIONS_MIN}
          max={PLAN_SESSIONS_MAX}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-50 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-emerald-200/70 [&::-moz-range-thumb]:bg-emerald-400 [&::-moz-range-thumb]:shadow-[0_0_14px_rgba(16,185,129,0.55)] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-emerald-200/70 [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:shadow-[0_0_14px_rgba(16,185,129,0.55)]"
          aria-valuemin={PLAN_SESSIONS_MIN}
          aria-valuemax={PLAN_SESSIONS_MAX}
          aria-valuenow={value}
          aria-label="Dias de treino planejados no mês"
        />
      </div>
      <div className="flex justify-between text-xs text-neutral-500">
        <span>{PLAN_SESSIONS_MIN}</span>
        <span>mínimo e máximo</span>
        <span>{PLAN_SESSIONS_MAX}</span>
      </div>
    </div>
  );
}

export function PlanConfigForm({
  initialPlan,
  currentMetaVtcMensalKg,
  onSyncComplete,
  embedded = false,
}: PlanConfigFormProps) {
  const [syncedBaseline, setSyncedBaseline] = useState<PlanConfigFormState>(() =>
    buildPlanState(initialPlan),
  );
  const [draft, setDraft] = useState<PlanConfigFormState>(() => buildPlanState(initialPlan));
  const [metaSyncMes, setMetaSyncMes] = useState<string | null>(initialPlan?.metaSyncMes ?? null);
  const [phase, setPhase] = useState<SyncPhase>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  const syncedThisMonth = isMetaSyncedForCurrentMonth(metaSyncMes);
  const currentMonthLabel = formatMonthLabelPt();
  const syncLocked = syncedThisMonth;
  const cycleResetMessage = buildMetaSyncLockedMessagePt();
  const monthLengthHint = buildMonthLengthHintPt();

  const hasLocalChanges = useMemo(
    () => !planStatesEqual(draft, syncedBaseline),
    [draft, syncedBaseline],
  );

  const daysPerWeekHint = useMemo(
    () => monthlySessionsToDaysPerWeek(draft.totalTreinosMensaisPlanejados),
    [draft.totalTreinosMensaisPlanejados],
  );

  const estimatedMetaVtcMensalKg = useMemo(() => {
    if (typeof currentMetaVtcMensalKg !== "number" || !Number.isFinite(currentMetaVtcMensalKg)) {
      return null;
    }

    const currentFactor = monthlySessionsToMetaFactor(
      syncedBaseline.totalTreinosMensaisPlanejados,
    );
    const nextFactor = monthlySessionsToMetaFactor(draft.totalTreinosMensaisPlanejados);
    const baseMeta = currentMetaVtcMensalKg / currentFactor;

    return Math.round(baseMeta * nextFactor);
  }, [
    currentMetaVtcMensalKg,
    draft.totalTreinosMensaisPlanejados,
    syncedBaseline.totalTreinosMensaisPlanejados,
  ]);

  const clearTransientFeedback = useCallback(() => {
    setPhase("idle");
    setFeedback(null);
  }, []);

  const handleSessionsChange = useCallback(
    (value: number) => {
      setDraft((prev) => ({
        ...prev,
        totalTreinosMensaisPlanejados: clampSessions(value),
      }));
      clearTransientFeedback();
    },
    [clearTransientFeedback],
  );

  const handleSync = useCallback(async () => {
    setPhase("syncing");
    setFeedback(null);

    try {
      const result = await clientSyncPlanoMeta(draft.totalTreinosMensaisPlanejados);

      if (!result.ok) {
        setPhase("error");
        setFeedback(result.message);
        return;
      }

      const mes = String(result.data.meta_sync_mes ?? resolveCurrentMonthKeySp());
      const syncedMeta = Number(result.data.meta_vtc_mensal_kg ?? estimatedMetaVtcMensalKg ?? 0);
      setMetaSyncMes(mes);
      setSyncedBaseline(draft);
      setPhase("success");
      setFeedback(
        syncedMeta > 0
          ? `Meta sincronizada para ${formatMonthLabelPt(mes.slice(0, 7))}: ${formatVtcKg(syncedMeta)}.`
          : `Meta sincronizada para ${formatMonthLabelPt(mes.slice(0, 7))}.`,
      );
      onSyncComplete?.();
    } catch {
      setPhase("error");
      setFeedback("Falha de rede ao sincronizar a meta de treino.");
    }
  }, [draft, estimatedMetaVtcMensalKg, onSyncComplete]);

  const isSyncing = phase === "syncing";

  const content = (
    <>
      {!embedded ? (
        <DashboardPanelHeader chip="Meta de treino" meta="Evolução e consistência" />
      ) : null}

      <header className={`${embedded ? "mt-4" : "mt-4 border-b border-orange-500/10 pb-5 sm:pb-6"}`}>
        <h2 id="plan-config-title" className={DASHBOARD_SECTION_TITLE}>
          {embedded ? "Defina sua meta de treino" : "Quantos dias você vai treinar"}
        </h2>
        <p className={`mt-2 max-w-prose ${EVOLUTION_SECTION_SUBTITLE}`}>
          {embedded ? (
            <>
              <strong className="font-bold tracking-[0.04em] text-amber-50">COMECE POR AQUI</strong>
              <br />
              Defina quantos dias você pretende treinar nos próximos 30 dias. Esse compromisso vira a
              meta mensal de <LoreEm>{VTC_DISPLAY_NAME}</LoreEm> do <LoreEm>Ritmo da Fênix</LoreEm>.
            </>
          ) : (
            <>
              Defina quantos dias você pretende treinar nos próximos 30 dias. Esse plano calcula a meta
              mensal de <LoreEm>{VTC_DISPLAY_NAME}</LoreEm> do <LoreEm>Ritmo da Fênix</LoreEm>; o mapa
              corporal reage a esse ritmo. Sincronize uma vez por mês civil ({currentMonthLabel},
              horário de Brasília).
            </>
          )}
        </p>
        <p className={`mt-2 ${EVOLUTION_HINT}`}>{monthLengthHint}</p>
        {!syncedThisMonth ? (
          <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-950/25 px-3 py-2.5 text-sm leading-relaxed text-amber-100">
            Você ainda não sincronizou a meta de {currentMonthLabel}. Ajuste o valor e toque em
            Sincronizar meta.
          </p>
        ) : (
          <p className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-2.5 text-sm leading-relaxed text-emerald-100">
            Meta sincronizada para {currentMonthLabel}. {cycleResetMessage}
          </p>
        )}
      </header>

      <div className={`${embedded ? "mt-5" : "mt-6"} space-y-6 ${DASHBOARD_INNER_FRAME}`}>
        <section aria-labelledby="plan-sessions-label" className="space-y-3">
          <p id="plan-sessions-label" className="text-sm leading-relaxed text-neutral-300">
            Dias de treino planejados: {draft.totalTreinosMensaisPlanejados}
            <span className="text-neutral-500">
              {";"} cerca de {daysPerWeekHint} {daysPerWeekHint === 1 ? "dia" : "dias"} por semana.
            </span>
          </p>

          <PlanSessionsSlider
            value={draft.totalTreinosMensaisPlanejados}
            disabled={isSyncing || syncLocked}
            onChange={handleSessionsChange}
          />
        </section>

        {estimatedMetaVtcMensalKg ? (
          <p className="text-sm leading-relaxed text-neutral-400">
            Meta estimada do <LoreEm>Ritmo da Fênix</LoreEm>:{" "}
            <span className="font-mono font-semibold text-amber-100">
              {formatVtcKg(estimatedMetaVtcMensalKg)}
            </span>{"."} A referência é o limiar Faísca da academia para 16 treinos; planos menores respeitam uma
            meta mínima para manter a forja justa.
          </p>
        ) : null}

        {!embedded ? (
          <p className="text-sm leading-relaxed text-neutral-400">
            <LoreEm>Ritmo da Fênix</LoreEm> mede quanto da sua meta mensal de{" "}
            <LoreEm>{VTC_DISPLAY_NAME}</LoreEm> você já acumulou. A meta nasce dos dias planejados, e
            abaixo de 50% as cores do mapa ficam mais suaves após o período de acolhimento.
          </p>
        ) : null}
      </div>

      <footer
        className={`flex flex-col gap-3 ${embedded ? "mt-5 px-4 pb-5 sm:px-5" : "mt-6 border-t border-orange-500/10 pt-5"} sm:flex-row sm:items-center sm:justify-between`}
      >
        <div className="min-w-0 flex-1">
          {feedback ? (
            <p
              className={`text-sm leading-relaxed ${phase === "error" ? "text-red-400" : "text-emerald-300"
                }`}
              role={phase === "error" ? "alert" : "status"}
            >
              {feedback}
            </p>
          ) : hasLocalChanges ? (
            <p className="text-sm text-amber-200">Alterações aguardando sincronização.</p>
          ) : syncLocked ? (
            <p className={EVOLUTION_HINT}>
              Próxima sincronização em {resolveDaysUntilCycleResetSp()}{" "}
              {resolveDaysUntilCycleResetSp() === 1 ? "dia" : "dias"}. {cycleResetMessage}
            </p>
          ) : (
            <p className={EVOLUTION_HINT}>Uma sincronização por mês civil (horário de Brasília).</p>
          )}
        </div>

        <button
          type="button"
          disabled={isSyncing || syncLocked}
          onClick={() => void handleSync()}
          className={`${DASHBOARD_TAP_TARGET} min-h-11 w-full shrink-0 rounded-full border border-emerald-500/30 bg-neutral-950/75 px-6 py-2.5 text-xs font-semibold text-emerald-100 transition hover:shadow-[0_0_16px_rgba(16,185,129,0.28)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[13rem] sm:w-auto`}
        >
          {isSyncing ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-emerald-300/30 border-t-emerald-400"
                aria-hidden
              />
              Sincronizando...
            </span>
          ) : syncLocked ? (
            "Meta bloqueada neste mês"
          ) : (
            "Sincronizar meta"
          )}
        </button>
      </footer>
    </>
  );

  if (embedded) {
    return (
      <div className="px-4 pt-1 sm:px-5" aria-labelledby="plan-config-title">
        {content}
      </div>
    );
  }

  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      className={DASHBOARD_PANEL_FRAME}
      aria-labelledby="plan-config-title"
    >
      {content}
    </BrasaVivaCard>
  );
}
