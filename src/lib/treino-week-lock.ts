/**
 * Trava semanal de VTC — uma carga máxima por exercício/dia da planilha até a próxima semana.
 */

import { resolveAltarContribution } from "@/lib/training-metric";
import { resolveCatalogMetricKind } from "@/lib/exercise-catalog";
import { resolveTreinoDayKey, APP_DAY_TIMEZONE } from "@/lib/treino-day-key";
import type { WeekdayIndex } from "@/lib/training-week";

const STORAGE_PREFIX = "meccafit:treino-week-vtc";
const SNAPSHOT_VERSION = 1 as const;

type WeekVtcLockSnapshot = {
  v: typeof SNAPSHOT_VERSION;
  weekKey: string;
  days: Partial<Record<WeekdayIndex, Record<string, number>>>;
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

function buildStorageKey(userId: string, weekKey: string): string {
  return `${STORAGE_PREFIX}:${userId}:${weekKey}`;
}

function sanitizeSnapshot(raw: unknown, weekKey: string): WeekVtcLockSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<WeekVtcLockSnapshot>;
  if (data.v !== SNAPSHOT_VERSION) return null;

  const days: Partial<Record<WeekdayIndex, Record<string, number>>> = {};
  const source = data.days;
  if (source && typeof source === "object") {
    for (const [dayKey, entries] of Object.entries(source)) {
      const day = Number(dayKey) as WeekdayIndex;
      if (day < 1 || day > 6 || !entries || typeof entries !== "object") continue;
      const sanitized: Record<string, number> = {};
      for (const [exerciseKey, value] of Object.entries(entries)) {
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
  }

  return {
    v: SNAPSHOT_VERSION,
    weekKey,
    days,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
  };
}

function readSnapshot(userId: string): WeekVtcLockSnapshot {
  const weekKey = resolvePlanilhaWeekKey();
  if (typeof window === "undefined" || !userId) {
    return { v: SNAPSHOT_VERSION, weekKey, days: {}, updatedAt: new Date().toISOString() };
  }

  try {
    const raw = window.localStorage.getItem(buildStorageKey(userId, weekKey));
    if (!raw) {
      return { v: SNAPSHOT_VERSION, weekKey, days: {}, updatedAt: new Date().toISOString() };
    }
    return (
      sanitizeSnapshot(JSON.parse(raw) as unknown, weekKey) ?? {
        v: SNAPSHOT_VERSION,
        weekKey,
        days: {},
        updatedAt: new Date().toISOString(),
      }
    );
  } catch {
    return { v: SNAPSHOT_VERSION, weekKey, days: {}, updatedAt: new Date().toISOString() };
  }
}

function writeSnapshot(userId: string, snapshot: WeekVtcLockSnapshot): void {
  if (typeof window === "undefined" || !userId) return;

  try {
    window.localStorage.setItem(
      buildStorageKey(userId, snapshot.weekKey),
      JSON.stringify(snapshot),
    );
  } catch {
    // quota ou modo privado
  }
}

export function isExerciseWeekLocked(
  userId: string,
  trainingDay: WeekdayIndex,
  exerciseId: number,
): boolean {
  if (!userId || exerciseId <= 0) return false;
  const snapshot = readSnapshot(userId);
  const dayEntries = snapshot.days[trainingDay];
  return Boolean(dayEntries?.[String(exerciseId)]);
}

export function getWeekLockedMaxLoadsForDay(
  userId: string,
  trainingDay: WeekdayIndex,
): Record<number, number> {
  const snapshot = readSnapshot(userId);
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

export function markExerciseWeekLocked(
  userId: string,
  trainingDay: WeekdayIndex,
  exerciseId: number,
  maxLoadKg: number,
): void {
  if (!userId || exerciseId <= 0 || maxLoadKg <= 0) return;

  const weekKey = resolvePlanilhaWeekKey();
  const snapshot = readSnapshot(userId);
  const metricKind = resolveCatalogMetricKind(exerciseId);
  const contribution = resolveAltarContribution(metricKind, maxLoadKg);
  const dayEntries = { ...(snapshot.days[trainingDay] ?? {}) };
  dayEntries[String(exerciseId)] = contribution;

  writeSnapshot(userId, {
    ...snapshot,
    weekKey,
    days: { ...snapshot.days, [trainingDay]: dayEntries },
    updatedAt: new Date().toISOString(),
  });
}

export function isTrainingDayFullyLocked(
  userId: string,
  trainingDay: WeekdayIndex,
  exerciseIds: number[],
): boolean {
  if (!userId || exerciseIds.length === 0) return false;
  return exerciseIds.every((id) => isExerciseWeekLocked(userId, trainingDay, id));
}

export function listFullyLockedTrainingDays(
  userId: string,
  dayExerciseIds: Partial<Record<WeekdayIndex, number[]>>,
): WeekdayIndex[] {
  const locked: WeekdayIndex[] = [];
  for (const day of [1, 2, 3, 4, 5, 6] as const) {
    const ids = dayExerciseIds[day] ?? [];
    if (ids.length > 0 && isTrainingDayFullyLocked(userId, day, ids)) {
      locked.push(day);
    }
  }
  return locked;
}
