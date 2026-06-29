import type { PhaseTier } from "@/lib/dashboard-config";
import { PHASE_TIER_LABELS } from "@/lib/dashboard-config";
import { evaluateThermalGravity } from "@/lib/thermal-gravity";
import { buildLinhagemRegressionTitle } from "@/lib/linhagem-inactivity";

export const THERMAL_GRAVITY_QA_STORAGE_KEY = "meccafit:qa-thermal-gravity";
export const THERMAL_GRAVITY_QA_UPDATED_EVENT = "meccafit:qa-thermal-gravity-updated";

/** @deprecated Simulação legada — regressão real é por inatividade de 30 dias. */
export type ThermalGravityQaOverride = {
  phase_tier: PhaseTier;
  vtc_month: number;
  session_vtc_today: number;
  simulate_degraded_layout?: boolean;
};

export function readThermalGravityQaOverride(): ThermalGravityQaOverride | null {
  return null;
}

export function writeThermalGravityQaOverride(_override: ThermalGravityQaOverride | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(THERMAL_GRAVITY_QA_STORAGE_KEY);
  } catch {
    // quota / private mode
  }
  window.dispatchEvent(new CustomEvent(THERMAL_GRAVITY_QA_UPDATED_EVENT));
}

export function describeThermalGravityQaState(override: ThermalGravityQaOverride): string {
  const state = evaluateThermalGravity(override.phase_tier, {
    vtc_month: override.vtc_month,
    session_vtc_today: override.session_vtc_today,
  });
  const vtc = override.vtc_month.toLocaleString("pt-BR");
  return `Layout ${state.phase_reached} · ${vtc} kg no mês · ${buildLinhagemRegressionTitle(1)} só por inatividade.`;
}
