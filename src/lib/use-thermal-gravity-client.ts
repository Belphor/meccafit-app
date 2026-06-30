"use client";

import { useEffect, useMemo, useState } from "react";
import { isFenixQaLabEnabled } from "@/components/qa/FenixAnimationTestPanel";
import type { PhaseTier } from "@/lib/dashboard-config";
import { evaluateThermalGravity, type ThermalGravityState } from "@/lib/thermal-gravity";
import {
  readThermalGravityQaOverride,
  THERMAL_GRAVITY_QA_UPDATED_EVENT,
  type ThermalGravityQaOverride,
} from "@/lib/thermal-gravity-qa";

export function useThermalGravityClientState(
  phaseTier: PhaseTier,
  vtcMonthKg: number,
  sessionVtcToday = 0,
  vtc30dKg = 0,
): {
  state: ThermalGravityState;
  qaOverride: ThermalGravityQaOverride | null;
  qaLabEnabled: boolean;
  monthBoundaryDegraded: boolean;
  monthAtRisk: boolean;
  simulatedPhaseTier: PhaseTier | null;
} {
  const [qaOverride, setQaOverride] = useState<ThermalGravityQaOverride | null>(null);
  const [qaLabEnabled, setQaLabEnabled] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const labOn = isFenixQaLabEnabled();
      setQaLabEnabled(labOn);
      setQaOverride(labOn ? readThermalGravityQaOverride() : null);
    };
    refresh();
    window.addEventListener(THERMAL_GRAVITY_QA_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(THERMAL_GRAVITY_QA_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const state = useMemo(() => {
    const effectiveTier = qaOverride?.phase_tier ?? phaseTier;
    const vtc_month = qaOverride?.vtc_month ?? vtcMonthKg;
    const vtc_30d = qaOverride?.vtc_30d ?? vtc30dKg;
    const session_vtc_today = Math.max(qaOverride?.session_vtc_today ?? 0, sessionVtcToday);
    const evaluated = evaluateThermalGravity(effectiveTier, {
      vtc_month,
      vtc_30d,
      session_vtc_today,
    });

    let next: ThermalGravityState = evaluated;

    if (qaOverride?.days_remaining !== undefined) {
      next = {
        ...next,
        days_remaining: qaOverride.days_remaining,
      };
    }

    if (qaOverride?.settled_month_label) {
      next = {
        ...next,
        settled_month_label: qaOverride.settled_month_label,
      };
    }

    return next;
  }, [phaseTier, qaOverride, sessionVtcToday, vtc30dKg, vtcMonthKg]);

  const monthBoundaryDegraded =
    qaLabEnabled && qaOverride?.simulate_month_boundary_degraded === true;

  const monthAtRisk =
    qaLabEnabled && qaOverride?.simulate_month_at_risk === true;

  const simulatedPhaseTier: PhaseTier | null =
    monthBoundaryDegraded && qaOverride
      ? (Math.max(1, qaOverride.phase_tier - 1) as PhaseTier)
      : null;

  return {
    state,
    qaOverride,
    qaLabEnabled,
    monthBoundaryDegraded,
    monthAtRisk,
    simulatedPhaseTier,
  };
}
