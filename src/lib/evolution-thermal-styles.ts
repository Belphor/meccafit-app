/**
 * Estilos térmicos únicos — alinhados à aba Evolução (MIDAS · human-body-constants).
 * Fonte de verdade: CINZAS → FAISCA → BRASA → LABAREDA → FOGO CÓSMICO
 */

import {
  CALOR_LEVEL_LABELS,
  type MuscleCalorLevel,
} from "@/components/evolution/human-body-constants";
import type { PhaseLayoutCode } from "@/lib/dashboard-config";
import { phaseTierToLayoutCode } from "@/lib/thermal-gravity";

export type EvolutionThermalCardStyle = {
  level: MuscleCalorLevel;
  label: string;
  borderClass: string;
  gradientClass: string;
  chipClass: string;
  glowClass: string;
  pulseRing: string;
  selectedRing: string;
};

export const EVOLUTION_THERMAL_LEVELS = [
  "CINZAS",
  "FAISCA",
  "BRASA",
  "LABAREDA",
  "FOGO CÓSMICO",
] as const satisfies readonly MuscleCalorLevel[];

export function layoutCodeToThermalLevel(code: PhaseLayoutCode): MuscleCalorLevel {
  if (code === "FOGO_COSMICO") return "FOGO CÓSMICO";
  return code;
}

export function resolveThermalLevelFromPhaseTier(phaseTier: unknown): MuscleCalorLevel {
  return layoutCodeToThermalLevel(phaseTierToLayoutCode(phaseTier));
}

/** Degradação HERMES — gravidade térmica (saturate 30%). */
export const THERMAL_INACTIVE_FILTER =
  "saturate-[0.3] brightness-[0.88] contrast-[0.96] transition-[filter] duration-500 ease-out";

export const THERMAL_ACTIVE_FILTER =
  "saturate-100 brightness-100 contrast-100 transition-[filter] duration-500 ease-out";

const EVOLUTION_THERMAL_CARD_STYLES: Record<MuscleCalorLevel, EvolutionThermalCardStyle> = {
  CINZAS: {
    level: "CINZAS",
    label: CALOR_LEVEL_LABELS.CINZAS,
    borderClass: "border-neutral-600/35",
    gradientClass: "bg-gradient-to-br from-neutral-900/90 via-neutral-950/95 to-black",
    chipClass: "border-neutral-500/25 bg-neutral-900/70 text-neutral-400",
    glowClass: "shadow-[0_0_24px_rgba(115,115,115,0.08)]",
    pulseRing:
      "ring-1 ring-neutral-500/55 motion-safe:animate-[fenyxia-pulse_2.4s_ease-in-out_infinite]",
    selectedRing: "ring-2 ring-neutral-400/80",
  },
  FAISCA: {
    level: "FAISCA",
    label: CALOR_LEVEL_LABELS.FAISCA,
    borderClass: "border-orange-500/25",
    gradientClass: "bg-gradient-to-br from-orange-950/35 via-neutral-950/92 to-black",
    chipClass: "border-orange-500/30 bg-orange-950/35 text-orange-200/85",
    glowClass: "shadow-[0_0_26px_rgba(249,115,22,0.1)]",
    pulseRing:
      "ring-1 ring-orange-500/55 motion-safe:animate-[fenyxia-pulse_2.3s_ease-in-out_infinite]",
    selectedRing: "ring-2 ring-orange-400/80",
  },
  BRASA: {
    level: "BRASA",
    label: CALOR_LEVEL_LABELS.BRASA,
    borderClass: "border-amber-500/30",
    gradientClass: "bg-gradient-to-br from-amber-950/50 via-neutral-950/90 to-black",
    chipClass: "border-amber-500/30 bg-amber-950/40 text-amber-200/90",
    glowClass: "shadow-[0_0_28px_rgba(245,158,11,0.14)]",
    pulseRing:
      "ring-1 ring-amber-500/55 motion-safe:animate-[fenyxia-pulse_2.2s_ease-in-out_infinite]",
    selectedRing: "ring-2 ring-amber-400/85",
  },
  LABAREDA: {
    level: "LABAREDA",
    label: CALOR_LEVEL_LABELS.LABAREDA,
    borderClass: "border-red-500/35",
    gradientClass: "bg-gradient-to-br from-red-950/45 via-neutral-950/88 to-black",
    chipClass: "border-red-500/35 bg-red-950/40 text-red-200/90",
    glowClass: "shadow-[0_0_36px_rgba(220,38,38,0.18)]",
    pulseRing:
      "ring-1 ring-red-500/55 motion-safe:animate-[fenyxia-pulse_2s_ease-in-out_infinite]",
    selectedRing: "ring-2 ring-red-400/90",
  },
  "FOGO CÓSMICO": {
    level: "FOGO CÓSMICO",
    label: CALOR_LEVEL_LABELS["FOGO CÓSMICO"],
    borderClass: "border-violet-500/40",
    gradientClass: "bg-gradient-to-br from-violet-950/50 via-neutral-950/85 to-black",
    chipClass: "border-violet-400/35 bg-violet-950/45 text-violet-100",
    glowClass: "shadow-[0_0_40px_rgba(139,92,246,0.22)]",
    pulseRing:
      "ring-1 ring-violet-400/60 motion-safe:animate-[fenyxia-pulse_1.8s_ease-in-out_infinite]",
    selectedRing: "ring-2 ring-violet-300/95",
  },
};

export function resolveEvolutionThermalStyle(
  phaseTier: unknown,
): EvolutionThermalCardStyle {
  const level = resolveThermalLevelFromPhaseTier(phaseTier);
  return EVOLUTION_THERMAL_CARD_STYLES[level];
}

export function resolveEvolutionThermalStyleByLevel(
  level: MuscleCalorLevel,
): EvolutionThermalCardStyle {
  return EVOLUTION_THERMAL_CARD_STYLES[level];
}
