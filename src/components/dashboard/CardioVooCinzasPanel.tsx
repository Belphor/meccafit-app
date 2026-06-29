"use client";

import { useCallback, useState } from "react";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { CardioIgnitionBar } from "@/components/dashboard/CardioIgnitionBar";
import { HermeticFocusOverlay } from "@/components/dashboard/HermeticFocusOverlay";
import { resolveCardioGoalMs } from "@/lib/cardio-config";
import {
  computeCardioPercent,
  formatCardioDuration,
  resolveThermalBand,
} from "@/lib/cardio-voo-cinzas";
import { useCardioVooCinzas } from "@/hooks/useCardioVooCinzas";
import {
  CARDIO_VOO_CHIP_ELITE,
  CARDIO_VOO_CHIP_IDLE,
  CARDIO_VOO_CHIP_LIVE,
  CARDIO_VOO_EXPLANATION_LABEL,
  CARDIO_VOO_EXPLANATION_SUBTLE,
  CARDIO_VOO_EXPLANATION_TEXT,
  CARDIO_VOO_PANEL_ACTIVE,
  CARDIO_VOO_PANEL_ELITE,
  CARDIO_VOO_PERCENT_ELITE,
  CARDIO_VOO_PERCENT_IDLE,
  CARDIO_VOO_PERCENT_LIVE,
  CARDIO_VOO_SHELL_ELITE,
  CARDIO_VOO_SHELL_IDLE,
  CARDIO_VOO_SHELL_LIVE,
  CARDIO_VOO_TITLE_ELITE,
  CARDIO_VOO_TITLE_IDLE,
  CARDIO_VOO_TITLE_LIVE,
  VOO_CINZAS_CLIENT_EXPLANATION,
} from "@/lib/dashboard-config";
import type { CardioSessionStatus } from "@/lib/cardio-voo-cinzas";

type CardioVooCinzasPanelProps = {
  userId: string | null;
  goalMs?: number;
  goalMinutes?: number;
  hasForjadorPlan?: boolean;
};

const THERMAL_LABELS = {
  latent: "Fusão Latente",
  active: "Braseiro Ativo",
  elite: "Incandescência",
} as const;

type CardioVisualContext = "idle" | "live" | "elite";

function resolveCardioVisualContext(status: CardioSessionStatus): CardioVisualContext {
  if (status === "completed") return "elite";
  if (status === "running" || status === "check_in" || status === "stasis") return "live";
  return "idle";
}

function resolveStatusLabel(status: CardioSessionStatus, band: keyof typeof THERMAL_LABELS) {
  if (status === "idle") return "Pronto para decolar";
  if (status === "running") return THERMAL_LABELS[band];
  if (status === "check_in") return "Check-in térmico requerido";
  if (status === "stasis") return "Fogo em estase";
  return "Voo concluído. Altar sincronizado.";
}

export function CardioVooCinzasPanel({
  userId,
  goalMs = resolveCardioGoalMs(),
  goalMinutes,
  hasForjadorPlan = false,
}: CardioVooCinzasPanelProps) {
  const { session, handleStart, handleThermalCheckIn, handleReactivate } = useCardioVooCinzas({
    userId,
    goalMs,
  });
  const [hermeticFocus, setHermeticFocus] = useState(false);

  const percent = computeCardioPercent(session.validatedMs, session.goalMs);
  const band = resolveThermalBand(percent, session.status);
  const validatedLabel = formatCardioDuration(session.validatedMs);
  const goalLabel = formatCardioDuration(session.goalMs);
  const visualContext = resolveCardioVisualContext(session.status);
  const isSessionLive = visualContext === "live";
  const resolvedGoalMinutes =
    goalMinutes ?? Math.max(1, Math.round(session.goalMs / 60_000));

  const statusLabel = resolveStatusLabel(session.status, band);

  const primaryAction =
    session.status === "check_in"
      ? { label: "Check-in térmico", handler: handleThermalCheckIn }
      : session.status === "stasis"
        ? { label: "Reativar fogo", handler: handleReactivate }
        : null;

  const exitHermetic = useCallback(() => setHermeticFocus(false), []);

  const shellClass =
    visualContext === "elite"
      ? CARDIO_VOO_SHELL_ELITE
      : visualContext === "live"
        ? `${CARDIO_VOO_SHELL_LIVE} brasao-light-border cardio-voo-active ${CARDIO_VOO_PANEL_ACTIVE}`
        : CARDIO_VOO_SHELL_IDLE;

  const chipClass =
    visualContext === "elite"
      ? CARDIO_VOO_CHIP_ELITE
      : visualContext === "live"
        ? CARDIO_VOO_CHIP_LIVE
        : CARDIO_VOO_CHIP_IDLE;

  const titleClass =
    visualContext === "elite"
      ? CARDIO_VOO_TITLE_ELITE
      : visualContext === "live"
        ? CARDIO_VOO_TITLE_LIVE
        : CARDIO_VOO_TITLE_IDLE;

  const percentClass =
    visualContext === "elite"
      ? CARDIO_VOO_PERCENT_ELITE
      : visualContext === "live"
        ? CARDIO_VOO_PERCENT_LIVE
        : CARDIO_VOO_PERCENT_IDLE;

  const statusTextClass =
    visualContext === "elite"
      ? "mt-1 text-xs font-medium text-[#FFD700]/90"
      : visualContext === "live"
        ? "mt-1 text-xs font-medium text-amber-200/90"
        : "mt-1 text-xs text-amber-200/55";

  const brasaoVariant = visualContext === "elite" ? "brasao" : visualContext === "live" ? "brasao" : "cardio-idle";

  return (
    <>
      <BrasaVivaCard
        as="section"
        variant={brasaoVariant}
        className={`mb-4 ${shellClass} ${visualContext === "elite" ? `brasao-light-border cardio-voo-elite ${CARDIO_VOO_PANEL_ELITE}` : ""
          }`}
        aria-labelledby="voo-cinzas-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={chipClass}>Altar energético. Cardio</p>
            <h2 id="voo-cinzas-title" className={titleClass}>
              Voo de Cinzas
            </h2>
            <p className={statusTextClass}>{statusLabel}</p>
            {hasForjadorPlan ? (
              <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-amber-500/55">
                Meta do forjador: {resolvedGoalMinutes} min
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <p className={percentClass}>{percent}%</p>
            {isSessionLive ? (
              <button
                type="button"
                onClick={() => setHermeticFocus(true)}
                className="inline-flex min-h-11 items-center rounded-full border border-amber-400/30 bg-amber-950/40 px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-amber-100 transition hover:border-amber-300/45 hover:bg-amber-900/50"
              >
                Foco hermético
              </button>
            ) : null}
          </div>
        </div>

        {visualContext === "idle" ? (
          <div className={`mt-4 ${CARDIO_VOO_EXPLANATION_SUBTLE}`} role="note">
            <p className={CARDIO_VOO_EXPLANATION_LABEL}>Como funciona</p>
            <p className={CARDIO_VOO_EXPLANATION_TEXT}>{VOO_CINZAS_CLIENT_EXPLANATION}</p>
          </div>
        ) : null}

        <CardioIgnitionBar percent={percent} band={band} className="mt-4 w-full" />

        <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs text-neutral-500">
              <span className="font-medium text-neutral-400">{validatedLabel}</span>
              <span className="text-neutral-600"> / {goalLabel} validados</span>
            </p>
          </div>
          <p
            className={`text-[10px] uppercase tracking-[0.18em] ${visualContext === "elite"
                ? "text-[#FFD700]/85"
                : visualContext === "live"
                  ? "text-amber-200/85"
                  : "text-amber-400/60"
              }`}
          >
            {THERMAL_LABELS[band]}
          </p>
        </div>

        {band === "active" && session.status === "running" ? (
          <p className="mt-3 text-center text-xs tracking-wide text-amber-300/85">
            Carregando matéria térmica
          </p>
        ) : null}

        {session.status === "idle" ? (
          <button
            type="button"
            onClick={handleStart}
            disabled={!userId}
            className="mt-4 w-full rounded-2xl border border-orange-500/28 bg-gradient-to-r from-orange-950/45 via-neutral-950/60 to-black/70 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-amber-100 transition hover:border-amber-400/40 hover:from-orange-900/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 xs:tracking-[0.2em]"
          >
            Iniciar Voo de Cinzas
          </button>
        ) : null}

        {primaryAction ? (
          <button
            type="button"
            onClick={primaryAction.handler}
            className="mt-4 w-full rounded-2xl border border-amber-400/35 bg-gradient-to-r from-amber-950/45 to-orange-950/35 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-amber-50 transition hover:border-amber-300/50 hover:from-amber-900/55 xs:tracking-[0.2em]"
          >
            {primaryAction.label}
          </button>
        ) : null}

        {session.status === "completed" ? (
          <p className="mt-3 text-center text-[10px] uppercase tracking-[0.16em] text-[#FFD700]/90">
            Incandescência. Altar diário sincronizado
          </p>
        ) : null}

        {session.status === "running" ? (
          <p className="mt-3 text-center text-[10px] text-neutral-500">
            Check-in a cada 10 min. Pausas não apagam o progresso.
          </p>
        ) : null}
      </BrasaVivaCard>

      {hermeticFocus ? (
        <HermeticFocusOverlay
          percent={percent}
          band={band}
          thermalLabel={THERMAL_LABELS[band]}
          validatedLabel={validatedLabel}
          goalLabel={goalLabel}
          onExit={exitHermetic}
          onPrimaryAction={primaryAction?.handler}
          primaryActionLabel={primaryAction?.label}
          showPrimaryAction={Boolean(primaryAction)}
        />
      ) : null}
    </>
  );
}
