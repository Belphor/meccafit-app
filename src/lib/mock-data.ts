export type {
  BodyRegionSubtitle,
  ClientProfile,
  Exercise,
  ExercisePersonalRecord,
  MuralPost,
  MuscleSubgroup,
} from "@/lib/mock-data-types";

import type { BodyRegionSubtitle, Exercise, ExercisePersonalRecord, MuscleSubgroup } from "@/lib/mock-data-types";
import {
  exercisePersonalRecordsMock,
  exercisesMock,
  monumentalSubgroupMock,
  subgroupsCatalog,
} from "@/lib/exercise-catalog";

export {
  exercisePersonalRecordsMock,
  exercisesMock,
  monumentalSubgroupMock,
  subgroupsCatalog,
  TEST_EXERCISE_CATALOG,
  TEST_EXERCISE_IDS,
  findCatalogExerciseById,
  resolveCatalogMetricKind,
  resolveCatalogMusculo,
} from "@/lib/exercise-catalog";

const BODY_REGION_BY_SUBGROUP_ID: Record<string, BodyRegionSubtitle> = {
  "peitoral-superior": "Membro Superior",
  "ombros-deltoides": "Membro Superior",
  "bracos-biceps-triceps": "Membro Superior",
  "costas-dorsal": "Membro Superior",
  "membro-inferior": "Membro Inferior",
  core: "Core",
};

export function resolveBodyRegionSubtitle(
  subgroup: Pick<MuscleSubgroup, "id" | "bodyRegionSubtitle">,
): BodyRegionSubtitle {
  if (subgroup.bodyRegionSubtitle) {
    return subgroup.bodyRegionSubtitle;
  }

  const normalized = subgroup.id.trim().toLowerCase();
  if (normalized in BODY_REGION_BY_SUBGROUP_ID) {
    return BODY_REGION_BY_SUBGROUP_ID[normalized];
  }
  if (normalized.includes("inferior") || normalized.includes("perna")) {
    return "Membro Inferior";
  }
  if (normalized.includes("core") || normalized.includes("abdome") || normalized.includes("abdômen")) {
    return "Membro Superior";
  }

  return "Membro Superior";
}

export function getHistoricalPersonalRecord(exerciseId: number): ExercisePersonalRecord | null {
  return exercisePersonalRecordsMock[exerciseId] ?? null;
}

/** Retorna a Carga Máxima (PR) registrada — Supabase ou mock de referência. */
export function resolveExerciseReferenceWeight(
  exercise: Pick<Exercise, "id" | "currentWeight" | "historicalPrWeight">,
): number {
  const mockPr = getHistoricalPersonalRecord(exercise.id)?.topMetric ?? 0;
  const candidates = [exercise.historicalPrWeight, mockPr].filter(
    (value): value is number => typeof value === "number" && value > 0,
  );

  return candidates.length > 0 ? Math.max(...candidates) : 0;
}

export function formatExerciseReferenceWeight(
  exercise: Pick<Exercise, "id" | "currentWeight" | "historicalPrWeight">,
): string {
  const weight = resolveExerciseReferenceWeight(exercise);
  return weight > 0 ? `${weight.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg` : "Sem registro";
}

export function resolveProfileIncubating(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === "incubating" ||
    normalized === "incubacao" ||
    normalized === "incubação" ||
    normalized === "incubando"
  );
}

/** Meta de soma de cargas máximas na sessão para energia do altar (kg). */
export const ALTAR_VTC_SESSION_TARGET_KG = 100;

/** Energia do altar (0–1) derivada da soma de cargas máximas e do último peso salvo. */
export function computeAltarEnergy(baseVtcTotal: number, lastSavedWeight: number): number {
  const fromVtc = Math.min(0.9, baseVtcTotal / ALTAR_VTC_SESSION_TARGET_KG);
  const fromWeight = Math.min(0.45, lastSavedWeight / 100);
  return Math.min(1, fromVtc * 0.75 + fromWeight * 0.35);
}
