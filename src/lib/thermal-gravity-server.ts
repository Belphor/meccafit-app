import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  evaluateThermalGravity,
  thermalGravityToProfileFields,
  type ThermalGravityState,
} from "@/lib/thermal-gravity";

export type ThermalGravityMetricsRow = {
  vtc_month: number;
  vtc_30d: number;
  session_vtc_today: number;
  available: boolean;
};

export async function fetchThermalGravityMetrics(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ThermalGravityMetricsRow> {
  const [vtcMonthResult, vtc30dResult, sessionResult] = await Promise.all([
    supabase.rpc("argos_compute_vtc_month_sp", { p_user_id: userId }),
    supabase.rpc("argos_compute_vtc_30d", { p_user_id: userId }),
    supabase.rpc("argos_compute_session_vtc_today", { p_user_id: userId }),
  ]);

  if (vtcMonthResult.error || vtc30dResult.error || sessionResult.error) {
    return { vtc_month: 0, vtc_30d: 0, session_vtc_today: 0, available: false };
  }

  return {
    vtc_month: Number(vtcMonthResult.data ?? 0),
    vtc_30d: Number(vtc30dResult.data ?? 0),
    session_vtc_today: Number(sessionResult.data ?? 0),
    available: true,
  };
}

export function buildThermalGravityState(
  phaseTier: unknown,
  metrics: ThermalGravityMetricsRow,
): ThermalGravityState | null {
  if (!metrics.available) return null;
  return evaluateThermalGravity(phaseTier, metrics);
}

export function enrichProfileRowWithThermalGravity(
  profileRow: Record<string, unknown>,
  metrics: ThermalGravityMetricsRow,
): Record<string, unknown> {
  const state = buildThermalGravityState(profileRow.phase_tier, metrics);
  if (!state) {
    return { ...profileRow };
  }
  return {
    ...profileRow,
    ...thermalGravityToProfileFields(state),
  };
}
