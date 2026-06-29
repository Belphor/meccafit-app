"use client";

import { CardioIgnitionBar } from "@/components/dashboard/CardioIgnitionBar";
import { DashboardClientInfoBlock } from "@/components/dashboard/DashboardClientInfoBlock";
import type { MuscleCalorLevel } from "@/components/evolution/human-body-constants";
import { PURITY_PENALTY_THRESHOLD } from "@/components/evolution/human-body-constants";
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
import { formatVtcKg, VTC_DISPLAY_NAME } from "@/lib/vtc-labels";

type EvolutionRitmoPanelProps = {
  indiceIgnicao: number;
  metaVtcMensalKg: number;
  vtc30dKg: number;
  nivelTermicoGlobal: MuscleCalorLevel | null;
  computedNivelGlobal: MuscleCalorLevel;
  loading?: boolean;
};

export function EvolutionRitmoPanel({
  indiceIgnicao,
  metaVtcMensalKg,
  vtc30dKg,
  nivelTermicoGlobal,
  computedNivelGlobal,
  loading = false,
}: EvolutionRitmoPanelProps) {
  const ritmoNext = resolveIgnicaoNextLevel(indiceIgnicao);
  const ritmoBand =
    indiceIgnicao >= 90 ? "elite" : indiceIgnicao >= 50 ? "active" : "latent";

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
          Percentual da sua meta mensal de <LoreEm>{VTC_DISPLAY_NAME}</LoreEm> já acumulado, alimentado
          pela meta de treino acima.
        </p>
        <DashboardClientInfoBlock className="mt-3">
          <LoreEm>Ritmo da Fênix</LoreEm> mede quanto do seu <LoreEm>{VTC_DISPLAY_NAME}</LoreEm> meta
          mensal você já acumulou, em percentual. A meta padrão segue o limiar Faísca da academia.
          Abaixo de 50%, as cores do mapa ficam mais suaves.
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

        {indiceIgnicao < PURITY_PENALTY_THRESHOLD ? (
          <p className="text-xs text-amber-300/90">
            Ritmo abaixo de {PURITY_PENALTY_THRESHOLD}%. O mapa corporal fica com cores mais suaves.
          </p>
        ) : null}
      </div>
    </div>
  );
}
