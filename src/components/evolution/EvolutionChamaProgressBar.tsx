"use client";

import { EVOLUTION_TIER_RING_COLORS } from "@/components/evolution/fenix-evolution-avatar";
import {
  DASHBOARD_SECTION_TITLE,
  EVOLUTION_FIELD_LABEL,
  EVOLUTION_HINT,
  EVOLUTION_STAT_VALUE,
  PHASE_TIER_LABELS,
  type PhaseTier,
} from "@/lib/dashboard-config";
import { formatNextViradaDateShortPt } from "@/lib/academia-config";
import { FENIX_EVOLUTION_SYSTEMS } from "@/lib/fenix-evolution-glossary";
import {
  formatThermalGravityShortHint,
  type ThermalGravityState,
} from "@/lib/thermal-gravity";
import { formatVtcKg } from "@/lib/vtc-labels";

function PhaseName({ tier, className = "" }: { tier: PhaseTier; className?: string }) {
  return (
    <strong className={`font-bold text-amber-50 ${className}`.trim()}>
      {PHASE_TIER_LABELS[tier]}
    </strong>
  );
}

function MonthlyGoalLabel({ state }: { state: ThermalGravityState }) {
  if (state.maintained_this_month) {
    if (state.leveled_up_this_month) {
      return <>Gravidade Térmica de {state.month_label} cumprida. Fase protegida e evoluindo.</>;
    }
    return <>Gravidade Térmica de {state.month_label} cumprida. Fase protegida neste ciclo.</>;
  }
  return (
    <>
      Mantenha <PhaseName tier={state.effective_tier} /> antes da virada do mês.
    </>
  );
}

type EvolutionChamaProgressBarProps = {
  progressPercent: number;
  currentTier: PhaseTier;
  nextTier: PhaseTier | null;
  remainingKg: number | null;
  vtc30dKg: number;
  ceilingKg: number | null;
  className?: string;
  thermalState?: ThermalGravityState | null;
  monthBoundaryDegraded?: boolean;
};

type ThermalGravityTone = "neutral" | "warn" | "ok" | "risk";

const TIER_FILL: Record<PhaseTier, string> = {
  1: "from-neutral-600 via-neutral-500 to-neutral-400",
  2: "from-orange-900 via-orange-500 to-amber-400",
  3: "from-orange-800 via-orange-500 to-orange-300",
  4: "from-red-950 via-red-500 to-orange-400",
  5: "from-amber-600 via-[#FFD700] to-yellow-200",
};

function resolveTone(
  state: ThermalGravityState,
  progressPct: number,
): ThermalGravityTone {
  if (state.maintained_this_month) return "ok";
  if (state.days_remaining <= 7 && progressPct < 100) return "risk";
  return "neutral";
}

function resolveStatusChip(
  tone: ThermalGravityTone,
  state: ThermalGravityState,
  progressPct: number,
): { label: string; className: string } | null {
  if (state.maintained_this_month) {
    return {
      label: "Prova em dia",
      className: "border-emerald-400/40 bg-emerald-950/45 text-emerald-100",
    };
  }
  if (tone === "risk") {
    return {
      label: "Virada próxima",
      className: "border-amber-400/50 bg-amber-950/55 text-amber-50 motion-safe:animate-pulse",
    };
  }
  if (progressPct >= 70) {
    return {
      label: "Bom ritmo",
      className: "border-orange-400/35 bg-orange-950/40 text-orange-100",
    };
  }
  return null;
}

function resolveCardSurface(tone: ThermalGravityTone): string {
  switch (tone) {
    case "warn":
      return "border-orange-500/50 bg-gradient-to-br from-orange-950/45 via-red-950/25 to-black/80 shadow-[0_0_32px_rgba(249,115,22,0.18)]";
    case "ok":
      return "border-emerald-500/40 bg-gradient-to-br from-emerald-950/35 via-orange-950/15 to-black/80 shadow-[0_0_28px_rgba(52,211,153,0.12)]";
    case "risk":
      return "border-amber-500/50 bg-gradient-to-br from-amber-950/45 via-orange-950/30 to-black/80 shadow-[0_0_36px_rgba(245,158,11,0.2)]";
    default:
      return "border-orange-500/35 bg-gradient-to-br from-orange-950/35 via-amber-950/20 to-black/80";
  }
}

function resolveBarGradient(tone: ThermalGravityTone): string {
  if (tone === "risk") return "from-amber-950 via-amber-600 to-yellow-400";
  if (tone === "warn") return "from-orange-950 via-orange-600 to-amber-400";
  return "from-orange-950 via-orange-600 to-amber-300";
}

export function EvolutionChamaProgressBar({
  progressPercent,
  currentTier,
  nextTier,
  remainingKg,
  vtc30dKg,
  ceilingKg,
  className = "",
  thermalState = null,
  monthBoundaryDegraded = false,
}: EvolutionChamaProgressBarProps) {
  const showThermal = thermalState !== null;
  const clampedPercent = Math.min(100, Math.max(0, progressPercent));
  const fillWidth = clampedPercent > 0 && clampedPercent < 3 ? "3%" : `${clampedPercent}%`;
  const accent = EVOLUTION_TIER_RING_COLORS[nextTier ?? currentTier];
  const atMax = nextTier === null;

  const tone =
    showThermal && thermalState
      ? resolveTone(thermalState, clampedPercent)
      : "neutral";
  const statusChip =
    showThermal && thermalState
      ? resolveStatusChip(tone, thermalState, clampedPercent)
      : null;
  const barGradient = showThermal ? resolveBarGradient(tone) : TIER_FILL[nextTier ?? currentTier];
  const viradaDate = formatNextViradaDateShortPt();
  const lore = FENIX_EVOLUTION_SYSTEMS.gravidade_termica;

  const content = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <p className={EVOLUTION_FIELD_LABEL}>
            {showThermal ? "Prova mensal da linhagem" : "Progresso da fase"}
          </p>
          <p className="mt-0.5 text-sm text-amber-50">
            <PhaseName tier={currentTier} />
            {!atMax && nextTier ? (
              <>
                <span className="font-normal text-neutral-500"> para </span>
                <PhaseName tier={nextTier} />
              </>
            ) : null}
          </p>
        </div>
        <p className={`shrink-0 ${EVOLUTION_STAT_VALUE}`}>{Math.round(clampedPercent)}%</p>
      </div>

      {showThermal && thermalState && !thermalState.maintained_this_month ? (
        <div className="flex flex-wrap items-stretch gap-3 rounded-lg border border-orange-500/25 bg-black/35 px-3 py-2.5">
          <div className="flex min-w-[4.5rem] flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold tabular-nums leading-none text-amber-50">
              {thermalState.days_remaining}
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
              {thermalState.days_remaining === 1 ? "dia restante" : "dias restantes"}
            </span>
          </div>
          <div className="hidden w-px self-stretch bg-orange-500/20 sm:block" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-300/85">
              Próxima virada
            </span>
            <span className="mt-0.5 text-base font-semibold text-orange-50">{viradaDate}</span>
            <span className="mt-0.5 text-[11px] text-neutral-500">Horário de Brasília.</span>
          </div>
        </div>
      ) : null}

      <div
        className="relative h-3 overflow-hidden rounded-full border bg-neutral-950/80"
        style={{ borderColor: `${accent}44` }}
        role="progressbar"
        aria-valuenow={Math.round(clampedPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progresso até ${nextTier ? PHASE_TIER_LABELS[nextTier] : "patamar máximo"}`}
      >
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out ${barGradient}`}
          style={{
            width: fillWidth,
            boxShadow: `0 0 14px ${accent}66`,
          }}
        />
        {atMax ? (
          <div
            className="pointer-events-none absolute inset-0 opacity-50 mix-blend-screen"
            aria-hidden
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.45) 50%, transparent 100%)",
            }}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className={EVOLUTION_HINT}>
          Acumulado:{" "}
          <span className="font-mono font-semibold text-amber-100">{formatVtcKg(vtc30dKg)}</span>
        </span>
        {atMax ? (
          <span className="text-sm font-semibold text-[#FFD700]">Patamar máximo alcançado</span>
        ) : remainingKg !== null && ceilingKg !== null ? (
          <span className={EVOLUTION_HINT}>
            Faltam{" "}
            <span className="font-mono font-semibold text-amber-100">{formatVtcKg(remainingKg)}</span>
            <span className="text-neutral-600"> de {formatVtcKg(ceilingKg)}</span>
          </span>
        ) : null}
      </div>
    </div>
  );

  if (!showThermal || !thermalState) {
    return <div className={className}>{content}</div>;
  }

  return (
    <div
      className={`rounded-xl border px-4 py-4 ${resolveCardSurface(tone)} ${className}`}
      aria-labelledby="thermal-gravity-inline-title"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id="thermal-gravity-inline-title" className={DASHBOARD_SECTION_TITLE}>
            {lore.loreName}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-neutral-400">
            {formatThermalGravityShortHint(thermalState)}
          </p>
        </div>
        {statusChip ? (
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${statusChip.className}`}
          >
            {statusChip.label}
          </span>
        ) : null}
      </div>

      {thermalState.maintained_this_month ? (
        <p className="mb-3 text-sm text-emerald-50/95">
          <MonthlyGoalLabel state={thermalState} />
        </p>
      ) : monthBoundaryDegraded && thermalState.settled_month_label ? (
        <p className="mb-3 text-sm text-orange-50/95">
          A Gravidade Térmica de {thermalState.settled_month_label} não foi cumprida. A linhagem
          desceu uma fase. Reacenda o volume neste ciclo.
        </p>
      ) : (
        <p className="mb-3 text-xs text-neutral-400">
          <MonthlyGoalLabel state={thermalState} />
        </p>
      )}

      {content}
    </div>
  );
}
