"use client";

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
import { VTC_DISPLAY_NAME, formatVtcKg } from "@/lib/vtc-labels";
import {
  buildRitmoGraceActiveHint,
  buildRitmoGraceEndedAlert,
  isRitmoPurityPenaltyActive,
  RITMO_GRACE_DAYS,
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
        <h3 className={DASHBOARD_SECTION_TITLE}>Ritmo da Fênix</h3>
        <p className={EVOLUTION_SECTION_SUBTITLE}>
          Quanto da sua meta mensal de <LoreEm>{VTC_DISPLAY_NAME}</LoreEm> você já acumulou nos últimos 30
          dias.
        </p>
        <DashboardClientInfoBlock className="mt-3">
          <p className="text-xs font-semibold text-amber-100">Como funciona</p>
          <p className="mt-2 text-xs leading-relaxed text-neutral-300">
            O Ritmo mostra o quanto você já aqueceu a linhagem neste ciclo, olhando sempre os{" "}
            <strong className="text-amber-50">últimos 30 dias</strong> de treino.
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs leading-relaxed text-neutral-300">
            <li>
              <strong className="text-amber-50">A cada treino</strong>, somamos o melhor peso que você
              registrou em cada exercício. Esse total do dia é o seu <LoreEm>{VTC_DISPLAY_NAME}</LoreEm>{" "}
              diário.
            </li>
            <li>
              <strong className="text-amber-50">Somamos os últimos 30 dias de treino</strong>. Esse valor
              aparece em &quot;Acumulado (30d)&quot; abaixo.
            </li>
            <li>
              <strong className="text-amber-50">O Ritmo é a porcentagem</strong> desse acumulado em
              relação à sua meta mensal. No máximo, 100%.
            </li>
          </ol>
          <p className="mt-3 text-xs leading-relaxed text-neutral-400">
            <strong className="text-neutral-300">Exemplo:</strong> meta de 5.000 kg e acumulado de 2.500 kg
            nos últimos 30 dias. Ritmo de 50%.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-neutral-400">
            Nos primeiros <strong className="text-neutral-300">{RITMO_GRACE_DAYS} dias</strong> da
            linhagem, o mapa corporal mantém cores vivas enquanto você constrói o ritmo. Depois desse
            prazo, se o Ritmo ficar <strong className="text-neutral-300">abaixo de 50%</strong>, o mapa
            fica mais suave até você reaquecer o volume.
          </p>
        </DashboardClientInfoBlock>
      </header>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className={EVOLUTION_FIELD_LABEL}>Progresso do ritmo</p>
          <p className={EVOLUTION_STAT_VALUE}>{Math.round(indiceIgnicao)}%</p>
        </div>

        <CardioIgnitionBar percent={indiceIgnicao} band={ritmoBand} emphasized calm />

        <div className="grid gap-2 sm:grid-cols-2">
          <p className={EVOLUTION_HINT}>
            Meta mensal:{" "}
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
            {Math.ceil(ritmoNext.remainingPercent)} pontos percentuais
          </p>
        ) : null}

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
    </div>
  );
}
