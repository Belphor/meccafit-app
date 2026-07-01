"use client";

import { createPortal } from "react-dom";
import {
  formatCalorMembroMetric,
  MUSCLE_LABELS,
  PURITY_PENALTY_THRESHOLD,
  type MuscleCalorRow,
  type SovereignMuscleId,
} from "@/components/evolution/human-body-constants";
import {
  buildMuscleCeilingSummary,
  buildMuscleProgressHint,
  formatThermalLevelWithContext,
  PURITY_PENALTY_EXPLANATION,
} from "@/lib/fenix-evolution-glossary";
import { VTC_DISPLAY_NAME } from "@/lib/vtc-labels";

type MuscleTooltipProps = {
  muscleId: SovereignMuscleId;
  row: MuscleCalorRow;
  indiceIgnicao: number;
  purityPenaltyActive?: boolean;
  anchor: { x: number; y: number } | null;
  visible: boolean;
};

function renderMuscleProgressHint(muscleId: SovereignMuscleId, row: MuscleCalorRow) {
  if (row.is_frozen) return null;

  const progress = buildMuscleProgressHint(muscleId, row.metrica_bruta, row.nivel_calculado);

  if (!progress.nextLevelLabel) {
    return (
      <p className="mt-1 font-mono text-[9px] text-amber-300/80">
        Teto máximo: Fogo Cósmico nas Brasas Musculares
      </p>
    );
  }

  return (
    <>
      <p className="mt-1 font-mono text-[9px] text-cyan-200/75">
        Próximo nível: {progress.nextLevelLabel},{" "}
        <span className="tabular-nums text-amber-200/90">{progress.ceilingLabel}</span>
      </p>
      <p className="mt-0.5 font-mono text-[9px] text-neutral-600">
        Faltam {progress.remainingLabel}. {buildMuscleCeilingSummary(muscleId)}
      </p>
    </>
  );
}

export function MuscleTooltip({
  muscleId,
  row,
  indiceIgnicao,
  purityPenaltyActive,
  anchor,
  visible,
}: MuscleTooltipProps) {
  if (!visible || typeof document === "undefined") return null;

  const purityLow = purityPenaltyActive ?? indiceIgnicao < PURITY_PENALTY_THRESHOLD;
  const calorMetric = formatCalorMembroMetric(row);

  return createPortal(
    <div
      className="pointer-events-none fixed z-50 max-w-[260px] -translate-x-1/2 -translate-y-full rounded-lg border border-cyan-500/25 bg-neutral-950/96 px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(6,182,212,0.12)] backdrop-blur-md"
      style={{
        left: anchor?.x ?? "50%",
        top: (anchor?.y ?? 120) - 8,
      }}
      role="tooltip"
    >
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300/90">
        {MUSCLE_LABELS[muscleId]}
      </p>
      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-600">
        Brasas Musculares, {VTC_DISPLAY_NAME} 14 dias
      </p>
      <p className="mt-1 text-sm font-semibold text-amber-50">
        {formatThermalLevelWithContext(row.nivel_calculado, "muscle")}
        {row.is_frozen ? " · Fora da rotina" : ""}
      </p>
      <p className="mt-1 font-mono text-[10px] tabular-nums text-neutral-400">
        {calorMetric.label} · <span className="text-amber-200/85">{calorMetric.value}</span>
      </p>
      <p className="mt-0.5 font-mono text-[9px] text-neutral-600">{calorMetric.hint}</p>
      {renderMuscleProgressHint(muscleId, row)}
      {row.is_frozen ? (
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-cyan-300/80">
          Fora da rotina: sem registro ativo nas Brasas Musculares
        </p>
      ) : null}
      {purityLow && !row.is_frozen ? (
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-amber-500/75">
          {PURITY_PENALTY_EXPLANATION}
        </p>
      ) : null}
    </div>,
    document.body,
  );
}
