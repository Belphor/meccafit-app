"use client";

import type { ClientProfile, MuscleSubgroup } from "@/lib/mock-data";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { CardioVooCinzasPanel } from "@/components/dashboard/CardioVooCinzasPanel";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import { MonumentalExerciseCard } from "@/components/dashboard/MonumentalExerciseCard";
import { MonumentalSubgroupTitle } from "@/components/dashboard/MonumentalSubgroupTitle";
import { TreinoWeekControls } from "@/components/training/treino-week-controls";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SCROLL_LIST,
} from "@/lib/dashboard-config";
import {
  hasForjadorPrescriptionForMuscle,
  resolveExerciseRestSeconds,
  type ForjadorPrescriptionRow,
  type ForjadorTreinoConfig,
} from "@/lib/forjador-prescriptions";
import { subgroupIdToMusculo } from "@/lib/subgroup-musculo";
import type { ClientTrainingMuscleGroup, PlanilhaDayRow, WeekdayIndex } from "@/lib/training-week";

type TreinoTabProps = {
  profile: ClientProfile;
  subgroup: MuscleSubgroup;
  activeExerciseId: number;
  superacaoExerciseId: number | null;
  isIncubating: boolean;
  hasBiologicalBalance: boolean;
  userId: string | null;
  initialWeekSchedule?: PlanilhaDayRow[];
  activeTreinoMuscle: ClientTrainingMuscleGroup;
  forjadorConfig: ForjadorTreinoConfig;
  forjadorPrescriptions: ForjadorPrescriptionRow[];
  indicatedDay: WeekdayIndex;
  onIndicatedDayChange: (day: WeekdayIndex) => void;
  onTrainingMusclePick: (muscle: ClientTrainingMuscleGroup) => void;
  onActivate: (exerciseId: number) => void;
  onVolumeCommitted: (exerciseId: number, baseVolume: number) => void;
  onWeightSaved: (exerciseId: number, weight: number) => void;
  onWatchVideo: (exerciseId: number) => void;
  onSuperacao: (
    exerciseId: number,
    payload: { weight: number; series: number; vtc: number },
  ) => void;
  onPersistSuccess?: (exerciseId: number, detail: { vtcGenerated: number }) => void;
};

export function TreinoTab({
  profile,
  subgroup,
  activeExerciseId,
  superacaoExerciseId,
  isIncubating,
  hasBiologicalBalance,
  userId,
  initialWeekSchedule,
  activeTreinoMuscle,
  forjadorConfig,
  forjadorPrescriptions,
  indicatedDay,
  onIndicatedDayChange,
  onTrainingMusclePick,
  onActivate,
  onVolumeCommitted,
  onWeightSaved,
  onWatchVideo,
  onSuperacao,
  onPersistSuccess,
}: TreinoTabProps) {
  const musculo = subgroupIdToMusculo(subgroup.id);
  const hasForjadorPlan = hasForjadorPrescriptionForMuscle(
    forjadorPrescriptions,
    activeTreinoMuscle,
  );
  const cardioGoalMs = forjadorConfig.cardioMetaMinutos * 60 * 1000;

  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      className={DASHBOARD_PANEL_FRAME}
      aria-labelledby="subgrupo-monumental-title"
    >
      <DashboardPanelHeader chip="Treino" meta="Execução diária" metaVariant="chip" />

      <CardioVooCinzasPanel userId={userId} goalMs={cardioGoalMs} />

      <div className={`mt-4 space-y-4 ${DASHBOARD_INNER_FRAME} p-4`}>
        {userId ? (
          <TreinoWeekControls
            userId={userId}
            initialSchedule={initialWeekSchedule}
            activeTreinoMuscle={activeTreinoMuscle}
            hasForjadorPlan={hasForjadorPlan}
            indicatedDay={indicatedDay}
            onIndicatedDayChange={onIndicatedDayChange}
            onTrainingMusclePick={onTrainingMusclePick}
          />
        ) : null}
        <MonumentalSubgroupTitle subgroup={subgroup} />
        {!hasForjadorPlan ? (
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-amber-300/75">
            Treino exemplo · forjador monta planilha, descanso e cardio
          </p>
        ) : (
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-emerald-300/80">
            Planilha do forjador · descanso {forjadorConfig.descansoPadraoSeg}s · cardio{" "}
            {forjadorConfig.cardioMetaMinutos} min
          </p>
        )}
      </div>

      <ul className={`mt-4 ${DASHBOARD_SCROLL_LIST}`} aria-label="Lista de exercícios do dia">
        {subgroup.exercises.map((exercise) => (
          <li key={exercise.id} className="min-w-0">
            <MonumentalExerciseCard
              exercise={exercise}
              isActive={exercise.id === activeExerciseId}
              isSuperacaoFlame={exercise.id === superacaoExerciseId}
              musculo={musculo}
              isIncubating={isIncubating}
              hasBiologicalBalance={hasBiologicalBalance}
              userId={userId}
              restSeconds={resolveExerciseRestSeconds(
                exercise.id,
                forjadorPrescriptions,
                activeTreinoMuscle,
                forjadorConfig,
              )}
              onActivate={onActivate}
              onVolumeCommitted={onVolumeCommitted}
              onWeightSaved={onWeightSaved}
              onWatchVideo={onWatchVideo}
              onSuperacao={onSuperacao}
              onPersistSuccess={onPersistSuccess}
            />
          </li>
        ))}
      </ul>
    </BrasaVivaCard>
  );
}
