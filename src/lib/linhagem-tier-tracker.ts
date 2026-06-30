import type { PhaseTier } from "@/lib/dashboard-config";
import { EVOLUTION_LINHAGEM_TIER_STORAGE_PREFIX } from "@/lib/dashboard-config";

const SESSION_TIER_PREFIX = "meccafit:linhagem-tier-session:";

export function readAcknowledgedLinhagemTier(userId: string): PhaseTier | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${EVOLUTION_LINHAGEM_TIER_STORAGE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return null;
    return Math.min(5, Math.max(1, Math.round(parsed))) as PhaseTier;
  } catch {
    return null;
  }
}

export function writeAcknowledgedLinhagemTier(userId: string, tier: PhaseTier): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${EVOLUTION_LINHAGEM_TIER_STORAGE_PREFIX}${userId}`, String(tier));
  } catch {
    // quota / private mode
  }
}

function readSessionLinhagemTier(userId: string): PhaseTier | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`${SESSION_TIER_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return null;
    return Math.min(5, Math.max(1, Math.round(parsed))) as PhaseTier;
  } catch {
    return null;
  }
}

function writeSessionLinhagemTier(userId: string, tier: PhaseTier): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${SESSION_TIER_PREFIX}${userId}`, String(tier));
  } catch {
    // quota / private mode
  }
}

export type LinhagemTierTransition = "none" | "sync" | "celebrate";

/** Só celebra quando a fase sobe além do último nível já reconhecido (dados estáveis). */
export function evaluateLinhagemTierTransition(
  userId: string,
  tier: PhaseTier,
  dataReady: boolean,
): LinhagemTierTransition {
  if (!dataReady) return "none";

  const acknowledged = readAcknowledgedLinhagemTier(userId);
  const sessionTier = readSessionLinhagemTier(userId);

  if (sessionTier === null) {
    writeSessionLinhagemTier(userId, tier);
    if (acknowledged === null) {
      writeAcknowledgedLinhagemTier(userId, tier);
      return "none";
    }
    if (tier > acknowledged) {
      return "celebrate";
    }
    if (tier < acknowledged) {
      writeAcknowledgedLinhagemTier(userId, tier);
    }
    return "none";
  }

  if (tier > sessionTier) {
    writeSessionLinhagemTier(userId, tier);
    const baseline = acknowledged ?? sessionTier;
    if (tier > baseline) {
      return "celebrate";
    }
    return "none";
  }

  if (tier < sessionTier) {
    writeSessionLinhagemTier(userId, tier);
    writeAcknowledgedLinhagemTier(userId, tier);
    return "sync";
  }

  return "none";
}

/** Sincroniza tier após rebaixamento para bloquear transmutação indevida. */
export function syncLinhagemTierAfterDemotion(userId: string, tier: PhaseTier): void {
  writeSessionLinhagemTier(userId, tier);
  writeAcknowledgedLinhagemTier(userId, tier);
}

/** Transmutação só quando a fase sobe além do baseline já reconhecido na sessão. */
export function canShowLinhagemTransmutation(userId: string, tier: PhaseTier): boolean {
  const acknowledged = readAcknowledgedLinhagemTier(userId);
  const sessionTier = readSessionLinhagemTier(userId);
  const baseline = Math.max(acknowledged ?? 0, sessionTier ?? 0);
  return tier > baseline;
}
