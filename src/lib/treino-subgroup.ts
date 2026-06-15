import {
  applyPersonalPrescriptionsToSubgroup,
  type TrainingTrackState,
} from "@/lib/training-track";
import {
  applyForjadorPrescriptionsToSubgroup,
  type ForjadorPrescriptionRow,
} from "@/lib/forjador-prescriptions";
import {
  buildSubgroupFromCatalog,
  monumentalSubgroupMock,
  TEST_EXERCISE_CATALOG,
} from "@/lib/exercise-catalog";
import type { MuscleSubgroup } from "@/lib/mock-data";
import {
  MUSCLE_TO_SUBGROUP_ID,
  type ClientTrainingMuscleGroup,
} from "@/lib/training-week";

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
