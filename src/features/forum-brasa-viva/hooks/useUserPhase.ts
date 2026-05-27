"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolvePhaseTier } from "@/lib/custom-preferences";
import { PHASE_TIER_LABELS, type PhaseTier } from "@/lib/dashboard-config";
import { emitChronosEvent } from "@/lib/chronos-telemetry";
import { supabase } from "@/lib/supabase";
import {
  evaluateThermalGravity,
  parseThermalGravityState,
  type ThermalGravityState,
} from "@/lib/thermal-gravity";

const PROFILE_PHASE_COLUMNS =
  "phase_tier, phase_setup_at, custom_preferences, phase_progress" as const;

export type UserPhaseSnapshot = {
  phaseTier: PhaseTier;
  phaseLabel: string;
  phaseReachedLayout: string;
  activePhaseLayout: string;
  isDegraded: boolean;
  isInactive: boolean;
  restorationActive: boolean;
  vtc30d: number;
  sessionVtcToday: number;
  thermalGravity: ThermalGravityState | null;
};

export type UseUserPhaseOptions = {
  userId: string;
  profileRow: Record<string, unknown> | null | undefined;
  liveSessionVtcKg?: number;
  enableRemoteSync?: boolean;
};

export type UseUserPhaseResult = UserPhaseSnapshot & {
  isHydrated: boolean;
  refresh: () => Promise<void>;
};

function buildSnapshot(
  profileRow: Record<string, unknown> | null | undefined,
  liveSessionVtcKg: number,
): UserPhaseSnapshot {
  const phaseTier = resolvePhaseTier(profileRow?.phase_tier);
  const serverThermal = parseThermalGravityState(profileRow?.thermal_gravity);
  const session_vtc_today = Math.max(serverThermal?.session_vtc_today ?? 0, liveSessionVtcKg);

  const thermalGravity =
    profileRow == null
      ? null
      : evaluateThermalGravity(phaseTier, {
          vtc_30d: serverThermal?.vtc_30d ?? 0,
          session_vtc_today,
        });

  const isDegraded = thermalGravity?.is_degraded === true;
  const restorationActive = thermalGravity?.restoration_active === true;

  return {
    phaseTier,
    phaseLabel: PHASE_TIER_LABELS[phaseTier],
    phaseReachedLayout: thermalGravity?.phase_reached ?? "CINZAS",
    activePhaseLayout: thermalGravity?.active_phase_layout ?? "CINZAS",
    isDegraded,
    isInactive: isDegraded && !restorationActive,
    restorationActive,
    vtc30d: thermalGravity?.vtc_30d ?? 0,
    sessionVtcToday: session_vtc_today,
    thermalGravity,
  };
}

export function useUserPhase({
  userId,
  profileRow,
  liveSessionVtcKg = 0,
  enableRemoteSync = true,
}: UseUserPhaseOptions): UseUserPhaseResult {
  const [isHydrated, setIsHydrated] = useState(false);
  const [remoteProfileRow, setRemoteProfileRow] = useState<Record<string, unknown> | null>(null);
  const layoutRef = useRef<string | null>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const mergedProfileRow = useMemo(() => {
    if (!remoteProfileRow) return profileRow ?? null;
    return { ...(profileRow ?? {}), ...remoteProfileRow };
  }, [profileRow, remoteProfileRow]);

  const snapshot = useMemo(
    () => buildSnapshot(mergedProfileRow, liveSessionVtcKg),
    [mergedProfileRow, liveSessionVtcKg],
  );

  const refresh = useCallback(async () => {
    if (!enableRemoteSync || !userId) return;

    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_PHASE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return;

    setRemoteProfileRow(data as Record<string, unknown>);
  }, [enableRemoteSync, userId]);

  useEffect(() => {
    if (!isHydrated || !enableRemoteSync) return;
    void refresh();
  }, [enableRemoteSync, isHydrated, refresh]);

  useEffect(() => {
    if (!isHydrated) return;

    const currentLayout = snapshot.activePhaseLayout;
    const previousLayout = layoutRef.current;

    if (previousLayout !== null && previousLayout !== currentLayout) {
      emitChronosEvent({
        type: "phase_layout_change",
        at: new Date().toISOString(),
        userId,
        fromLayout: previousLayout,
        toLayout: currentLayout,
        phaseTier: snapshot.phaseTier,
        isDegraded: snapshot.isDegraded,
      });
    }

    layoutRef.current = currentLayout;
  }, [
    isHydrated,
    snapshot.activePhaseLayout,
    snapshot.isDegraded,
    snapshot.phaseTier,
    userId,
  ]);

  return {
    ...snapshot,
    isHydrated,
    refresh,
  };
}
