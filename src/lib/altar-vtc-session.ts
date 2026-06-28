import { ALTAR_VTC_SESSION_TARGET_KG } from "@/lib/mock-data";
import { resolveTreinoDayKey } from "@/lib/treino-day-key";
import type { ClientTrainingMuscleGroup, WeekdayIndex } from "@/lib/training-week";

const STORAGE_PREFIX = "meccafit:altar-vtc";
const SNAPSHOT_VERSION = 1 as const;

export type AltarVtcSessionScope = {
  userId: string;
  /** Dia da planilha em execução (Seg=1 … Sáb=6) — uma chama por dia civil. */
  trainingDay: WeekdayIndex;
  /** Legado · migração de sessões por músculo */
  legacyMuscle?: ClientTrainingMuscleGroup | string;
  legacySubgroupId?: string;
};

export type AltarVtcSessionSnapshot = {
  v: typeof SNAPSHOT_VERSION;
  baseVtcTotal: number;
  lastSavedWeight: number;
  maxLoadsByExerciseId: Record<number, number>;
  /** PR registrado nesta sessão (kg, rep ou segundos) — uma vez por exercício. */
  registeredPrByExerciseId: Record<number, number>;
  completedSetsByExerciseId: Record<number, number>;
  targetKg: number;
  updatedAt: string;
};

function buildStorageKey(scope: AltarVtcSessionScope): string {
  const civilDay = resolveTreinoDayKey();
  return `${STORAGE_PREFIX}:${scope.userId}:dia-${scope.trainingDay}:${civilDay}`;
}

function buildLegacyMuscleStorageKey(
  userId: string,
  muscle: ClientTrainingMuscleGroup | string,
): string {
  const civilDay = resolveTreinoDayKey();
  return `${STORAGE_PREFIX}:${userId}:${muscle}:${civilDay}`;
}

function buildLegacySubgroupStorageKey(userId: string, subgroupId: string): string {
  const civilDay = resolveTreinoDayKey();
  return `${STORAGE_PREFIX}:${userId}:${subgroupId}:${civilDay}`;
}

function sanitizeMaxLoads(value: unknown): Record<number, number> {
  if (!value || typeof value !== "object") return {};

  const entries = Object.entries(value as Record<string, unknown>);
  const sanitized: Record<number, number> = {};

  for (const [key, rawWeight] of entries) {
    const exerciseId = Number.parseInt(key, 10);
    const weight = typeof rawWeight === "number" ? rawWeight : Number(rawWeight);
    if (!Number.isFinite(exerciseId) || exerciseId <= 0) continue;
    if (!Number.isFinite(weight) || weight <= 0) continue;
    sanitized[exerciseId] = weight;
  }

  return sanitized;
}

function sanitizeSnapshot(raw: unknown): AltarVtcSessionSnapshot | null {
  if (!raw || typeof raw !== "object") return null;

  const data = raw as Partial<AltarVtcSessionSnapshot>;
  if (data.v !== SNAPSHOT_VERSION) return null;

  const maxLoadsByExerciseId = sanitizeMaxLoads(data.maxLoadsByExerciseId);
  const registeredPrByExerciseId = sanitizeMaxLoads(data.registeredPrByExerciseId ?? {});
  const completedSetsByExerciseId = sanitizeMaxLoads(data.completedSetsByExerciseId ?? {});
  const baseVtcTotal =
    typeof data.baseVtcTotal === "number" && Number.isFinite(data.baseVtcTotal)
      ? Math.max(0, data.baseVtcTotal)
      : Object.values(maxLoadsByExerciseId).reduce((sum, weight) => sum + weight, 0);

  const lastSavedWeight =
    typeof data.lastSavedWeight === "number" && Number.isFinite(data.lastSavedWeight)
      ? Math.max(0, data.lastSavedWeight)
      : 0;

  return {
    v: SNAPSHOT_VERSION,
    baseVtcTotal,
    lastSavedWeight,
    maxLoadsByExerciseId,
    registeredPrByExerciseId,
    completedSetsByExerciseId,
    targetKg: ALTAR_VTC_SESSION_TARGET_KG,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
  };
}

function readRawSnapshot(key: string): AltarVtcSessionSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return sanitizeSnapshot(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function readAltarVtcSession(scope: AltarVtcSessionScope): AltarVtcSessionSnapshot | null {
  if (typeof window === "undefined") return null;
  if (!scope.userId || !scope.trainingDay) return null;

  const primary = readRawSnapshot(buildStorageKey(scope));
  if (primary) return primary;

  if (scope.legacyMuscle) {
    const legacyMuscle = readRawSnapshot(
      buildLegacyMuscleStorageKey(scope.userId, scope.legacyMuscle),
    );
    if (legacyMuscle) {
      writeAltarVtcSession(scope, legacyMuscle);
      return legacyMuscle;
    }
  }

  if (!scope.legacySubgroupId) return null;

  const legacySubgroup = readRawSnapshot(
    buildLegacySubgroupStorageKey(scope.userId, scope.legacySubgroupId),
  );
  if (!legacySubgroup) return null;

  writeAltarVtcSession(scope, legacySubgroup);
  return legacySubgroup;
}

export function writeAltarVtcSession(
  scope: AltarVtcSessionScope,
  payload: Pick<
    AltarVtcSessionSnapshot,
    | "baseVtcTotal"
    | "lastSavedWeight"
    | "maxLoadsByExerciseId"
    | "registeredPrByExerciseId"
    | "completedSetsByExerciseId"
  >,
): void {
  if (typeof window === "undefined") return;
  if (!scope.userId || !scope.trainingDay) return;

  const snapshot: AltarVtcSessionSnapshot = {
    v: SNAPSHOT_VERSION,
    baseVtcTotal: Math.max(0, payload.baseVtcTotal),
    lastSavedWeight: Math.max(0, payload.lastSavedWeight),
    maxLoadsByExerciseId: sanitizeMaxLoads(payload.maxLoadsByExerciseId),
    registeredPrByExerciseId: sanitizeMaxLoads(payload.registeredPrByExerciseId),
    completedSetsByExerciseId: sanitizeMaxLoads(payload.completedSetsByExerciseId),
    targetKg: ALTAR_VTC_SESSION_TARGET_KG,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(buildStorageKey(scope), JSON.stringify(snapshot));
  } catch {
    // Falha silenciosa — LocalStorage indisponível ou quota excedida.
  }
}

export function clearAltarVtcSession(scope: AltarVtcSessionScope): void {
  if (typeof window === "undefined") return;
  if (!scope.userId || !scope.trainingDay) return;

  try {
    window.localStorage.removeItem(buildStorageKey(scope));
  } catch {
    // noop
  }
}
