import type { ForumCardPhase, ForumThermalPhase } from "@/features/forum-brasa-viva/types";

export const FORUM_THERMAL_PHASES = [
  "CINZA",
  "BRASA",
  "LABAREDA",
  "MAGMA",
] as const satisfies readonly ForumThermalPhase[];

export const FORUM_PHASE_BADGE_SIZE_PX = 48;

/** Placeholder blur neutro (1×1) — evita CLS enquanto o badge carrega. */
const NEUTRAL_BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export const FORUM_PHASE_BLUR_DATA_URL: Record<ForumCardPhase, string> = {
  cinza: NEUTRAL_BLUR_DATA_URL,
  brasa: NEUTRAL_BLUR_DATA_URL,
  labareda: NEUTRAL_BLUR_DATA_URL,
  magma: NEUTRAL_BLUR_DATA_URL,
};

export function resolveForumPhaseAssetPath(phase: ForumCardPhase): string {
  return `/assets/forum/${phase.toLowerCase()}.png`;
}

export function toForumThermalPhase(phase: ForumCardPhase): ForumThermalPhase {
  return phase.toUpperCase() as ForumThermalPhase;
}
