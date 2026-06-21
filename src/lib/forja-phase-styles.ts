import type { MuscleCalorLevel } from "@/components/evolution/human-body-constants";
import {
  resolveEvolutionThermalStyle,
  resolveEvolutionThermalStyleByLevel,
  type EvolutionThermalCardStyle,
} from "@/lib/evolution-thermal-styles";

export {
  resolveEvolutionThermalStyle as resolveForjaThermalStyle,
  resolveThermalLevelFromPhaseTier,
  type EvolutionThermalCardStyle,
} from "@/lib/evolution-thermal-styles";

/** Anel estático para cards da Forja — sem animação pulse. */
export function resolveForjaAthleteCardRing(
  phaseTier: unknown,
  isSelected: boolean,
): string {
  const thermal = resolveEvolutionThermalStyle(phaseTier);
  if (isSelected) {
    return `${thermal.selectedRing} border-zinc-700/80`;
  }
  return "ring-1 ring-zinc-800/90 border-zinc-800/80";
}

export function resolveForjaChipClass(phaseTier: unknown): string {
  return resolveEvolutionThermalStyle(phaseTier).chipClass;
}

export function resolveForjaThermalStyleByLevel(level: MuscleCalorLevel): EvolutionThermalCardStyle {
  return resolveEvolutionThermalStyleByLevel(level);
}
