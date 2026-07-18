"use client";

import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import { EvolutionBodyMapPanel } from "@/components/evolution/EvolutionBodyMapPanel";
import { EvolutionRitmoPanel } from "@/components/evolution/EvolutionRitmoPanel";
import { PlanConfigForm, type AthletePlanConfig } from "@/components/evolution/plan-config-form";
import type {
  MuscleCalorLevel,
  MuscleCalorRow,
  NiveisTermicos,
  CongelamentoPorMembro,
  SovereignMuscleId,
} from "@/components/evolution/human-body-constants";
import { DASHBOARD_PANEL_FRAME } from "@/lib/dashboard-config";
import { useTourHighlightActive } from "@/lib/use-tour-highlight";

type EvolutionConsistenciaSectionProps = {
  userId: string;
  initialAthletePlan?: AthletePlanConfig;
  loading: boolean;
  refreshing: boolean;
  indiceIgnicao: number;
  metaVtcMensalKg: number;
  vtc30dKg: number;
  nivelTermicoGlobal: MuscleCalorLevel | null;
  computedNivelGlobal: MuscleCalorLevel;
  calorRows: MuscleCalorRow[];
  niveisTermicos: NiveisTermicos;
  congelamentoPorMembro: CongelamentoPorMembro;
  performanceMode: boolean;
  activeMuscle: SovereignMuscleId;
  onMuscleSelect: (muscle: SovereignMuscleId) => void;
  onRefreshMap: () => void;
  scopeError: string | null;
  phaseSetupAt?: string | null;
  ritmoGraceActive?: boolean;
  ritmoGraceDaysRemaining?: number;
  purityPenaltyActive?: boolean;
};

export function EvolutionConsistenciaSection({
  userId,
  initialAthletePlan,
  loading,
  refreshing,
  indiceIgnicao,
  metaVtcMensalKg,
  vtc30dKg,
  nivelTermicoGlobal,
  computedNivelGlobal,
  calorRows,
  niveisTermicos,
  congelamentoPorMembro,
  performanceMode,
  activeMuscle,
  onMuscleSelect,
  onRefreshMap,
  scopeError,
  phaseSetupAt,
  ritmoGraceActive,
  ritmoGraceDaysRemaining,
  purityPenaltyActive = false,
}: EvolutionConsistenciaSectionProps) {
  // Durante "Defina sua meta", atenua Ritmo/Brasas (sem desmontar) para o callout
  // e o spotlight focarem o bloco da meta — apresentação completa e Pular.
  const metaTourActive = useTourHighlightActive("evolucao-meta");

  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      className={DASHBOARD_PANEL_FRAME}
      aria-labelledby="evolucao-consistencia-title"
    >
      {metaTourActive ? null : (
        <DashboardPanelHeader chip="Consistência" meta="Meta, Ritmo e Mapa corporal" />
      )}

      <p id="evolucao-consistencia-title" className="sr-only">
        Meta de treino, Ritmo da Fênix e mapa de calor muscular
      </p>

      <PlanConfigForm
        userId={userId}
        initialPlan={initialAthletePlan}
        currentMetaVtcMensalKg={metaVtcMensalKg}
        onSyncComplete={onRefreshMap}
        embedded
      />

      <div
        className={`mx-4 border-t border-orange-500/12 sm:mx-5 ${metaTourActive ? "hidden" : ""}`}
        aria-hidden
      />

      <div
        data-tour-target="evolucao-ritmo"
        className={
          metaTourActive
            ? "pointer-events-none max-h-0 overflow-hidden opacity-0 transition-[opacity,max-height]"
            : undefined
        }
        aria-hidden={metaTourActive || undefined}
      >
        <EvolutionRitmoPanel
          indiceIgnicao={indiceIgnicao}
          metaVtcMensalKg={metaVtcMensalKg}
          vtc30dKg={vtc30dKg}
          nivelTermicoGlobal={nivelTermicoGlobal}
          computedNivelGlobal={computedNivelGlobal}
          phaseSetupAt={phaseSetupAt}
          ritmoGraceActive={ritmoGraceActive}
          ritmoGraceDaysRemaining={ritmoGraceDaysRemaining}
          loading={loading}
        />
      </div>

      <div
        data-tour-target="evolucao-brasas"
        className={
          metaTourActive
            ? "pointer-events-none max-h-0 overflow-hidden opacity-0 transition-[opacity,max-height]"
            : undefined
        }
        aria-hidden={metaTourActive || undefined}
      >
        <EvolutionBodyMapPanel
          loading={loading}
          refreshing={refreshing}
          indiceIgnicao={indiceIgnicao}
          calorRows={calorRows}
          niveisTermicos={niveisTermicos}
          congelamentoPorMembro={congelamentoPorMembro}
          performanceMode={performanceMode}
          activeMuscle={activeMuscle}
          onMuscleSelect={onMuscleSelect}
          onRefresh={onRefreshMap}
          scopeError={scopeError}
          purityPenaltyActive={purityPenaltyActive}
        />
      </div>
    </BrasaVivaCard>
  );
}
