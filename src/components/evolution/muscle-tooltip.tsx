"use client";

import { createPortal } from "react-dom";
import {
  CALOR_LEVEL_LABELS,
  formatCalorMembroMetric,
  formatMetricaBruta,
  MUSCLE_LABELS,
  MUSCLE_THERMAL_CEILINGS,
  PURITY_PENALTY_THRESHOLD,
  resolveThermalCeilingProgress,
  type MuscleCalorRow,
  type SovereignMuscleId,
} from "@/components/evolution/human-body-constants";

type MuscleTooltipProps = {
  muscleId: SovereignMuscleId;
  row: MuscleCalorRow;
  indiceIgnicao: number;
  anchor: { x: number; y: number } | null;
  visible: boolean;
};

function renderOmbrosCeilingHint(row: MuscleCalorRow) {
  const progress = resolveThermalCeilingProgress("OMBROS", row.metrica_bruta, row.nivel_calculado);
  const ceilings = MUSCLE_THERMAL_CEILINGS.OMBROS;

  if (row.is_frozen) return null;

  if (!progress.nextLevel || progress.ceiling === null || progress.remaining === null) {
    return (
      <p className="mt-1 font-mono text-[9px] text-violet-300/80">
        Teto máximo · Fogo Cósmico alcançado
      </p>
    );
  }

  return (
    <>
      <p className="mt-1 font-mono text-[9px] text-cyan-200/75">
        Próximo teto · {CALOR_LEVEL_LABELS[progress.nextLevel]} ·{" "}
        <span className="tabular-nums text-amber-200/90">
          {formatMetricaBruta(progress.ceiling)} calor
        </span>
      </p>
      <p className="mt-0.5 font-mono text-[9px] text-neutral-600">
        Faltam {formatMetricaBruta(progress.remaining)} calor · tetos ombros{" "}
        {formatMetricaBruta(ceilings.faisca)} / {formatMetricaBruta(ceilings.brasa)} /{" "}
        {formatMetricaBruta(ceilings.labareda)}
      </p>
    </>
  );
}

export function MuscleTooltip({
  muscleId,
  row,
  indiceIgnicao,
  anchor,
  visible,
}: MuscleTooltipProps) {
  if (!visible || typeof document === "undefined") return null;

  const purityLow = indiceIgnicao < PURITY_PENALTY_THRESHOLD;
  const calorMetric = formatCalorMembroMetric(row);

  return createPortal(
    <div
      className="pointer-events-none fixed z-50 max-w-[240px] -translate-x-1/2 -translate-y-full rounded-lg border border-cyan-500/25 bg-neutral-950/96 px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(6,182,212,0.12)] backdrop-blur-md"
      style={{
        left: anchor?.x ?? "50%",
        top: (anchor?.y ?? 120) - 8,
      }}
      role="tooltip"
    >
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300/90">
        {MUSCLE_LABELS[muscleId]}
      </p>
      <p className="mt-1 text-sm font-semibold text-amber-50">
        {CALOR_LEVEL_LABELS[row.nivel_calculado]}
        {row.is_frozen ? " · ∅" : ""}
      </p>
      <p className="mt-1 font-mono text-[10px] tabular-nums text-neutral-400">
        {calorMetric.label} · <span className="text-amber-200/85">{calorMetric.value}</span>
      </p>
      <p className="mt-0.5 font-mono text-[9px] text-neutral-600">{calorMetric.hint}</p>
      {muscleId === "OMBROS" ? renderOmbrosCeilingHint(row) : null}
      {row.is_frozen ? (
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-cyan-300/80">
          Estase VIP · membro congelado
        </p>
      ) : null}
      {purityLow && !row.is_frozen ? (
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-amber-500/75">
          Penalidade · pureza da Fênix baixa
        </p>
      ) : null}
    </div>,
    document.body,
  );
}
