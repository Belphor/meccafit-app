import type { Enums } from "@/types/database.types";

/** Segunda=1 … Sábado=6 */
export type WeekdayIndex = 1 | 2 | 3 | 4 | 5 | 6;

/** Grupos que o atleta pode escolher livremente (abdômen entra nos treinos dos membros). */
export const CLIENT_TRAINING_MUSCLE_GROUPS = [
  "PEITO",
  "COSTAS",
  "PERNAS",
  "OMBROS",
  "BRACOS",
] as const;

export type ClientTrainingMuscleGroup = (typeof CLIENT_TRAINING_MUSCLE_GROUPS)[number];

export const TRAINING_MUSCLE_GROUPS = [
  ...CLIENT_TRAINING_MUSCLE_GROUPS,
  "ABDOMEN",
] as const;

export type TrainingMuscleGroup = (typeof TRAINING_MUSCLE_GROUPS)[number];
export type WeeklyScheduleMuscleGroup = ClientTrainingMuscleGroup;

export const WEEKDAY_LABELS: Record<WeekdayIndex, string> = {
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

export const WEEKDAY_SHORT_LABELS: Record<WeekdayIndex, string> = {
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

export const MUSCLE_GROUP_LABELS: Record<TrainingMuscleGroup, string> = {
  PEITO: "Peito",
  COSTAS: "Costas",
  PERNAS: "Pernas",
  OMBROS: "Ombros",
  BRACOS: "Braços",
  ABDOMEN: "Abdômen",
};

export const DEFAULT_WEEKLY_SCHEDULE: Record<WeekdayIndex, WeeklyScheduleMuscleGroup> = {
  1: "PEITO",
  2: "COSTAS",
  3: "PERNAS",
  4: "OMBROS",
  5: "BRACOS",
  6: "BRACOS",
};

export const MUSCLE_TO_SUBGROUP_ID: Record<ClientTrainingMuscleGroup, string> = {
  PEITO: "peitoral-superior",
  COSTAS: "costas-dorsal",
  PERNAS: "membro-inferior",
  OMBROS: "ombros-deltoides",
  BRACOS: "bracos-biceps-triceps",
};

export const ABDOMEN_SUBGROUP_ID = "core";

export function trainingMuscleToSubgroupId(muscle: TrainingMuscleGroup): string {
  if (muscle === "ABDOMEN") return ABDOMEN_SUBGROUP_ID;
  return MUSCLE_TO_SUBGROUP_ID[muscle];
}

export type PlanilhaDayRow = {
  dia_semana: WeekdayIndex;
  grupo_muscular: WeeklyScheduleMuscleGroup;
};

export function resolveCalendarWeekdayIndex(date = new Date()): WeekdayIndex {
  const day = date.getDay();
  if (day === 0) return 1;
  if (day === 6) return 6;
  return day as WeekdayIndex;
}

export function normalizeTrainingMuscleGroup(value: string | null | undefined): TrainingMuscleGroup | null {
  const upper = String(value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  if (TRAINING_MUSCLE_GROUPS.includes(upper as TrainingMuscleGroup)) {
    return upper as TrainingMuscleGroup;
  }
  return null;
}

export function normalizeWeeklyScheduleMuscle(
  value: string | null | undefined,
): WeeklyScheduleMuscleGroup | null {
  const muscle = normalizeTrainingMuscleGroup(value);
  if (!muscle || muscle === "ABDOMEN") return null;
  return muscle;
}

export function buildScheduleMap(rows: PlanilhaDayRow[]): Record<WeekdayIndex, WeeklyScheduleMuscleGroup> {
  const map = { ...DEFAULT_WEEKLY_SCHEDULE };

  for (const row of rows) {
    const muscle = normalizeWeeklyScheduleMuscle(row.grupo_muscular);
    if (muscle && row.dia_semana >= 1 && row.dia_semana <= 6) {
      map[row.dia_semana as WeekdayIndex] = muscle;
    }
  }

  return map;
}

export function subgroupIdToClientTrainingMuscle(
  subgroupId: string,
): ClientTrainingMuscleGroup | null {
  for (const muscle of CLIENT_TRAINING_MUSCLE_GROUPS) {
    if (MUSCLE_TO_SUBGROUP_ID[muscle] === subgroupId) {
      return muscle;
    }
  }
  return null;
}

export function trainingMuscleToSubgrupo(
  muscle: TrainingMuscleGroup,
): Enums<"subgrupo_muscular"> {
  const map: Record<TrainingMuscleGroup, Enums<"subgrupo_muscular">> = {
    PEITO: "peito",
    COSTAS: "costas",
    PERNAS: "pernas",
    OMBROS: "ombros",
    BRACOS: "bracos",
    ABDOMEN: "abdomen",
  };
  return map[muscle];
}
