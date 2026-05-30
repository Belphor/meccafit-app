import type { ForumCardPhase } from "@/features/forum-brasa-viva/types";
import {
  FORUM_PHASE_CARD_STYLES,
  resolveForumCardPhase,
} from "@/features/forum-brasa-viva/forum-phase-styles";

export { resolveForumCardPhase };

export type ForjaThermalPhase = ForumCardPhase;

/** Borda pulsante IRIS por fase térmica (Cinza · Brasa · Labareda · Magma). */
export const FORJA_THERMAL_PULSE_RING: Record<ForjaThermalPhase, string> = {
  cinza:
    "ring-1 ring-neutral-500/55 motion-safe:animate-[fenyxia-pulse_2.4s_ease-in-out_infinite]",
  brasa:
    "ring-1 ring-amber-500/55 motion-safe:animate-[fenyxia-pulse_2.2s_ease-in-out_infinite]",
  labareda:
    "ring-1 ring-orange-500/60 motion-safe:animate-[fenyxia-pulse_2s_ease-in-out_infinite]",
  magma:
    "ring-1 ring-amber-300/65 motion-safe:animate-[fenyxia-pulse_1.8s_ease-in-out_infinite]",
};

export const FORJA_THERMAL_SELECTED_RING: Record<ForjaThermalPhase, string> = {
  cinza: "ring-2 ring-neutral-400/80",
  brasa: "ring-2 ring-amber-400/85",
  labareda: "ring-2 ring-orange-400/90",
  magma: "ring-2 ring-amber-200/95",
};

export function resolveForjaThermalStyle(phaseTier: number) {
  const phase = resolveForumCardPhase(phaseTier);
  return {
    phase,
    ...FORUM_PHASE_CARD_STYLES[phase],
    pulseRing: FORJA_THERMAL_PULSE_RING[phase],
    selectedRing: FORJA_THERMAL_SELECTED_RING[phase],
  };
}
