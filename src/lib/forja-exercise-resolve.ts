import { TEST_EXERCISE_CATALOG } from "@/lib/exercise-catalog";
import type { Exercise, MuscleSubgroup } from "@/lib/mock-data";
import type { ForjadorPrescriptionRow } from "@/lib/forjador-prescriptions";
import { trainingMuscleToSubgroupId, type TrainingMuscleGroup } from "@/lib/training-week";

export function slugifyExerciseId(raw: string): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? `forja-${normalized.slice(0, 48)}` : "forja-exercicio";
}

export function normalizeExerciseNameKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function extractPrescriptionExerciseLabel(row: ForjadorPrescriptionRow): string | null {
  const obs = row.observacoes?.trim() ?? "";
  if (!obs) return null;

  const prefixed = obs.match(/^(?:Forja|Sheets)\s·\s(.+)$/i);
  return prefixed?.[1]?.trim() ?? obs;
}

/** Resolve nome do exercício para ID numérico do catálogo (string). */
export function resolveCatalogExerciseId(
  muscle: TrainingMuscleGroup,
  exerciseName: string,
): string {
  const subgroupId = trainingMuscleToSubgroupId(muscle);
  const entry = TEST_EXERCISE_CATALOG.subgroups.find((item) => item.id === subgroupId);
  if (!entry) return slugifyExerciseId(exerciseName);

  const inputKey = normalizeExerciseNameKey(exerciseName);
  if (!inputKey) return slugifyExerciseId(exerciseName);

  for (const exercise of entry.exercises) {
    const catalogKey = normalizeExerciseNameKey(exercise.name);
    if (catalogKey === inputKey) {
      return String(exercise.id);
    }
  }

  return slugifyExerciseId(exerciseName);
}

function findCatalogExerciseForPrescription(
  subgroup: MuscleSubgroup,
  row: ForjadorPrescriptionRow,
): Exercise | undefined {
  const byId = subgroup.exercises.find((exercise) => String(exercise.id) === row.exercicio_id);
  if (byId) return byId;

  const slug = row.exercicio_id.trim().toLowerCase();
  const label = extractPrescriptionExerciseLabel(row);
  const labelKey = label ? normalizeExerciseNameKey(label) : null;

  for (const exercise of subgroup.exercises) {
    if (slugifyExerciseId(exercise.name) === slug) return exercise;
    const nameKey = normalizeExerciseNameKey(exercise.name);
    if (labelKey && nameKey === labelKey) return exercise;
  }

  return undefined;
}

function syntheticExerciseId(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return 900_000 + (hash % 99_999);
}

/** Aplica carga/séries/reps de uma prescrição a um exercício do subgrupo. */
export function applyPrescriptionRowToSubgroup(
  subgroup: MuscleSubgroup,
  row: ForjadorPrescriptionRow,
): Exercise {
  const prescribedName = extractPrescriptionExerciseLabel(row);
  const prescribedKey = prescribedName ? normalizeExerciseNameKey(prescribedName) : null;
  const catalogMatch = findCatalogExerciseForPrescription(subgroup, row);

  const catalogMatchesLabel =
    catalogMatch &&
    prescribedKey &&
    normalizeExerciseNameKey(catalogMatch.name) === prescribedKey;

  const base =
    catalogMatch && (!prescribedKey || catalogMatchesLabel)
      ? catalogMatch
      : ({
          id: syntheticExerciseId(`${row.grupo_muscular}:${row.exercicio_id}:${prescribedKey ?? ""}`),
          name: prescribedName ?? row.exercicio_id.replace(/^forja-/, "").replace(/-/g, " "),
          metricKind: catalogMatch?.metricKind ?? ("load_kg" as const),
          targetSets: row.series_alvo,
          targetReps: row.repeticoes_alvo,
          currentWeight: row.peso_prescrito ?? 0,
          completedSets: 0,
          video_url: catalogMatch?.video_url ?? "",
          subgroupId: subgroup.id,
        } satisfies Exercise);

  return {
    ...base,
    name: prescribedName ?? base.name,
    targetSets: row.series_alvo,
    targetReps: row.repeticoes_alvo,
    repsPerSet: row.repeticoes_por_serie,
    progressionAlternatives: row.progressao_alternativas,
    ...(row.peso_prescrito && row.peso_prescrito > 0
      ? { currentWeight: row.peso_prescrito, historicalPrWeight: row.peso_prescrito }
      : null),
  };
}
