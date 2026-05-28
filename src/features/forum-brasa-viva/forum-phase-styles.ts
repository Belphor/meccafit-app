import type { PhaseTier } from "@/lib/dashboard-config";
import type { ForumCardPhase } from "@/features/forum-brasa-viva/types";

export type ForumPhaseCardStyle = {
  label: string;
  borderClass: string;
  gradientClass: string;
  chipClass: string;
  glowClass: string;
};

export const FORUM_PHASE_CARD_STYLES: Record<ForumCardPhase, ForumPhaseCardStyle> = {
  cinza: {
    label: "Cinza",
    borderClass: "border-neutral-600/35",
    gradientClass:
      "bg-gradient-to-br from-neutral-900/90 via-neutral-950/95 to-black",
    chipClass: "border-neutral-500/25 bg-neutral-900/70 text-neutral-400",
    glowClass: "shadow-[0_0_24px_rgba(115,115,115,0.08)]",
  },
  faisca: {
    label: "Faísca",
    borderClass: "border-amber-500/30",
    gradientClass:
      "bg-gradient-to-br from-amber-950/50 via-neutral-950/90 to-black",
    chipClass: "border-amber-500/30 bg-amber-950/40 text-amber-200/90",
    glowClass: "shadow-[0_0_28px_rgba(245,158,11,0.14)]",
  },
  labareda: {
    label: "Labareda",
    borderClass: "border-orange-500/40",
    gradientClass:
      "bg-gradient-to-br from-orange-950/55 via-neutral-950/88 to-black",
    chipClass: "border-orange-500/35 bg-orange-950/45 text-orange-200",
    glowClass: "shadow-[0_0_36px_rgba(249,115,22,0.22)]",
  },
  magma: {
    label: "Magma",
    borderClass: "border-amber-400/45",
    gradientClass:
      "bg-gradient-to-br from-[#1a1208]/90 via-[#2a0f00]/80 to-black",
    chipClass:
      "border-amber-300/40 bg-gradient-to-r from-orange-950/60 to-amber-950/50 text-amber-100",
    glowClass: "shadow-[0_0_44px_rgba(255,184,0,0.28)]",
  },
};

/** IRIS — mapeia tier ARGOS (1–5) para 4 skins de card. Brasa (3) usa Faísca intensa. */
export function resolveForumCardPhase(tier: number): ForumCardPhase {
  const normalized = Math.min(5, Math.max(1, Math.floor(tier))) as PhaseTier;
  if (normalized >= 5) return "magma";
  if (normalized >= 4) return "labareda";
  if (normalized >= 2) return "faisca";
  return "cinza";
}

/** HERMES — classe de degradação só após hidratação (30% saturação = 70% perda). */
export const FORUM_PHASE_INACTIVE_FILTER =
  "saturate-[0.3] brightness-[0.88] contrast-[0.96] transition-[filter] duration-500 ease-out";

export const FORUM_PHASE_ACTIVE_FILTER =
  "saturate-100 brightness-100 contrast-100 transition-[filter] duration-500 ease-out";
