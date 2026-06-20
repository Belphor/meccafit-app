"use client";

import { useState } from "react";
import type { MuscleSubgroup } from "@/lib/mock-data";
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
  TREINO_MINIMIZE_TOGGLE,
} from "@/lib/dashboard-config";
import {
  hasForjadorPrescriptionForMuscle,
  resolveExerciseRestSeconds,
  type ForjadorPrescriptionRow,
  type ForjadorTreinoConfig,
} from "@/lib/forjador-prescriptions";
import { subgroupIdToMusculo } from "@/lib/subgroup-musculo";
import { resolveActiveTreinoSubgroup } from "@/lib/treino-subgroup";
import { DEFAULT_TRAINING_TRACK, type TrainingTrackState } from "@/lib/training-track";
import type { ClientTrainingMuscleGroup, PlanilhaDayRow, WeekdayIndex } from "@/lib/training-week";

type TreinoTabProps = {
  subgroup: MuscleSubgroup;
  activeExerciseId: number;
  superacaoExerciseId: number | null;
  isIncubating: boolean;
  hasBiologicalBalance: boolean;
  userId: string | null;
  initialWeekSchedule?: PlanilhaDayRow[];
  activeTreinoMuscle: ClientTrainingMuscleGroup;
  isTreinoSwitching: boolean;
  forjadorConfig: ForjadorTreinoConfig;
  forjadorPrescriptions: ForjadorPrescriptionRow[];
  trainingTrack?: TrainingTrackState;
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
  onPersistSuccess?: (exerciseId: number, detail?: { vtcGenerated: number }) => void;
  onSetComplete?: (exerciseId: number) => void;
  maxLoadsByExerciseId?: Record<number, number>;
};

export function TreinoTab({
  subgroup,
  activeExerciseId,
  superacaoExerciseId,
  isIncubating,
  hasBiologicalBalance,
  userId,
  initialWeekSchedule,
  activeTreinoMuscle,
  isTreinoSwitching,
  forjadorConfig,
  forjadorPrescriptions,
  trainingTrack = DEFAULT_TRAINING_TRACK,
  indicatedDay,
  onIndicatedDayChange,
  onTrainingMusclePick,
  onActivate,
  onVolumeCommitted,
  onWeightSaved,
  onWatchVideo,
  onSuperacao,
  onPersistSuccess,
  onSetComplete,
  maxLoadsByExerciseId = {},
}: TreinoTabProps) {
  const [cardsMinimized, setCardsMinimized] = useState(false);
  const displaySubgroup = resolveActiveTreinoSubgroup(
    activeTreinoMuscle,
    subgroup,
    trainingTrack,
    forjadorPrescriptions,
  );
  const musculo = subgroupIdToMusculo(displaySubgroup.id);
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
            isTreinoSwitching={isTreinoSwitching}
            hasForjadorPlan={hasForjadorPlan}
            forjadorConfig={forjadorConfig}
            indicatedDay={indicatedDay}
            onIndicatedDayChange={onIndicatedDayChange}
            onTrainingMusclePick={onTrainingMusclePick}
          />
        ) : null}

        <MonumentalSubgroupTitle subgroup={displaySubgroup} />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-500">
            {displaySubgroup.exercises.length} exercícios
          </p>
          <button
            type="button"
            onClick={() => setCardsMinimized((value) => !value)}
            className={TREINO_MINIMIZE_TOGGLE}
            aria-pressed={cardsMinimized}
          >
            {cardsMinimized ? "Expandir cards" : "Minimizar cards"}
          </button>
        </div>
      </div>

      <ul
        className={`mt-4 ${DASHBOARD_SCROLL_LIST} transition-opacity duration-150 ${
          isTreinoSwitching ? "opacity-70" : "opacity-100"
        }`}
        aria-label="Lista de exercícios do dia"
        aria-busy={isTreinoSwitching}
      >
        {displaySubgroup.exercises.map((exercise) => (
          <li key={exercise.id} className="min-w-0">
            <MonumentalExerciseCard
              exercise={exercise}
              isActive={exercise.id === activeExerciseId}
              isMinimized={cardsMinimized}
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
              onSetComplete={onSetComplete}
              isMaxLoadRegistered={Boolean(maxLoadsByExerciseId[exercise.id])}
            />
          </li>
        ))}
      </ul>
    </BrasaVivaCard>
  );
}
