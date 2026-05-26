import {
  PHASE_2_MAINTENANCE_VTC_30D,
  PHASE_3_MAINTENANCE_VTC_30D,
  PHASE_LAYOUT_RESTORATION_SESSION_KG,
  type PhaseLayoutCode,
  type PhaseTier,
} from "@/lib/dashboard-config";
import { resolvePhaseTier } from "@/lib/custom-preferences";

export type ThermalGravityMetrics = {
  vtc_30d: number;
  session_vtc_today: number;
};

export type ThermalGravityState = {
  phase_reached: PhaseLayoutCode;
  active_phase_layout: PhaseLayoutCode;
  vtc_30d: number;
  session_vtc_today: number;
  maintenance_required_kg: number | null;
  is_degraded: boolean;
  restoration_active: boolean;
  restoration_session_baseline_kg: number | null;
};

const PHASE_TIER_TO_LAYOUT: Record<PhaseTier, PhaseLayoutCode> = {
  1: "CINZAS",
  2: "FAISCA",
  3: "BRASA",
  4: "LABAREDA",
  5: "FOGO_COSMICO",
};

export function phaseTierToLayoutCode(tier: unknown): PhaseLayoutCode {
  return PHASE_TIER_TO_LAYOUT[resolvePhaseTier(tier)];
}

function sanitizeKg(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100) / 100;
}

function maintenanceThresholdForPhase(phaseReached: PhaseLayoutCode): number | null {
  if (phaseReached === "FAISCA") return PHASE_2_MAINTENANCE_VTC_30D;
  if (phaseReached === "LABAREDA") return PHASE_3_MAINTENANCE_VTC_30D;
  return null;
}

function degradedLayoutForPhase(phaseReached: PhaseLayoutCode): PhaseLayoutCode | null {
  if (phaseReached === "LABAREDA") return "FAISCA";
  if (phaseReached === "FAISCA") return "CINZAS";
  return null;
}

function restorationBaselineForPhase(phaseReached: PhaseLayoutCode): number | null {
  const baseline = PHASE_LAYOUT_RESTORATION_SESSION_KG[phaseReached];
  return baseline > 0 ? baseline : null;
}

/** IRIS/GROWTH — evaluates layout override without mutating cumulative VTC. */
export function evaluateThermalGravity(
  phaseTier: unknown,
  metrics: ThermalGravityMetrics,
): ThermalGravityState {
  const phase_reached = phaseTierToLayoutCode(phaseTier);
  const vtc_30d = sanitizeKg(metrics.vtc_30d);
  const session_vtc_today = sanitizeKg(metrics.session_vtc_today);
  const maintenance_required_kg = maintenanceThresholdForPhase(phase_reached);
  const restoration_session_baseline_kg = restorationBaselineForPhase(phase_reached);

  const degradedTarget = degradedLayoutForPhase(phase_reached);
  let active_phase_layout = phase_reached;
  let is_degraded = false;

  if (degradedTarget !== null && maintenance_required_kg !== null && vtc_30d < maintenance_required_kg) {
    active_phase_layout = degradedTarget;
    is_degraded = true;
  }

  const restoration_active =
    is_degraded &&
    restoration_session_baseline_kg !== null &&
    session_vtc_today >= restoration_session_baseline_kg;

  if (restoration_active) {
    active_phase_layout = phase_reached;
  }

  return {
    phase_reached,
    active_phase_layout,
    vtc_30d,
    session_vtc_today,
    maintenance_required_kg,
    is_degraded,
    restoration_active,
    restoration_session_baseline_kg,
  };
}

export function parseThermalGravityState(raw: unknown): ThermalGravityState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;

  const phase_reached = row.phase_reached;
  const active_phase_layout = row.active_phase_layout;
  if (typeof phase_reached !== "string" || typeof active_phase_layout !== "string") return null;

  return {
    phase_reached: phase_reached as PhaseLayoutCode,
    active_phase_layout: active_phase_layout as PhaseLayoutCode,
    vtc_30d: sanitizeKg(row.vtc_30d),
    session_vtc_today: sanitizeKg(row.session_vtc_today),
    maintenance_required_kg:
      row.maintenance_required_kg === null
        ? null
        : sanitizeKg(row.maintenance_required_kg),
    is_degraded: row.is_degraded === true,
    restoration_active: row.restoration_active === true,
    restoration_session_baseline_kg:
      row.restoration_session_baseline_kg === null
        ? null
        : sanitizeKg(row.restoration_session_baseline_kg),
  };
}

export function thermalGravityToProfileFields(state: ThermalGravityState): Record<string, unknown> {
  return {
    phase_reached: state.phase_reached,
    active_phase_layout: state.active_phase_layout,
    thermal_gravity: state,
  };
}
