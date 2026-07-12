import type { Enums } from "@/types/database.types";
import type { HistoricoTreinoRow } from "@/lib/dashboard-data";
import type { LinhagemInactivitySyncResult, ThermalGravitySettlementResult } from "@/lib/linhagem-inactivity";
import type { ClientProfile, MuralPost } from "@/lib/mock-data";
import type { TrainingTrackState } from "@/lib/training-track";
import { DEFAULT_TRAINING_TRACK } from "@/lib/training-track";

export const DASHBOARD_CACHE_TTL_MS = 90_000;
export const DASHBOARD_CACHE_PREFIX = "meccafit:dashboard:bundle:";

export type DashboardBundleCachePayload = {
  profile: ClientProfile;
  profileRow?: Record<string, unknown> | null;
  historico: HistoricoTreinoRow[];
  muralPosts: MuralPost[];
  musculo: Enums<"subgrupo_muscular">;
  trainingTrack: TrainingTrackState;
  hasPersonalBond: boolean;
  /** Persistidos para a UI não “apagar” degradação/assentamento no TTL. */
  linhagemInactivity: LinhagemInactivitySyncResult | null;
  thermalSettlement: ThermalGravitySettlementResult | null;
  fetchedAt: number;
};

type MemoryEntry = {
  expiresAt: number;
  payload: DashboardBundleCachePayload;
};

const memoryCache = new Map<string, MemoryEntry>();

function buildCacheKey(userId: string, musculo: Enums<"subgrupo_muscular">): string {
  return `${DASHBOARD_CACHE_PREFIX}${userId}:${musculo}`;
}

function readSessionStorage(key: string): DashboardBundleCachePayload | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as DashboardBundleCachePayload;
    if (!parsed?.fetchedAt || !parsed.profile) return null;
    if (!parsed.trainingTrack) {
      parsed.trainingTrack = DEFAULT_TRAINING_TRACK;
    }
    if (typeof parsed.hasPersonalBond !== "boolean") {
      parsed.hasPersonalBond = Boolean(parsed.trainingTrack.bond);
    }
    if (parsed.linhagemInactivity === undefined) {
      parsed.linhagemInactivity = null;
    }
    if (parsed.thermalSettlement === undefined) {
      parsed.thermalSettlement = null;
    }
    if (Date.now() - parsed.fetchedAt > DASHBOARD_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(key);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeSessionStorage(key: string, payload: DashboardBundleCachePayload): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // quota / modo privado
  }
}

export function readDashboardBundleCache(
  userId: string,
  musculo: Enums<"subgrupo_muscular">,
): DashboardBundleCachePayload | null {
  const key = buildCacheKey(userId, musculo);
  const memoryHit = memoryCache.get(key);
  if (memoryHit && memoryHit.expiresAt > Date.now()) {
    return memoryHit.payload;
  }

  if (memoryHit) {
    memoryCache.delete(key);
  }

  return readSessionStorage(key);
}

export function writeDashboardBundleCache(
  userId: string,
  payload: DashboardBundleCachePayload,
): void {
  const key = buildCacheKey(userId, payload.musculo);
  memoryCache.set(key, {
    expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
    payload,
  });
  writeSessionStorage(key, payload);
}

export function invalidateDashboardBundleCache(
  userId: string,
  musculo?: Enums<"subgrupo_muscular">,
): void {
  if (musculo) {
    const key = buildCacheKey(userId, musculo);
    memoryCache.delete(key);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
    return;
  }

  const prefix = `${DASHBOARD_CACHE_PREFIX}${userId}:`;
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }

  if (typeof window === "undefined") return;

  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(prefix)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // ignore
  }
}
