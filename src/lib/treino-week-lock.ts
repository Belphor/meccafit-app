/**
 * Trava de carga:
 * - Input/superação: 1× por exercício no dia civil (SP) — libera amanhã.
 * - ✓ da planilha: dia da semana permanece marcado até a próxima segunda.
 */

import { resolveAltarContribution } from "@/lib/training-metric";
import { resolveCatalogMetricKind } from "@/lib/exercise-catalog";
import { resolveTreinoDayKey, APP_DAY_TIMEZONE } from "@/lib/treino-day-key";
import type { WeekdayIndex } from "@/lib/training-week";

const DAY_STORAGE_PREFIX = "meccafit:treino-day-vtc";
const WEEK_STORAGE_PREFIX = "meccafit:treino-week-vtc";
const DAY_SNAPSHOT_VERSION = 2 as const;
const WEEK_SNAPSHOT_VERSION = 1 as const;

type LoadMap = Partial<Record<WeekdayIndex, Record<string, number>>>;

type DayVtcLockSnapshot = {
  v: typeof DAY_SNAPSHOT_VERSION;
  dayKey: string;
  days: LoadMap;
  updatedAt: string;
};

type WeekVtcLockSnapshot = {
  v: typeof WEEK_SNAPSHOT_VERSION;
  weekKey: string;
  days: LoadMap;
  updatedAt: string;
};

function addDaysToDayKey(dayKey: string, delta: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

function resolveSpWeekdayIndex(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_DAY_TIMEZONE,
    weekday: "short",
  }).formatToParts(now);
  const label = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[label] ?? 1;
}

/** Segunda-feira civil (SP) que abre a semana da planilha. */
export function resolvePlanilhaWeekKey(now = new Date()): string {
  const today = resolveTreinoDayKey(now);
  const dow = resolveSpWeekdayIndex(now);
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  return addDaysToDayKey(today, -daysFromMonday);
}

function sanitizeLoadMap(source: unknown): LoadMap {
  const days: LoadMap = {};
  if (!source || typeof source !== "object") return days;

  for (const [dayKeyRaw, entries] of Object.entries(source as Record<string, unknown>)) {
    const day = Number(dayKeyRaw) as WeekdayIndex;
    if (day < 1 || day > 6 || !entries || typeof entries !== "object") continue;
    const sanitized: Record<string, number> = {};
    for (const [exerciseKey, value] of Object.entries(entries as Record<string, unknown>)) {
      const exerciseId = Number.parseInt(exerciseKey, 10);
      const contribution = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(exerciseId) || exerciseId <= 0) continue;
      if (!Number.isFinite(contribution) || contribution <= 0) continue;
      sanitized[String(exerciseId)] = contribution;
    }
    if (Object.keys(sanitized).length > 0) {
      days[day] = sanitized;
    }
  }
  return days;
}

function emptyDaySnapshot(dayKey: string): DayVtcLockSnapshot {
  return {
    v: DAY_SNAPSHOT_VERSION,
    dayKey,
    days: {},
    updatedAt: new Date().toISOString(),
  };
}

function emptyWeekSnapshot(weekKey: string): WeekVtcLockSnapshot {
  return {
    v: WEEK_SNAPSHOT_VERSION,
    weekKey,
    days: {},
    updatedAt: new Date().toISOString(),
  };
}

function readDaySnapshot(userId: string): DayVtcLockSnapshot {
  const dayKey = resolveTreinoDayKey();
  if (typeof window === "undefined" || !userId) return emptyDaySnapshot(dayKey);

  try {
    const raw = window.localStorage.getItem(`${DAY_STORAGE_PREFIX}:${userId}:${dayKey}`);
    if (!raw) return emptyDaySnapshot(dayKey);
    const data = JSON.parse(raw) as Partial<DayVtcLockSnapshot>;
    if (data.v !== DAY_SNAPSHOT_VERSION || data.dayKey !== dayKey) {
      return emptyDaySnapshot(dayKey);
    }
    return {
      v: DAY_SNAPSHOT_VERSION,
      dayKey,
      days: sanitizeLoadMap(data.days),
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
    };
  } catch {
    return emptyDaySnapshot(dayKey);
  }
}

function readWeekSnapshot(userId: string): WeekVtcLockSnapshot {
  const weekKey = resolvePlanilhaWeekKey();
  if (typeof window === "undefined" || !userId) return emptyWeekSnapshot(weekKey);

  try {
    const raw = window.localStorage.getItem(`${WEEK_STORAGE_PREFIX}:${userId}:${weekKey}`);
    if (!raw) return emptyWeekSnapshot(weekKey);
    const data = JSON.parse(raw) as Partial<WeekVtcLockSnapshot>;
    if (data.v !== WEEK_SNAPSHOT_VERSION || data.weekKey !== weekKey) {
      return emptyWeekSnapshot(weekKey);
    }
    return {
      v: WEEK_SNAPSHOT_VERSION,
      weekKey,
      days: sanitizeLoadMap(data.days),
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
    };
  } catch {
    return emptyWeekSnapshot(weekKey);
  }
}

function writeDaySnapshot(userId: string, snapshot: DayVtcLockSnapshot): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(
      `${DAY_STORAGE_PREFIX}:${userId}:${snapshot.dayKey}`,
      JSON.stringify(snapshot),
    );
  } catch {
    // quota ou modo privado
  }
}

function writeWeekSnapshot(userId: string, snapshot: WeekVtcLockSnapshot): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(
      `${WEEK_STORAGE_PREFIX}:${userId}:${snapshot.weekKey}`,
      JSON.stringify(snapshot),
    );
  } catch {
    // quota ou modo privado
  }
}

/** Input/superação: trava só no dia civil atual (SP). */
export function isExerciseDayLocked(
  userId: string,
  trainingDay: WeekdayIndex,
  exerciseId: number,
): boolean {
  if (!userId || exerciseId <= 0) return false;
  const snapshot = readDaySnapshot(userId);
  return Boolean(snapshot.days[trainingDay]?.[String(exerciseId)]);
}

/** @deprecated Use isExerciseDayLocked */
export const isExerciseWeekLocked = isExerciseDayLocked;

/** Cargas seladas no dia civil atual — alimentam o altar da sessão. */
export function getDayLockedMaxLoadsForDay(
  userId: string,
  trainingDay: WeekdayIndex,
): Record<number, number> {
  const snapshot = readDaySnapshot(userId);
  const dayEntries = snapshot.days[trainingDay];
  if (!dayEntries) return {};

  const result: Record<number, number> = {};
  for (const [key, value] of Object.entries(dayEntries)) {
    const exerciseId = Number.parseInt(key, 10);
    if (Number.isFinite(exerciseId) && exerciseId > 0) {
      result[exerciseId] = value;
    }
  }
  return result;
}

/** @deprecated Use getDayLockedMaxLoadsForDay */
export const getWeekLockedMaxLoadsForDay = getDayLockedMaxLoadsForDay;

/**
 * Sela o exercício no dia civil (input) e marca o slot da planilha na semana (✓).
 * `metricValue` é o pico registado (kg / reps / segundos conforme o exercício).
 */
export function markExerciseDayLocked(
  userId: string,
  trainingDay: WeekdayIndex,
  exerciseId: number,
  metricValue: number,
): void {
  if (!userId || exerciseId <= 0 || metricValue <= 0) return;

  const metricKind = resolveCatalogMetricKind(exerciseId);
  const contribution = resolveAltarContribution(metricKind, metricValue);
  const nowIso = new Date().toISOString();

  const dayKey = resolveTreinoDayKey();
  const daySnapshot = readDaySnapshot(userId);
  const dayEntries = { ...(daySnapshot.days[trainingDay] ?? {}) };
  dayEntries[String(exerciseId)] = contribution;
  writeDaySnapshot(userId, {
    ...daySnapshot,
    dayKey,
    days: { ...daySnapshot.days, [trainingDay]: dayEntries },
    updatedAt: nowIso,
  });

  const weekKey = resolvePlanilhaWeekKey();
  const weekSnapshot = readWeekSnapshot(userId);
  const weekEntries = { ...(weekSnapshot.days[trainingDay] ?? {}) };
  weekEntries[String(exerciseId)] = contribution;
  writeWeekSnapshot(userId, {
    ...weekSnapshot,
    weekKey,
    days: { ...weekSnapshot.days, [trainingDay]: weekEntries },
    updatedAt: nowIso,
  });
}

/** @deprecated Use markExerciseDayLocked */
export const markExerciseWeekLocked = markExerciseDayLocked;

function isTrainingDayFullyLockedInWeek(
  userId: string,
  trainingDay: WeekdayIndex,
  exerciseIds: number[],
): boolean {
  if (!userId || exerciseIds.length === 0) return false;
  const snapshot = readWeekSnapshot(userId);
  const dayEntries = snapshot.days[trainingDay];
  if (!dayEntries) return false;
  return exerciseIds.every((id) => Boolean(dayEntries[String(id)]));
}

export function isTrainingDayFullyLocked(
  userId: string,
  trainingDay: WeekdayIndex,
  exerciseIds: number[],
): boolean {
  return isTrainingDayFullyLockedInWeek(userId, trainingDay, exerciseIds);
}

/** ✓ da planilha — dias com todos os exercícios registrados nesta semana. */
export function listFullyLockedTrainingDays(
  userId: string,
  dayExerciseIds: Partial<Record<WeekdayIndex, number[]>>,
): WeekdayIndex[] {
  const locked: WeekdayIndex[] = [];
  for (const day of [1, 2, 3, 4, 5, 6] as const) {
    const ids = dayExerciseIds[day] ?? [];
    if (ids.length > 0 && isTrainingDayFullyLockedInWeek(userId, day, ids)) {
      locked.push(day);
    }
  }
  return locked;
}
