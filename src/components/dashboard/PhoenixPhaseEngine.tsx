"use client";

/**
 * Motor visual de fases Fênix.
 * Transmutação da linhagem fica em LinhagemTransmutationHost.
 */

import {
  memo,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  PHASE_ONE_MIN_SESSIONS,
  PHASE_ONE_MIN_VTC_KG,
  PHASE_TIER_LABELS,
  type PhaseLayoutCode,
  type PhaseTier,
} from "@/lib/dashboard-config";
import {
  cosmeticPreferencesToCssVars,
  parsePhaseOneProgress,
  parseVerifiedCustomPreferences,
  resolvePhaseTier,
  type BundlePhasePayload,
  type PhaseOneProgress,
  type VerifiedCustomPreferences,
} from "@/lib/custom-preferences";
import {
  evaluateThermalGravity,
  parseThermalGravityState,
  type ThermalGravityState,
} from "@/lib/thermal-gravity";

export type PhoenixPhaseEngineProps = {
  userId: string;
  profileRow: Record<string, unknown> | null | undefined;
  liveSessionVtcKg?: number;
  children: (ctx: PhoenixPhaseRuntimeContext) => ReactNode;
};

export type PhoenixPhaseRuntimeContext = {
  phaseTier: PhaseTier;
  phaseLabel: string;
  phaseOneProgress: PhaseOneProgress | null;
  cosmeticPreferences: VerifiedCustomPreferences;
  phaseOneComplete: boolean;
  thermalGravity: ThermalGravityState | null;
  activePhaseLayout: PhaseLayoutCode | null;
  isThermallyDegraded: boolean;
  isThermalRestorationActive: boolean;
  /** @deprecated Regressão por inatividade — fórum não bloqueia mais por VTC. */
  isForumInactive: boolean;
  vtcMonth: number;
  sessionVtcToday: number;
  isHydrated: boolean;
};

function extractPhasePayload(profileRow: Record<string, unknown> | null | undefined): BundlePhasePayload {
  const phaseTier = resolvePhaseTier(profileRow?.phase_tier);
  const custom_preferences = parseVerifiedCustomPreferences(profileRow?.custom_preferences);
  const phase_progress = parsePhaseOneProgress(profileRow?.phase_progress);
  const phase_setup_at =
    typeof profileRow?.phase_setup_at === "string" ? profileRow.phase_setup_at : undefined;

  return { phase_tier: phaseTier, phase_setup_at, phase_progress, custom_preferences };
}

export const PhoenixPhaseEngine = memo(function PhoenixPhaseEngine({
  profileRow,
  liveSessionVtcKg = 0,
  children,
}: PhoenixPhaseEngineProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const payload = useMemo(() => extractPhasePayload(profileRow), [profileRow]);
  const cssVars = useMemo(
    () => cosmeticPreferencesToCssVars(payload.custom_preferences),
    [payload.custom_preferences],
  );

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const hasPhaseSignal = profileRow != null;

  const serverThermal = useMemo(
    () => parseThermalGravityState(profileRow?.thermal_gravity),
    [profileRow?.thermal_gravity],
  );

  const thermalGravity = useMemo<ThermalGravityState | null>(() => {
    if (!hasPhaseSignal) return null;

    const session_vtc_today = Math.max(
      serverThermal?.session_vtc_today ?? 0,
      Math.max(0, liveSessionVtcKg),
    );
    return evaluateThermalGravity(payload.phase_tier, {
      vtc_month: serverThermal?.vtc_month ?? 0,
      vtc_30d: serverThermal?.vtc_30d ?? 0,
      session_vtc_today,
    });
  }, [hasPhaseSignal, liveSessionVtcKg, payload.phase_tier, serverThermal]);

  const phaseOneComplete = useMemo(() => {
    const progress = payload.phase_progress;
    if (progress) return progress.eligible;
    return payload.phase_tier > 1;
  }, [payload.phase_progress, payload.phase_tier]);

  const activePhaseLayout = thermalGravity?.active_phase_layout ?? null;

  const runtimeContext = useMemo<PhoenixPhaseRuntimeContext>(
    () => ({
      phaseTier: payload.phase_tier,
      phaseLabel: PHASE_TIER_LABELS[payload.phase_tier],
      phaseOneProgress: payload.phase_progress ?? null,
      cosmeticPreferences: payload.custom_preferences,
      phaseOneComplete,
      thermalGravity,
      activePhaseLayout,
      isThermallyDegraded: false,
      isThermalRestorationActive: false,
      isForumInactive: false,
      vtcMonth: thermalGravity?.vtc_month ?? 0,
      sessionVtcToday: thermalGravity?.session_vtc_today ?? Math.max(0, liveSessionVtcKg),
      isHydrated,
    }),
    [activePhaseLayout, isHydrated, liveSessionVtcKg, payload, phaseOneComplete, thermalGravity],
  );

  const shellStyle = useMemo(() => cssVars as CSSProperties, [cssVars]);

  return (
    <div
      id="meccafit-dashboard-root"
      data-phase-tier={payload.phase_tier}
      data-phase-label={PHASE_TIER_LABELS[payload.phase_tier]}
      data-phase-reached={thermalGravity?.phase_reached}
      data-active-phase-layout={activePhaseLayout ?? undefined}
      className="meccafit-cosmetic-shell relative min-h-dvh w-full"
      style={shellStyle}
    >
      {children(runtimeContext)}

      {payload.phase_tier === 1 && payload.phase_progress ? (
        <aside
          className="pointer-events-none fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] z-[8] max-w-[min(18rem,88vw)] rounded-xl border border-orange-500/10 bg-black/70 px-3 py-2 backdrop-blur-sm"
          aria-label="Progresso fase Cinzas"
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-amber-500/80">
            Fase Cinzas · linhagem Fenyxia
          </p>
          <p className="mt-1 text-[10px] leading-snug text-neutral-400">
            {payload.phase_progress.hours_elapsed}/{payload.phase_progress.hours_required}h ·{" "}
            {payload.phase_progress.sessions}/{PHASE_ONE_MIN_SESSIONS} sessões ·{" "}
            {payload.phase_progress.vtc_cumulative.toLocaleString("pt-BR")}/
            {PHASE_ONE_MIN_VTC_KG.toLocaleString("pt-BR")} kg VTC
          </p>
        </aside>
      ) : null}
    </div>
  );
});

/** @deprecated Use PhoenixPhaseEngine — nome antigo confundia com ANYMA FÊNIX (IA). */
export const AnimaFenixEngine = PhoenixPhaseEngine;
export type AnimaFenixRuntimeContext = PhoenixPhaseRuntimeContext;
