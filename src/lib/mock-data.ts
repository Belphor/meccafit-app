export interface Exercise {
  id: number;
  name: string;
  targetSets: number;
  targetReps: number;
  currentWeight: number;
  /** PR persistido no Supabase — prioridade sobre mock local. */
  historicalPrWeight?: number;
  completedSets: number;
  video_url: string;
  subgroupId: string;
}

export type BodyRegionSubtitle = "Membro Superior" | "Membro Inferior" | "Core";

const BODY_REGION_BY_SUBGROUP_ID: Record<string, BodyRegionSubtitle> = {
  "peitoral-superior": "Membro Superior",
  "membro-inferior": "Membro Inferior",
  core: "Membro Superior",
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

export type MuscleSubgroup = {
  id: string;
  slug: string;
  numericRouteId: number;
  /** Nome técnico do subgrupo (ex.: Peitoral Superior). */
  name: string;
  /** Título principal exibido no altar (ex.: Peito). */
  monumentalTitle: string;
  /** Subtítulo — região corporal: Membro Superior, Membro Inferior ou Core. */
  bodyRegionSubtitle: BodyRegionSubtitle;
  exercises: Exercise[];
};

export interface ClientProfile {
  name: string;
  lineage: string;
  status: string;
  birth: string;
  age: number;
  role?: "forjador" | "forjador_linhagem" | "forjador_soberano" | "cliente";
}

export type MuralPost = {
  id: string;
  exerciseName: string;
  weight: number;
  series: number;
  createdAt: string;
  athleteName?: string;
  lineageName?: string;
  shareImageUrl?: string;
};

/** Personal Record (PR) — Carga Máxima histórica por exercício (referência de superação). */
export type ExercisePersonalRecord = {
  exerciseId: number;
  topWeightKg: number;
  achievedAt: string;
};

const SUBGROUP_PEITORAL_ID = "peitoral-superior";

export const exercisePersonalRecordsMock: Record<number, ExercisePersonalRecord> = {
  1: { exerciseId: 1, topWeightKg: 30, achievedAt: "2026-05-10T14:00:00.000Z" },
  2: { exerciseId: 2, topWeightKg: 22, achievedAt: "2026-05-12T16:30:00.000Z" },
  3: { exerciseId: 3, topWeightKg: 25, achievedAt: "2026-05-14T11:15:00.000Z" },
};

export function getHistoricalPersonalRecord(exerciseId: number): ExercisePersonalRecord | null {
  return exercisePersonalRecordsMock[exerciseId] ?? null;
}

/** Retorna a Carga Máxima (PR) registrada — Supabase ou mock de referência. */
export function resolveExerciseReferenceWeight(
  exercise: Pick<Exercise, "id" | "currentWeight" | "historicalPrWeight">,
): number {
  const mockPr = getHistoricalPersonalRecord(exercise.id)?.topWeightKg ?? 0;
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

export const exercisesMock: Exercise[] = [
  {
    id: 1,
    name: "Supino Reto Halteres",
    targetSets: 4,
    targetReps: 10,
    currentWeight: 30,
    completedSets: 0,
    video_url: "https://www.youtube.com/embed/rT7DgCr-3pg",
    subgroupId: SUBGROUP_PEITORAL_ID,
  },
  {
    id: 2,
    name: "Crucifixo Inclinado",
    targetSets: 3,
    targetReps: 12,
    currentWeight: 22,
    completedSets: 0,
    video_url: "https://www.youtube.com/embed/8iPEnov-lmU",
    subgroupId: SUBGROUP_PEITORAL_ID,
  },
  {
    id: 3,
    name: "Crossover Polia Alta",
    targetSets: 4,
    targetReps: 15,
    currentWeight: 25,
    completedSets: 0,
    video_url: "https://www.youtube.com/embed/Iwe6AmxVf7o",
    subgroupId: SUBGROUP_PEITORAL_ID,
  },
];

export const monumentalSubgroupMock: MuscleSubgroup = {
  id: SUBGROUP_PEITORAL_ID,
  slug: "peitoral-superior",
  numericRouteId: 1,
  name: "Peitoral Superior",
  monumentalTitle: "Peito",
  bodyRegionSubtitle: "Membro Superior",
  exercises: exercisesMock,
};

export const subgroupsCatalog: MuscleSubgroup[] = [
  monumentalSubgroupMock,
  {
    id: "membro-inferior",
    slug: "membro-inferior",
    numericRouteId: 2,
    name: "Pernas",
    monumentalTitle: "Pernas",
    bodyRegionSubtitle: "Membro Inferior",
    exercises: [],
  },
  {
    id: "core",
    slug: "core",
    numericRouteId: 3,
    name: "Abdômen",
    monumentalTitle: "Abdômen",
    bodyRegionSubtitle: "Membro Superior",
    exercises: [],
  },
];

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
