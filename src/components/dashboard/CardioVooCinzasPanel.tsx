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
  CARDIO_VOO_PANEL_ACTIVE,
  CARDIO_VOO_PANEL_ELITE,
} from "@/lib/dashboard-config";
import type { CardioSessionStatus } from "@/lib/cardio-voo-cinzas";

type CardioVooCinzasPanelProps = {
  userId: string | null;
  goalMs?: number;
};

const THERMAL_LABELS = {
  latent: "Fusão Latente",
  active: "Braseiro Ativo",
  elite: "Incandescência",
} as const;

function resolveCardioPanelFrame(status: CardioSessionStatus) {
  if (status === "idle") {
    return { variant: "cardio-idle" as const, frameClass: "" };
  }

  if (status === "completed") {
    return { variant: "brasao" as const, frameClass: CARDIO_VOO_PANEL_ELITE };
  }

  return { variant: "brasao" as const, frameClass: CARDIO_VOO_PANEL_ACTIVE };
}

export function CardioVooCinzasPanel({
  userId,
  goalMs = resolveCardioGoalMs(),
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

  const statusLabel =
    session.status === "idle"
      ? "Pronto para decolar"
      : session.status === "running"
        ? THERMAL_LABELS[band]
        : session.status === "check_in"
          ? "Check-In Térmico requerido"
          : session.status === "stasis"
            ? "Fogo em Estase"
            : "Voo concluído — altar privado atualizado";

  const primaryAction =
    session.status === "check_in"
      ? { label: "Check-In Térmico", handler: handleThermalCheckIn }
      : session.status === "stasis"
        ? { label: "Reativar fogo", handler: handleReactivate }
        : null;

  const exitHermetic = useCallback(() => setHermeticFocus(false), []);
  const panelFrame = resolveCardioPanelFrame(session.status);
  const isSessionLive =
    session.status === "running" ||
    session.status === "check_in" ||
    session.status === "stasis";
  const liveBorderClass = isSessionLive
    ? "cardio-voo-active"
    : session.status === "completed"
      ? "cardio-voo-elite"
      : "";

  return (
    <>
      <BrasaVivaCard
        as="section"
        variant={panelFrame.variant}
        className={`mb-4 rounded-[1.5rem] p-4 sm:p-5 ${liveBorderClass} ${panelFrame.frameClass}`}
        aria-labelledby="voo-cinzas-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-amber-500/90">Altar energético</p>
            <h2
              id="voo-cinzas-title"
              className="mt-1 font-serif text-lg uppercase tracking-[0.1em] text-amber-50 sm:text-xl"
            >
              Voo de Cinzas
            </h2>
            <p
              className={`mt-1 text-xs ${
                isSessionLive
                  ? "text-amber-200/85"
                  : session.status === "completed"
                    ? "text-[#FFD700]/90"
                    : "text-neutral-400"
              }`}
            >
              {statusLabel}
            </p>
          </div>

          {session.status !== "idle" && session.status !== "completed" ? (
            <button
              type="button"
              onClick={() => setHermeticFocus(true)}
              className="shrink-0 rounded-full border border-orange-500/20 bg-black/40 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-amber-200/90 transition hover:border-amber-400/35 hover:text-amber-50"
            >
              Foco Hermético
            </button>
          ) : null}
        </div>

        <CardioIgnitionBar percent={percent} band={band} className="mt-4 w-full" />

        <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-mono text-2xl tabular-nums text-amber-100">{percent}%</p>
            <p className="text-xs text-neutral-500">
              {validatedLabel}
              <span className="text-neutral-600"> / {goalLabel} validados</span>
            </p>
          </div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-200/80">
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
            className="mt-4 w-full rounded-2xl border border-orange-500/25 bg-gradient-to-r from-orange-950/50 to-black/60 py-3 text-xs uppercase tracking-[0.2em] text-amber-100 transition hover:border-amber-400/40 hover:from-orange-900/55 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Iniciar Voo de Cinzas
          </button>
        ) : null}

        {primaryAction ? (
          <button
            type="button"
            onClick={primaryAction.handler}
            className="mt-4 w-full rounded-2xl border border-amber-400/35 bg-amber-950/35 py-3 text-xs uppercase tracking-[0.18em] text-amber-50 transition hover:border-amber-300/50 hover:bg-amber-900/45"
          >
            {primaryAction.label}
          </button>
        ) : null}

        {session.status === "completed" ? (
          <p className="mt-3 text-center text-[10px] uppercase tracking-[0.16em] text-[#FFD700]/90">
            Incandescência · Altar diário privado sincronizado
          </p>
        ) : null}

        {session.status === "running" ? (
          <p className="mt-3 text-center text-[10px] text-neutral-600">
            Check-in consciente a cada 10 min · sem penalidade por pausa
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
