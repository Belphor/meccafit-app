import {
  applyPersonalPrescriptionsToSubgroup,
  type TrainingTrackState,
} from "@/lib/training-track";
import {
  applyForjadorPrescriptionsToSubgroup,
  resolveMusclesForTrainingDay,
  type ForjadorPrescriptionRow,
} from "@/lib/forjador-prescriptions";
import {
  buildSubgroupFromCatalog,
  monumentalSubgroupMock,
  TEST_EXERCISE_CATALOG,
} from "@/lib/exercise-catalog";
import type { Exercise, MuscleSubgroup } from "@/lib/mock-data";
import {
  formatScheduleDayLabel,
  MUSCLE_TO_SUBGROUP_ID,
  trainingMuscleToSubgroupId,
  type ClientTrainingMuscleGroup,
  type TrainingMuscleGroup,
  type WeekdayIndex,
} from "@/lib/training-week";
import { subgroupIdToMusculo } from "@/lib/subgroup-musculo";
import type { Enums } from "@/types/database.types";

export function resolveSubgroupByCatalogId(subgroupId: string): MuscleSubgroup {
  const entry = TEST_EXERCISE_CATALOG.subgroups.find((item) => item.id === subgroupId);
  if (!entry) return monumentalSubgroupMock;
  return buildSubgroupFromCatalog(entry);
}

export function composeTreinoSubgroup(
  base: MuscleSubgroup,
  muscle: ClientTrainingMuscleGroup,
  track: TrainingTrackState,
  forjadorPrescriptions: ForjadorPrescriptionRow[],
): MuscleSubgroup {
  let next = applyForjadorPrescriptionsToSubgroup(base, muscle, forjadorPrescriptions);
  if (track.track === "personal") {
    next = applyPersonalPrescriptionsToSubgroup(next, track.personalPrescriptions);
  }
  return next;
}

/** Monta o treino completo do dia — grupos prescritos pelo forjador na planilha. */
export function composeDayTreinoSubgroup(
  dayMuscles: TrainingMuscleGroup[],
  track: TrainingTrackState,
  forjadorPrescriptions: ForjadorPrescriptionRow[],
  trainingDay: WeekdayIndex,
): MuscleSubgroup {
  const effectiveMuscles = resolveMusclesForTrainingDay(
    forjadorPrescriptions,
    trainingDay,
    dayMuscles,
  );

  if (effectiveMuscles.length === 0) {
    const emptyAnchor = resolveSubgroupByCatalogId(MUSCLE_TO_SUBGROUP_ID.PEITO);
    return {
      ...emptyAnchor,
      id: `planilha-dia-${trainingDay}`,
      slug: `planilha-dia-${trainingDay}`,
      name: "Sem treino prescrito",
      monumentalTitle: "Aguardando prescrição",
      exercises: [],
    };
  }

  const exercises: Exercise[] = [];
  const seenIds = new Set<number>();

  for (const muscle of effectiveMuscles) {
    const subgroupId = trainingMuscleToSubgroupId(muscle);
    const base = resolveSubgroupByCatalogId(subgroupId);
    let next = applyForjadorPrescriptionsToSubgroup(base, muscle, forjadorPrescriptions, trainingDay);

    if (track.track === "personal") {
      next = applyPersonalPrescriptionsToSubgroup(next, track.personalPrescriptions);
    }

    for (const exercise of next.exercises) {
      if (seenIds.has(exercise.id)) continue;
      seenIds.add(exercise.id);
      exercises.push(exercise);
    }
  }

  // Planilha com grupo muscular mas sem exercícios prescritos → estado de lançamento vazio.
  if (exercises.length === 0) {
    const emptyAnchor = resolveSubgroupByCatalogId(MUSCLE_TO_SUBGROUP_ID.PEITO);
    return {
      ...emptyAnchor,
      id: `planilha-dia-${trainingDay}`,
      slug: `planilha-dia-${trainingDay}`,
      name: "Sem treino prescrito",
      monumentalTitle: "Aguardando prescrição",
      exercises: [],
    };
  }

  const label = formatScheduleDayLabel(effectiveMuscles);
  const anchor = resolveSubgroupByCatalogId(trainingMuscleToSubgroupId(effectiveMuscles[0]));

  return {
    ...anchor,
    id: `planilha-dia-${trainingDay}`,
    slug: `planilha-dia-${trainingDay}`,
    name: label,
    monumentalTitle: label,
    exercises,
  };
}

const MUSCULO_TO_TRAINING: Record<Enums<"subgrupo_muscular">, TrainingMuscleGroup> = {
  peito: "PEITO",
  costas: "COSTAS",
  pernas: "PERNAS",
  ombros: "OMBROS",
  bracos: "BRACOS",
  abdomen: "ABDOMEN",
};

export function subgroupIdToTrainingMuscle(subgroupId: string): TrainingMuscleGroup {
  const musculo = subgroupIdToMusculo(subgroupId);
  return MUSCULO_TO_TRAINING[musculo] ?? "PEITO";
}

export function collectUniqueMusclesFromSubgroup(subgroup: MuscleSubgroup): Enums<"subgrupo_muscular">[] {
  const unique = new Set<Enums<"subgrupo_muscular">>();
  for (const exercise of subgroup.exercises) {
    unique.add(subgroupIdToMusculo(exercise.subgroupId));
  }
  return [...unique];
}

/** Garante título e exercícios alinhados ao músculo escolhido (evita flash de nome errado). */
export function resolveActiveTreinoSubgroup(
  activeMuscle: ClientTrainingMuscleGroup,
  loadedSubgroup: MuscleSubgroup,
  track: TrainingTrackState,
  forjadorPrescriptions: ForjadorPrescriptionRow[],
): MuscleSubgroup {
  const expectedId = MUSCLE_TO_SUBGROUP_ID[activeMuscle];
  if (loadedSubgroup.id === expectedId) {
    return loadedSubgroup;
  }

  const catalogBase = resolveSubgroupByCatalogId(expectedId);
  return composeTreinoSubgroup(catalogBase, activeMuscle, track, forjadorPrescriptions);
}
