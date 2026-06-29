"use client";

import { useEffect, useMemo, useState } from "react";
import { isFenixQaLabEnabled } from "@/components/qa/FenixAnimationTestPanel";
import type { PhaseTier } from "@/lib/dashboard-config";
import { evaluateThermalGravity, phaseTierToLayoutCode, type ThermalGravityState } from "@/lib/thermal-gravity";
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
): { state: ThermalGravityState; qaOverride: ThermalGravityQaOverride | null; qaLabEnabled: boolean } {
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
    const vtc_30d = vtc30dKg;
    const session_vtc_today = Math.max(qaOverride?.session_vtc_today ?? 0, sessionVtcToday);
    const evaluated = evaluateThermalGravity(effectiveTier, {
      vtc_month,
      vtc_30d,
      session_vtc_today,
    });

    if (qaOverride?.simulate_degraded_layout && !evaluated.restoration_active) {
      const degradedTier = Math.max(1, effectiveTier - 1) as PhaseTier;
      return {
        ...evaluated,
        effective_tier: degradedTier,
        active_phase_layout: phaseTierToLayoutCode(degradedTier),
        is_degraded: true,
      };
    }

    return evaluated;
  }, [phaseTier, qaOverride, sessionVtcToday, vtc30dKg, vtcMonthKg]);

  return { state, qaOverride, qaLabEnabled };
}
