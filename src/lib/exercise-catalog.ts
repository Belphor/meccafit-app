import catalogJson from "@/data/test-exercise-catalog.json";
import type { Enums } from "@/types/database.types";
import type { BodyRegionSubtitle, Exercise, ExerciseMetricKind, MuscleSubgroup } from "@/lib/mock-data-types";

export type { MuscleSubgroup, ExerciseMetricKind } from "@/lib/mock-data-types";

type CatalogExercise = {
  id: number;
  name: string;
  metricKind: ExerciseMetricKind;
  targetSets: number;
  targetReps?: number;
  targetDurationSec?: number;
  seedMetric: number;
  video_url: string;
};

type CatalogSubgroup = {
  id: string;
  slug: string;
  numericRouteId: number;
  name: string;
  monumentalTitle: string;
  bodyRegionSubtitle: BodyRegionSubtitle;
  musculo: Enums<"subgrupo_muscular">;
  exercises: CatalogExercise[];
};

export type TestExerciseCatalog = {
  version: number;
  cardio: {
    productionGoalMs: number;
    testGoalMs: number;
    testCheckInWindowMs: number;
  };
  subgroups: CatalogSubgroup[];
};

export const TEST_EXERCISE_CATALOG = catalogJson as TestExerciseCatalog;

export const TEST_EXERCISE_IDS = TEST_EXERCISE_CATALOG.subgroups.flatMap((subgroup) =>
  subgroup.exercises.map((exercise) => exercise.id),
);

export function buildExerciseFromCatalog(
  subgroupId: string,
  entry: CatalogExercise,
  currentWeight = entry.seedMetric,
): Exercise {
  return {
    id: entry.id,
    name: entry.name,
    metricKind: entry.metricKind,
    targetSets: entry.targetSets,
    targetReps: entry.targetReps ?? entry.targetDurationSec ?? 0,
    targetDurationSec: entry.targetDurationSec,
    currentWeight,
    completedSets: 0,
    video_url: entry.video_url,
    subgroupId,
  };
}

export function buildSubgroupFromCatalog(entry: CatalogSubgroup): MuscleSubgroup {
  return {
    id: entry.id,
    slug: entry.slug,
    numericRouteId: entry.numericRouteId,
    name: entry.name,
    monumentalTitle: entry.monumentalTitle,
    bodyRegionSubtitle: entry.bodyRegionSubtitle,
    exercises: entry.exercises.map((exercise) => buildExerciseFromCatalog(entry.id, exercise)),
  };
}

export const subgroupsCatalog: MuscleSubgroup[] = TEST_EXERCISE_CATALOG.subgroups.map(
  buildSubgroupFromCatalog,
);

export const monumentalSubgroupMock: MuscleSubgroup =
  subgroupsCatalog.find((subgroup) => subgroup.id === "peitoral-superior") ?? subgroupsCatalog[0];

export const exercisesMock: Exercise[] = monumentalSubgroupMock.exercises;

export const exercisePersonalRecordsMock: Record<
  number,
  { exerciseId: number; topMetric: number; achievedAt: string }
> = Object.fromEntries(
  TEST_EXERCISE_CATALOG.subgroups.flatMap((subgroup) =>
    subgroup.exercises.map((exercise) => [
      exercise.id,
      {
        exerciseId: exercise.id,
        topMetric: exercise.seedMetric,
        achievedAt: "2026-05-10T14:00:00.000Z",
      },
    ]),
  ),
);

export function findCatalogExerciseById(exerciseId: number): CatalogExercise | null {
  for (const subgroup of TEST_EXERCISE_CATALOG.subgroups) {
    const match = subgroup.exercises.find((exercise) => exercise.id === exerciseId);
    if (match) return match;
  }
  return null;
}

export function resolveCatalogMusculo(exerciseId: number): Enums<"subgrupo_muscular"> | null {
  for (const subgroup of TEST_EXERCISE_CATALOG.subgroups) {
    if (subgroup.exercises.some((exercise) => exercise.id === exerciseId)) {
      return subgroup.musculo;
    }
  }
  return null;
}

export function resolveCatalogMetricKind(exerciseId: number): ExerciseMetricKind {
  return findCatalogExerciseById(exerciseId)?.metricKind ?? "load_kg";
}
