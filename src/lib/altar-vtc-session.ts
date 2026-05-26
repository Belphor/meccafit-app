import { ALTAR_VTC_SESSION_TARGET_KG } from "@/lib/mock-data";

const STORAGE_PREFIX = "meccafit:altar-vtc";
const SNAPSHOT_VERSION = 1 as const;

export type AltarVtcSessionScope = {
  userId: string;
  subgroupId: string;
};

export type AltarVtcSessionSnapshot = {
  v: typeof SNAPSHOT_VERSION;
  baseVtcTotal: number;
  lastSavedWeight: number;
  maxLoadsByExerciseId: Record<number, number>;
  completedSetsByExerciseId: Record<number, number>;
  targetKg: number;
  updatedAt: string;
};

function buildStorageKey(scope: AltarVtcSessionScope): string {
  return `${STORAGE_PREFIX}:${scope.userId}:${scope.subgroupId}`;
}

function sanitizeMaxLoads(
  value: unknown,
): Record<number, number> {
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
    completedSetsByExerciseId,
    targetKg: ALTAR_VTC_SESSION_TARGET_KG,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
  };
}

export function readAltarVtcSession(
  scope: AltarVtcSessionScope,
): AltarVtcSessionSnapshot | null {
  if (typeof window === "undefined") return null;
  if (!scope.userId || !scope.subgroupId) return null;

  try {
    const raw = window.localStorage.getItem(buildStorageKey(scope));
    if (!raw) return null;
    return sanitizeSnapshot(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeAltarVtcSession(
  scope: AltarVtcSessionScope,
  payload: Pick<
    AltarVtcSessionSnapshot,
    "baseVtcTotal" | "lastSavedWeight" | "maxLoadsByExerciseId" | "completedSetsByExerciseId"
  >,
): void {
  if (typeof window === "undefined") return;
  if (!scope.userId || !scope.subgroupId) return;

  const snapshot: AltarVtcSessionSnapshot = {
    v: SNAPSHOT_VERSION,
    baseVtcTotal: Math.max(0, payload.baseVtcTotal),
    lastSavedWeight: Math.max(0, payload.lastSavedWeight),
    maxLoadsByExerciseId: sanitizeMaxLoads(payload.maxLoadsByExerciseId),
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
  if (!scope.userId || !scope.subgroupId) return;

  try {
    window.localStorage.removeItem(buildStorageKey(scope));
  } catch {
    // noop
  }
}
