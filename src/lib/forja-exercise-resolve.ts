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
  const match = obs.match(/^(?:Forja|Sheets)\s·\s(.+)$/i);
  return match?.[1]?.trim() ?? null;
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

  let partialMatch: (typeof entry.exercises)[number] | null = null;

  for (const exercise of entry.exercises) {
    const catalogKey = normalizeExerciseNameKey(exercise.name);
    if (catalogKey === inputKey) {
      return String(exercise.id);
    }
    if (
      !partialMatch &&
      (catalogKey.includes(inputKey) || inputKey.includes(catalogKey))
    ) {
      partialMatch = exercise;
    }
  }

  if (partialMatch) return String(partialMatch.id);
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
    const nameKey = normalizeExerciseNameKey(exercise.name);
    if (slugifyExerciseId(exercise.name) === slug) return exercise;
    if (labelKey && nameKey === labelKey) return exercise;
    if (labelKey && (nameKey.includes(labelKey) || labelKey.includes(nameKey))) return exercise;
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
  const base =
    findCatalogExerciseForPrescription(subgroup, row) ??
    ({
      id: syntheticExerciseId(`${row.grupo_muscular}:${row.exercicio_id}`),
      name: extractPrescriptionExerciseLabel(row) ?? row.exercicio_id.replace(/^forja-/, ""),
      metricKind: "load_kg" as const,
      targetSets: row.series_alvo,
      targetReps: row.repeticoes_alvo,
      currentWeight: row.peso_prescrito ?? 0,
      completedSets: 0,
      video_url: "",
      subgroupId: subgroup.id,
    } satisfies Exercise);

  return {
    ...base,
    targetSets: row.series_alvo,
    targetReps: row.repeticoes_alvo,
    ...(row.peso_prescrito && row.peso_prescrito > 0
      ? { currentWeight: row.peso_prescrito, historicalPrWeight: row.peso_prescrito }
      : null),
  };
}
