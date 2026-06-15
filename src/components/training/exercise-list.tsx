"use client";

import { useCallback, useMemo, useState } from "react";
import PhoenixInput from "@/components/PhoenixInput";
import { WorkoutTimer } from "@/components/training/workout-timer";
import { buildSubgroupFromCatalog, TEST_EXERCISE_CATALOG } from "@/lib/exercise-catalog";
import { DASHBOARD_INNER_FRAME, DASHBOARD_SCROLL_LIST } from "@/lib/dashboard-config";
import {
  MUSCLE_GROUP_LABELS,
  MUSCLE_TO_SUBGROUP_ID,
  trainingMuscleToSubgrupo,
  type TrainingMuscleGroup,
} from "@/lib/training-week";

export type ExerciseListProps = {
  userId: string;
  selectedMuscleGroup: TrainingMuscleGroup;
  isOverride?: boolean;
};

export function ExerciseList({ userId, selectedMuscleGroup, isOverride = false }: ExerciseListProps) {
  const [activeExerciseId, setActiveExerciseId] = useState<number | null>(null);
  const [timerToken, setTimerToken] = useState(0);

  const subgroup = useMemo(() => {
    const subgroupId = MUSCLE_TO_SUBGROUP_ID[selectedMuscleGroup];
    const entry = TEST_EXERCISE_CATALOG.subgroups.find((item) => item.id === subgroupId);
    return entry ? buildSubgroupFromCatalog(entry) : null;
  }, [selectedMuscleGroup]);

  const musculo = trainingMuscleToSubgrupo(selectedMuscleGroup);

  const handlePersistSuccess = useCallback(() => {
    setTimerToken((token) => token + 1);
  }, []);

  if (!subgroup) {
    return (
      <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
        Exercícios indisponíveis para {MUSCLE_GROUP_LABELS[selectedMuscleGroup]}.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">
          Lista HUD · {MUSCLE_GROUP_LABELS[selectedMuscleGroup]}
        </p>
        {isOverride ? (
          <span className="rounded-full border border-amber-500/25 bg-amber-950/25 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-amber-200/85">
            Foco alternado
          </span>
        ) : null}
      </div>

      <WorkoutTimer restartToken={timerToken} defaultSeconds={90} />

      <ul className={DASHBOARD_SCROLL_LIST} aria-label={`Exercícios de ${subgroup.name}`}>
        {subgroup.exercises.map((exercise) => {
          const isActive = activeExerciseId === exercise.id;

          return (
            <li
              key={exercise.id}
              className={`rounded-xl border p-4 transition-[border-color,box-shadow] duration-200 ${
                isActive
                  ? "border-amber-500/30 bg-amber-950/15 shadow-[0_0_12px_rgba(245,158,11,0.12)]"
                  : "border-orange-500/10 bg-black/35"
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveExerciseId(exercise.id)}
                className="w-full text-left"
              >
                <p className="text-sm font-bold text-amber-50">{exercise.name}</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
                  {exercise.targetSets} séries · meta {exercise.targetReps}
                  {exercise.metricKind === "duration_sec" ? "s" : exercise.metricKind === "rep_max" ? " reps" : " kg"}
                </p>
              </button>

              {isActive ? (
                <div className={`mt-4 ${DASHBOARD_INNER_FRAME} p-3`}>
                  <PhoenixInput
                    userId={userId}
                    exercicioId={exercise.id}
                    exercicioNome={exercise.name}
                    initialWeight={exercise.currentWeight}
                    prescribedSeries={exercise.targetSets}
                    musculo={musculo}
                    metricKind={exercise.metricKind}
                    isExerciseActive
                    fieldIdPrefix={`treino-${exercise.id}-`}
                    onPersistSuccess={handlePersistSuccess}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
