"use client";

import { useMemo, useState } from "react";
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
  hasForjadorPrescriptionForDay,
  resolveExerciseRestSeconds,
  type ForjadorPrescriptionRow,
  type ForjadorTreinoConfig,
} from "@/lib/forjador-prescriptions";
import { subgroupIdToMusculo } from "@/lib/subgroup-musculo";
import { composeDayTreinoSubgroup, subgroupIdToTrainingMuscle } from "@/lib/treino-subgroup";
import { DEFAULT_TRAINING_TRACK, type TrainingTrackState } from "@/lib/training-track";
import type { PlanilhaDayRow, TrainingMuscleGroup, WeekdayIndex } from "@/lib/training-week";
import { buildScheduleMap } from "@/lib/training-week";
import {
  isExerciseWeekLocked,
  listFullyLockedTrainingDays,
} from "@/lib/treino-week-lock";

const PLANILHA_DAYS: WeekdayIndex[] = [1, 2, 3, 4, 5, 6];

type TreinoTabProps = {
  subgroup: MuscleSubgroup;
  activeExerciseId: number;
  superacaoExerciseId: number | null;
  isIncubating: boolean;
  hasBiologicalBalance: boolean;
  userId: string | null;
  initialWeekSchedule?: PlanilhaDayRow[];
  activeTrainingDay: WeekdayIndex;
  isTreinoSwitching: boolean;
  forjadorConfig: ForjadorTreinoConfig;
  forjadorPrescriptions: ForjadorPrescriptionRow[];
  trainingTrack?: TrainingTrackState;
  onTrainingDayPick: (day: WeekdayIndex) => void;
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
  activeTrainingDay,
  isTreinoSwitching,
  forjadorConfig,
  forjadorPrescriptions,
  trainingTrack = DEFAULT_TRAINING_TRACK,
  onTrainingDayPick,
  onActivate,
  onVolumeCommitted,
  onWeightSaved,
  onWatchVideo,
  onSuperacao,
  onPersistSuccess,
  onSetComplete,
  maxLoadsByExerciseId = {},
}: TreinoTabProps) {
  const [cardsMinimized, setCardsMinimized] = useState(true);
  const scheduleMap = useMemo(
    () => buildScheduleMap(initialWeekSchedule ?? []),
    [initialWeekSchedule],
  );
  const dayMuscles: TrainingMuscleGroup[] = scheduleMap[activeTrainingDay] ?? [];
  const hasForjadorPlan = hasForjadorPrescriptionForDay(forjadorPrescriptions, dayMuscles);
  const cardioGoalMs = forjadorConfig.cardioMetaMinutos * 60 * 1000;

  const weekLockedDays = useMemo(() => {
    if (!userId) return [];
    const dayExerciseIds: Partial<Record<WeekdayIndex, number[]>> = {};
    for (const day of PLANILHA_DAYS) {
      const daySubgroup = composeDayTreinoSubgroup(
        scheduleMap[day] ?? [],
        trainingTrack,
        forjadorPrescriptions,
        day,
      );
      dayExerciseIds[day] = daySubgroup.exercises.map((exercise) => exercise.id);
    }
    return listFullyLockedTrainingDays(userId, dayExerciseIds);
  }, [userId, scheduleMap, trainingTrack, forjadorPrescriptions]);

  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      className={DASHBOARD_PANEL_FRAME}
      aria-labelledby="subgrupo-monumental-title"
    >
      <DashboardPanelHeader chip="Treino" meta="Planilha do forjador" metaVariant="chip" />

      <CardioVooCinzasPanel userId={userId} goalMs={cardioGoalMs} />

      {userId ? (
        <div className="mt-4">
          <TreinoWeekControls
            userId={userId}
            initialSchedule={initialWeekSchedule}
            activeTrainingDay={activeTrainingDay}
            isTreinoSwitching={isTreinoSwitching}
            hasForjadorPlan={hasForjadorPlan}
            forjadorConfig={forjadorConfig}
            weekLockedDays={weekLockedDays}
            onTrainingDayPick={onTrainingDayPick}
          />
        </div>
      ) : null}

      <div className={`mt-4 space-y-4 ${DASHBOARD_INNER_FRAME} p-4`}>
        <MonumentalSubgroupTitle subgroup={subgroup} />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-500">
            {subgroup.exercises.length} exercício{subgroup.exercises.length === 1 ? "" : "s"}{" "}
            prescrito{subgroup.exercises.length === 1 ? "" : "s"}
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
        {subgroup.exercises.map((exercise) => {
          const trainingMuscle = subgroupIdToTrainingMuscle(exercise.subgroupId);
          const musculo = subgroupIdToMusculo(exercise.subgroupId);
          const isWeekLocked = Boolean(
            userId && isExerciseWeekLocked(userId, activeTrainingDay, exercise.id),
          );
          const isMaxLoadRegistered =
            Boolean(maxLoadsByExerciseId[exercise.id]) || isWeekLocked;

          return (
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
                  trainingMuscle,
                  forjadorConfig,
                )}
                onActivate={onActivate}
                onVolumeCommitted={onVolumeCommitted}
                onWeightSaved={onWeightSaved}
                onWatchVideo={onWatchVideo}
                onSuperacao={onSuperacao}
                onPersistSuccess={onPersistSuccess}
                onSetComplete={onSetComplete}
                isMaxLoadRegistered={isMaxLoadRegistered}
                isWeekLocked={isWeekLocked}
              />
            </li>
          );
        })}
      </ul>
    </BrasaVivaCard>
  );
}
