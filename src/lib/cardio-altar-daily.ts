/** Altar diário privado — contribuição de cardio (sem mural comunitário). */

import { resolveAppDayKey } from "@/lib/treino-day-key";

export const STORAGE_VTC_UPDATE_EVENT = "storage_vtc_update";
export const ALTAR_DAILY_CARDIO_PREFIX = "meccafit:altar-daily-cardio";

export type StorageVtcUpdateDetail = {
  userId: string;
  cardioCompletionPercent: number;
  source: "cardio_voo_cinzas";
  updatedAt: string;
};

function dailyKey(userId: string): string {
  const day = resolveAppDayKey();
  return `${ALTAR_DAILY_CARDIO_PREFIX}:${userId}:${day}`;
}

export function readAltarDailyCardioPercent(userId: string): number {
  if (typeof window === "undefined" || !userId) return 0;

  try {
    const raw = window.localStorage.getItem(dailyKey(userId));
    if (!raw) return 0;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  } catch {
    return 0;
  }
}

export function writeAltarDailyCardioPercent(userId: string, percent: number): void {
  if (typeof window === "undefined" || !userId) return;

  const safe = Math.min(100, Math.max(0, Math.round(percent)));

  try {
    window.localStorage.setItem(dailyKey(userId), String(safe));
  } catch {
    // noop
  }
}

export function dispatchStorageVtcUpdate(detail: StorageVtcUpdateDetail): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(STORAGE_VTC_UPDATE_EVENT, { detail }));
}

export function commitCardioAltarCompletion(userId: string): void {
  writeAltarDailyCardioPercent(userId, 100);
  dispatchStorageVtcUpdate({
    userId,
    cardioCompletionPercent: 100,
    source: "cardio_voo_cinzas",
    updatedAt: new Date().toISOString(),
  });
}
