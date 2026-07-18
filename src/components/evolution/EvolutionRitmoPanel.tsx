"use client";

import { useEffect, useState } from "react";
import { CardioIgnitionBar } from "@/components/dashboard/CardioIgnitionBar";
import { DashboardClientInfoBlock } from "@/components/dashboard/DashboardClientInfoBlock";
import type { MuscleCalorLevel } from "@/components/evolution/human-body-constants";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_SECTION_TITLE,
  EVOLUTION_FIELD_LABEL,
  EVOLUTION_HINT,
  EVOLUTION_SECTION_SUBTITLE,
  EVOLUTION_STAT_VALUE,
} from "@/lib/dashboard-config";
import {
  formatThermalLevelWithContext,
  resolveIgnicaoNextLevel,
} from "@/lib/fenix-evolution-glossary";
import { LoreEm } from "@/lib/lore-emphasis";
import { useTourHighlightActive } from "@/lib/use-tour-highlight";
import { VTC_DISPLAY_NAME, formatVtcKg } from "@/lib/vtc-labels";
import {
  buildRitmoGraceActiveHint,
  buildRitmoGraceEndedAlert,
  isRitmoPurityPenaltyActive,
  resolveRitmoGraceState,
} from "@/lib/ritmo-grace-period";

type EvolutionRitmoPanelProps = {
  indiceIgnicao: number;
  metaVtcMensalKg: number;
  vtc30dKg: number;
  nivelTermicoGlobal: MuscleCalorLevel | null;
  computedNivelGlobal: MuscleCalorLevel;
  phaseSetupAt?: string | null;
  ritmoGraceActive?: boolean;
  ritmoGraceDaysRemaining?: number;
  loading?: boolean;
};

export function EvolutionRitmoPanel({
  indiceIgnicao,
  metaVtcMensalKg,
  vtc30dKg,
  nivelTermicoGlobal,
  computedNivelGlobal,
  phaseSetupAt,
  ritmoGraceActive = false,
  ritmoGraceDaysRemaining,
  loading = false,
}: EvolutionRitmoPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const tourActive = useTourHighlightActive("evolucao-ritmo");

  useEffect(() => {
    // Durante a APRESENTAÇÃO, expande automaticamente para a ANYMA explicar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tourActive) setExpanded(true);
  }, [tourActive]);

  const ritmoNext = resolveIgnicaoNextLevel(indiceIgnicao);
  const ritmoBand =
    indiceIgnicao >= 90 ? "elite" : indiceIgnicao >= 50 ? "active" : "latent";
  const grace = resolveRitmoGraceState(phaseSetupAt);
  const inGrace = ritmoGraceActive || grace.inGrace;
  const graceDaysLeft =
    ritmoGraceDaysRemaining ?? grace.daysRemaining;
  const purityPenaltyActive = isRitmoPurityPenaltyActive(
    indiceIgnicao,
    phaseSetupAt,
    inGrace,
  );

  if (loading) {
    return (
      <div className={`${DASHBOARD_INNER_FRAME} space-y-3 p-4`} aria-hidden>
        <div className="h-4 w-40 animate-pulse rounded bg-neutral-800" />
        <div className="h-3 animate-pulse rounded-full bg-neutral-900" />
      </div>
    );
  }

  return (
    <div className={`${DASHBOARD_INNER_FRAME} space-y-4 p-4 sm:p-5`}>
      <header>
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls="evolucao-ritmo-detalhe"
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <span className="min-w-0">
            <h3 className={DASHBOARD_SECTION_TITLE}>Ritmo da Fênix</h3>
            {expanded ? (
              <span className={`mt-1 block ${EVOLUTION_SECTION_SUBTITLE}`}>
                Quanto da meta mensal de <LoreEm>{VTC_DISPLAY_NAME}</LoreEm>, calculada pelos seus
                dias de treino planejados, você já acumulou nos últimos 30 dias.
              </span>
            ) : null}
          </span>
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-950/40 text-amber-200/90 transition ${
              expanded ? "rotate-180" : ""
            }`}
            aria-hidden
          >
            ▾
          </span>
        </button>
      </header>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className={EVOLUTION_FIELD_LABEL}>Progresso do ritmo</p>
          <p className={EVOLUTION_STAT_VALUE}>{Math.round(indiceIgnicao)}%</p>
        </div>

        <CardioIgnitionBar percent={indiceIgnicao} band={ritmoBand} emphasized calm />

        {inGrace ? (
          <p className="rounded-lg border border-cyan-500/25 bg-cyan-950/20 px-3 py-2.5 text-xs leading-relaxed text-cyan-100/90">
            {buildRitmoGraceActiveHint(graceDaysLeft)}
          </p>
        ) : null}

        {purityPenaltyActive ? (
          <p
            className="rounded-lg border border-amber-500/30 bg-amber-950/25 px-3 py-2.5 text-xs leading-relaxed text-amber-50/95"
            role="alert"
          >
            {buildRitmoGraceEndedAlert()}
          </p>
        ) : null}
      </div>

      {expanded ? (
        <div id="evolucao-ritmo-detalhe" className="space-y-3">
          <DashboardClientInfoBlock>
            <p className="text-xs font-semibold text-amber-100">Como funciona</p>
            <p className="mt-2 text-xs leading-relaxed text-neutral-300">
              O <LoreEm>Ritmo da Fênix</LoreEm> compara o volume forjado com a meta dos{" "}
              <LoreEm>dias planejados</LoreEm>. Olha os{" "}
              <strong className="text-amber-50">últimos 30 dias</strong>.
            </p>
          </DashboardClientInfoBlock>

          <div className="grid gap-2 sm:grid-cols-2">
            <p className={EVOLUTION_HINT}>
              Meta mensal do plano:{" "}
              <span className="font-mono font-semibold text-amber-100">{formatVtcKg(metaVtcMensalKg)}</span>
            </p>
            <p className={EVOLUTION_HINT}>
              Acumulado (30d):{" "}
              <span className="font-mono font-semibold text-amber-100">{formatVtcKg(vtc30dKg)}</span>
            </p>
          </div>

          <p className={EVOLUTION_HINT}>
            Intensidade global:{" "}
            <span className="font-medium text-amber-50">
              {formatThermalLevelWithContext(nivelTermicoGlobal ?? computedNivelGlobal, "consistency")}
            </span>
          </p>

          {ritmoNext.nextLevel && ritmoNext.remainingPercent !== null ? (
            <p className="text-xs text-cyan-200/85">
              Próximo nível: {formatThermalLevelWithContext(ritmoNext.nextLevel, "consistency")}. Faltam{" "}
              {Math.ceil(ritmoNext.remainingPercent)} pontos percentuais.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
