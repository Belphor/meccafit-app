"use client";

import { DashboardClientInfoBlock } from "@/components/dashboard/DashboardClientInfoBlock";
import { EvolutionChamaProgressBar } from "@/components/evolution/EvolutionChamaProgressBar";
import { FenixEvolutionAvatar } from "@/components/evolution/fenix-evolution-avatar";
import type { MuscleCalorRow } from "@/components/evolution/human-body-constants";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_SECTION_TITLE,
  EVOLUTION_FIELD_LABEL,
  EVOLUTION_HINT,
  EVOLUTION_SECTION_SUBTITLE,
  EVOLUTION_STAT_VALUE,
} from "@/lib/dashboard-config";
import type { PhaseTier } from "@/lib/dashboard-config";
import { PHASE_TIER_LABELS } from "@/lib/dashboard-config";
import {
  EVOLUTION_TIER_RING_LEGEND,
  FENIX_EVOLUTION_SYSTEMS,
  resolvePhaseVtcProgress,
} from "@/lib/fenix-evolution-glossary";
import type { ThermalGravityState } from "@/lib/thermal-gravity";
import { resolveMonthlyLevelUpProgressPercent } from "@/lib/thermal-gravity";
import { formatVtcKg } from "@/lib/vtc-labels";

type EvolutionChamaAcumuladaCardProps = {
  userId: string;
  loading: boolean;
  dataReady?: boolean;
  indiceIgnicao: number;
  calorRows: MuscleCalorRow[];
  phaseTier: PhaseTier;
  vtc30dKg: number;
  thermalState: ThermalGravityState;
  monthBoundaryDegraded?: boolean;
  profileName?: string | null;
  profilePhotoUrl?: string | null;
  purityPenaltyActive?: boolean;
};

export function EvolutionChamaAcumuladaCard({
  userId,
  loading,
  indiceIgnicao,
  calorRows,
  phaseTier,
  vtc30dKg,
  thermalState,
  monthBoundaryDegraded = false,
  profileName,
  profilePhotoUrl,
  purityPenaltyActive = false,
}: EvolutionChamaAcumuladaCardProps) {
  const system = FENIX_EVOLUTION_SYSTEMS.chama_acumulada;
  const activeTier = Math.min(5, Math.max(1, Math.round(phaseTier))) as PhaseTier;
  const phaseProgress = resolvePhaseVtcProgress(vtc30dKg, undefined, activeTier);

  const progressKg = Math.max(vtc30dKg, thermalState.vtc_month, thermalState.vtc_30d);
  const thermalProgressPct = resolveMonthlyLevelUpProgressPercent(thermalState);
  const progressPercent =
    thermalProgressPct !== null ? thermalProgressPct : phaseProgress.progressPercent;
  const ceilingKg = phaseProgress.ceilingKg ?? thermalState.monthly_goal_kg;
  const remainingKg =
    ceilingKg !== null ? Math.max(0, ceilingKg - progressKg) : phaseProgress.remainingKg;

  return (
    <div className={`${DASHBOARD_INNER_FRAME} mt-4 space-y-4 p-4 sm:p-5`}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className={DASHBOARD_SECTION_TITLE}>Chama Acumulada da Linhagem</h2>
          <p className={EVOLUTION_SECTION_SUBTITLE}>
            Volume dos últimos 30 dias; define sua fase e o anel do avatar.
          </p>
          <DashboardClientInfoBlock className="mt-3">{system.explanation}</DashboardClientInfoBlock>

          {!loading ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-neutral-950/80 to-neutral-950/90 px-4 py-3.5">
                <p className={EVOLUTION_FIELD_LABEL}>Fase ativa</p>
                <p className="mt-1 text-xl font-bold text-amber-50">{PHASE_TIER_LABELS[activeTier]}</p>
                <p className={`mt-1 ${EVOLUTION_STAT_VALUE}`}>{formatVtcKg(vtc30dKg)}</p>
              </div>

              <EvolutionChamaProgressBar
                progressPercent={progressPercent}
                currentTier={phaseProgress.currentTier}
                nextTier={phaseProgress.nextTier}
                remainingKg={remainingKg}
                vtc30dKg={progressKg}
                ceilingKg={ceilingKg}
                thermalState={thermalState}
                monthBoundaryDegraded={monthBoundaryDegraded}
              />
            </div>
          ) : (
            <div className="mt-5 space-y-3" aria-hidden>
              <div className="h-16 animate-pulse rounded-xl bg-amber-950/20" />
              <div className="h-3 animate-pulse rounded-full bg-neutral-900" />
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center lg:items-end">
          {loading ? (
            <div
              className="h-24 w-24 animate-pulse rounded-full bg-amber-900/25 ring-4 ring-amber-500/15"
              aria-hidden
            />
          ) : (
            <FenixEvolutionAvatar
              userId={userId}
              indiceIgnicao={indiceIgnicao}
              calorRows={calorRows}
              phaseTier={activeTier}
              vtc30dKg={vtc30dKg}
              profileName={profileName}
              profilePhotoUrl={profilePhotoUrl}
              purityPenaltyActive={purityPenaltyActive}
              className="mx-auto lg:mx-0"
            />
          )}
        </div>
      </div>

      <details className="group rounded-xl border border-amber-500/35 bg-gradient-to-br from-amber-950/25 via-neutral-950/90 to-black/80 shadow-[0_0_24px_rgba(251,191,36,0.1)]">
        <summary className="cursor-pointer list-none px-4 py-3.5 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="inline-flex w-full items-center justify-between gap-3">
            <span className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-50">
              Camadas do anel da Linhagem
            </span>
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-950/40 text-amber-200/90 transition group-open:rotate-180"
              aria-hidden
            >
              ▾
            </span>
          </span>
          <span className="mt-1 block text-xs text-amber-200/70">
            Toque para ver cada fase conquistada no anel do avatar.
          </span>
        </summary>
        <div className="border-t border-orange-500/10 px-4 pb-4 pt-3">
          <p className={`mb-3 ${EVOLUTION_HINT}`}>
            Fase ativa no anel:{" "}
            <span className="font-semibold text-amber-100">{PHASE_TIER_LABELS[activeTier]}</span>
          </p>
          <ul className="space-y-2">
            {EVOLUTION_TIER_RING_LEGEND.map((item) => {
              const isActive = item.tier === activeTier;
              const isUnlocked = item.tier <= activeTier;
              return (
                <li
                  key={item.tier}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2 transition ${
                    isActive
                      ? "border-amber-500/35 bg-amber-950/25"
                      : isUnlocked
                        ? "border-neutral-800/80 bg-neutral-950/40"
                        : "border-neutral-900/60 bg-black/20 opacity-70"
                  } ${EVOLUTION_HINT}`}
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded-full ${isActive ? "h-4 w-4 ring-2 ring-amber-400/40" : "h-3.5 w-3.5"}`}
                    style={{
                      backgroundColor: item.color,
                      boxShadow: isUnlocked
                        ? `0 0 ${isActive ? 14 : 8}px ${item.color}${isActive ? "cc" : "88"}`
                        : `0 0 4px ${item.color}44`,
                      opacity: isUnlocked ? 1 : 0.45,
                    }}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span
                      className={`font-semibold ${isActive ? "text-amber-50" : isUnlocked ? "text-amber-100/90" : "text-neutral-500"}`}
                    >
                      {PHASE_TIER_LABELS[item.tier]}
                      {isActive ? " · fase atual" : isUnlocked ? " · conquistada" : " · bloqueada"}
                    </span>
                    <span className="block text-neutral-500">
                      {item.label.split(". ").slice(1).join(". ") || item.label}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </details>
    </div>
  );
}
