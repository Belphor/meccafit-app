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
/** @deprecated Use TrainingMuscleGroup em planilhas (inclui ABDOMEN). */
export type WeeklyScheduleMuscleGroup = ClientTrainingMuscleGroup;

export type WeeklyScheduleDay = TrainingMuscleGroup[];

/** Máximo de grupos musculares indicados por dia na planilha do forjador. */
export const MAX_PLANILHA_GRUPOS_POR_DIA = 5;

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

export const DEFAULT_WEEKLY_SCHEDULE: Record<WeekdayIndex, WeeklyScheduleDay> = {
  1: ["PEITO"],
  2: ["COSTAS"],
  3: ["PERNAS"],
  4: ["OMBROS"],
  5: ["BRACOS"],
  6: ["BRACOS"],
};

function cloneDefaultWeeklySchedule(): Record<WeekdayIndex, WeeklyScheduleDay> {
  return {
    1: [...DEFAULT_WEEKLY_SCHEDULE[1]],
    2: [...DEFAULT_WEEKLY_SCHEDULE[2]],
    3: [...DEFAULT_WEEKLY_SCHEDULE[3]],
    4: [...DEFAULT_WEEKLY_SCHEDULE[4]],
    5: [...DEFAULT_WEEKLY_SCHEDULE[5]],
    6: [...DEFAULT_WEEKLY_SCHEDULE[6]],
  };
}

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
  grupo_muscular: TrainingMuscleGroup;
  ordem?: number;
};

type PlanilhaRawRow = {
  dia_semana: number | string | null;
  grupo_muscular: string | null;
  ordem?: number | string | null;
};

export function parsePlanilhaDayRows(data: PlanilhaRawRow[] | null | undefined): PlanilhaDayRow[] {
  const parsed: PlanilhaDayRow[] = [];

  for (const row of data ?? []) {
    const muscle = normalizeTrainingMuscleGroup(row.grupo_muscular);
    const day = Number(row.dia_semana) as WeekdayIndex;
    const ordem = Number(row.ordem);
    if (!muscle || day < 1 || day > 6) continue;

    parsed.push({
      dia_semana: day,
      grupo_muscular: muscle,
      ...(Number.isFinite(ordem) && ordem >= 1 && ordem <= MAX_PLANILHA_GRUPOS_POR_DIA
        ? { ordem }
        : {}),
    });
  }

  return parsed.sort((a, b) => {
    if (a.dia_semana !== b.dia_semana) return a.dia_semana - b.dia_semana;
    const ordemA = a.ordem ?? MAX_PLANILHA_GRUPOS_POR_DIA;
    const ordemB = b.ordem ?? MAX_PLANILHA_GRUPOS_POR_DIA;
    if (ordemA !== ordemB) return ordemA - ordemB;
    return a.grupo_muscular.localeCompare(b.grupo_muscular);
  });
}

function appendMuscleToDay(
  byDay: Map<WeekdayIndex, TrainingMuscleGroup[]>,
  day: WeekdayIndex,
  muscle: TrainingMuscleGroup,
) {
  const list = byDay.get(day) ?? [];
  if (list.includes(muscle) || list.length >= MAX_PLANILHA_GRUPOS_POR_DIA) return;
  list.push(muscle);
  byDay.set(day, list);
}

import { resolveBrasiliaTrainingWeekdayIndex } from "@/lib/brasilia-time";

export function resolveCalendarWeekdayIndex(date = new Date()): WeekdayIndex {
  return resolveBrasiliaTrainingWeekdayIndex(date);
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

export function buildScheduleMap(rows: PlanilhaDayRow[]): Record<WeekdayIndex, WeeklyScheduleDay> {
  const map = cloneDefaultWeeklySchedule();
  const byDay = new Map<WeekdayIndex, TrainingMuscleGroup[]>();

  for (const row of rows) {
    const muscle = normalizeTrainingMuscleGroup(row.grupo_muscular);
    if (!muscle || row.dia_semana < 1 || row.dia_semana > 6) continue;
    appendMuscleToDay(byDay, row.dia_semana as WeekdayIndex, muscle);
  }

  for (const [day, muscles] of byDay) {
    map[day] = muscles.slice(0, MAX_PLANILHA_GRUPOS_POR_DIA);
  }

  return map;
}

export function formatScheduleDayLabel(muscles: WeeklyScheduleDay): string {
  return muscles.map((muscle) => MUSCLE_GROUP_LABELS[muscle]).join(" · ");
}

/** Primeiro grupo executável na aba treino (ignora abdômen como foco isolado). */
export function resolvePrimaryClientMuscleForDay(
  muscles: WeeklyScheduleDay,
): ClientTrainingMuscleGroup {
  const clientMuscle = muscles.find((muscle) =>
    CLIENT_TRAINING_MUSCLE_GROUPS.includes(muscle as ClientTrainingMuscleGroup),
  );
  return (clientMuscle as ClientTrainingMuscleGroup | undefined) ?? "PEITO";
}

export function scheduleDayIncludesClientMuscle(
  muscles: WeeklyScheduleDay,
  muscle: ClientTrainingMuscleGroup,
): boolean {
  return muscles.includes(muscle);
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
