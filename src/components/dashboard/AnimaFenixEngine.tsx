"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { PhaseTransmutation } from "@/components/dashboard/PhaseTransmutation";
import { ThermalGravityRestorationFlash } from "@/components/dashboard/ThermalGravityRestorationFlash";
import {
  PHASE_ONE_MIN_SESSIONS,
  PHASE_ONE_MIN_VTC_KG,
  PHASE_TIER_LABELS,
  PHASE_TIER_STORAGE_PREFIX,
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

export type AnimaFenixEngineProps = {
  userId: string;
  profileRow: Record<string, unknown> | null | undefined;
  liveSessionVtcKg?: number;
  children: (ctx: AnimaFenixRuntimeContext) => ReactNode;
};

export type AnimaFenixRuntimeContext = {
  phaseTier: PhaseTier;
  phaseLabel: string;
  phaseOneProgress: PhaseOneProgress | null;
  cosmeticPreferences: VerifiedCustomPreferences;
  phaseOneComplete: boolean;
  thermalGravity: ThermalGravityState | null;
  activePhaseLayout: PhaseLayoutCode | null;
  isThermallyDegraded: boolean;
  isThermalRestorationActive: boolean;
};

function readAcknowledgedTier(userId: string): PhaseTier | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`${PHASE_TIER_STORAGE_PREFIX}${userId}`);
    if (!raw) return null;
    return resolvePhaseTier(Number(raw));
  } catch {
    return null;
  }
}

function writeAcknowledgedTier(userId: string, tier: PhaseTier): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${PHASE_TIER_STORAGE_PREFIX}${userId}`, String(tier));
  } catch {
    // quota / private mode
  }
}

function extractPhasePayload(profileRow: Record<string, unknown> | null | undefined): BundlePhasePayload {
  const phaseTier = resolvePhaseTier(profileRow?.phase_tier);
  const custom_preferences = parseVerifiedCustomPreferences(profileRow?.custom_preferences);
  const phase_progress = parsePhaseOneProgress(profileRow?.phase_progress);
  const phase_setup_at =
    typeof profileRow?.phase_setup_at === "string" ? profileRow.phase_setup_at : undefined;

  return { phase_tier: phaseTier, phase_setup_at, phase_progress, custom_preferences };
}

export const AnimaFenixEngine = memo(function AnimaFenixEngine({
  userId,
  profileRow,
  liveSessionVtcKg = 0,
  children,
}: AnimaFenixEngineProps) {
  const payload = useMemo(() => extractPhasePayload(profileRow), [profileRow]);
  const cssVars = useMemo(
    () => cosmeticPreferencesToCssVars(payload.custom_preferences),
    [payload.custom_preferences],
  );

  const [showTransmutation, setShowTransmutation] = useState(false);
  const [showRestorationFlash, setShowRestorationFlash] = useState(false);
  const transmutationEvaluatedRef = useRef<number | null>(null);
  const restorationActiveRef = useRef(false);

  const hasPhaseSignal =
    profileRow != null &&
    (profileRow.phase_tier !== undefined || profileRow.custom_preferences !== undefined);

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
      vtc_30d: serverThermal?.vtc_30d ?? 0,
      session_vtc_today,
    });
  }, [hasPhaseSignal, liveSessionVtcKg, payload.phase_tier, serverThermal?.vtc_30d, serverThermal?.session_vtc_today]);

  const phaseOneComplete = useMemo(() => {
    const progress = payload.phase_progress;
    if (progress) return progress.eligible;
    return payload.phase_tier > 1;
  }, [payload.phase_progress, payload.phase_tier]);

  const isThermallyDegraded = thermalGravity?.is_degraded === true;
  const isThermalRestorationActive = thermalGravity?.restoration_active === true;
  const activePhaseLayout = thermalGravity?.active_phase_layout ?? null;

  const runtimeContext = useMemo<AnimaFenixRuntimeContext>(
    () => ({
      phaseTier: payload.phase_tier,
      phaseLabel: PHASE_TIER_LABELS[payload.phase_tier],
      phaseOneProgress: payload.phase_progress,
      cosmeticPreferences: payload.custom_preferences,
      phaseOneComplete,
      thermalGravity,
      activePhaseLayout,
      isThermallyDegraded,
      isThermalRestorationActive,
    }),
    [
      activePhaseLayout,
      isThermalRestorationActive,
      isThermallyDegraded,
      payload,
      phaseOneComplete,
      thermalGravity,
    ],
  );

  useEffect(() => {
    if (!hasPhaseSignal) return;
    if (transmutationEvaluatedRef.current === payload.phase_tier) return;
    transmutationEvaluatedRef.current = payload.phase_tier;

    const acknowledged = readAcknowledgedTier(userId);

    if (acknowledged === null) {
      if (payload.phase_tier > 1) {
        setShowTransmutation(true);
      } else {
        writeAcknowledgedTier(userId, payload.phase_tier);
      }
      return;
    }

    if (payload.phase_tier > acknowledged) {
      setShowTransmutation(true);
    } else if (payload.phase_tier <= acknowledged) {
      writeAcknowledgedTier(userId, payload.phase_tier);
    }
  }, [hasPhaseSignal, userId, payload.phase_tier]);

  useEffect(() => {
    const restorationNow = thermalGravity?.restoration_active === true;
    if (restorationNow && !restorationActiveRef.current) {
      setShowRestorationFlash(true);
    }
    restorationActiveRef.current = restorationNow;
  }, [thermalGravity?.restoration_active]);

  const handleTransmutationDismiss = useCallback(() => {
    writeAcknowledgedTier(userId, payload.phase_tier);
    setShowTransmutation(false);
  }, [userId, payload.phase_tier]);

  const handleRestorationFlashComplete = useCallback(() => {
    setShowRestorationFlash(false);
  }, []);

  const shellStyle = useMemo(() => cssVars as CSSProperties, [cssVars]);
  const layoutBlocked = isThermallyDegraded && !isThermalRestorationActive;

  return (
    <div
      id="meccafit-dashboard-root"
      data-phase-tier={payload.phase_tier}
      data-phase-label={PHASE_TIER_LABELS[payload.phase_tier]}
      data-phase-reached={thermalGravity?.phase_reached}
      data-active-phase-layout={activePhaseLayout ?? undefined}
      data-thermal-degraded={layoutBlocked ? "true" : undefined}
      data-thermal-restoration={isThermalRestorationActive ? "true" : undefined}
      className={[
        "meccafit-cosmetic-shell relative min-h-dvh w-full",
        layoutBlocked ? "meccafit-thermal-layout-blocked" : "",
        isThermalRestorationActive ? "meccafit-thermal-restoration-active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={shellStyle}
    >
      {showTransmutation ? (
        <PhaseTransmutation phaseTier={payload.phase_tier} onDismiss={handleTransmutationDismiss} />
      ) : null}

      {showRestorationFlash ? (
        <ThermalGravityRestorationFlash
          active={showRestorationFlash}
          onComplete={handleRestorationFlashComplete}
        />
      ) : null}

      {layoutBlocked ? (
        <div
          className="meccafit-thermal-gravity-veil pointer-events-none fixed inset-0 z-[7]"
          aria-hidden
        />
      ) : null}

      {children(runtimeContext)}

      {payload.phase_tier === 1 && payload.phase_progress ? (
        <aside
          className="pointer-events-none fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] z-[8] max-w-[min(18rem,88vw)] rounded-xl border border-orange-500/10 bg-black/70 px-3 py-2 backdrop-blur-sm"
          aria-label="Progresso fase Cinzas"
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-amber-500/80">
            Fase Cinzas · calibração ARGOS
          </p>
          <p className="mt-1 text-[10px] leading-snug text-neutral-400">
            {payload.phase_progress.hours_elapsed}/{payload.phase_progress.hours_required}h ·{" "}
            {payload.phase_progress.sessions}/{PHASE_ONE_MIN_SESSIONS} sessões ·{" "}
            {payload.phase_progress.vtc_cumulative.toLocaleString("pt-BR")}/
            {PHASE_ONE_MIN_VTC_KG.toLocaleString("pt-BR")} kg VTC
          </p>
        </aside>
      ) : null}

      {layoutBlocked && thermalGravity ? (
        <aside
          className="pointer-events-none fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] z-[8] max-w-[min(18rem,88vw)] rounded-xl border border-orange-500/12 bg-black/75 px-3 py-2 backdrop-blur-sm"
          aria-label="Manutenção térmica ARGOS"
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-orange-500/85">
            Gravidade térmica · {thermalGravity.active_phase_layout}
          </p>
          <p className="mt-1 text-[10px] leading-snug text-neutral-400">
            {thermalGravity.vtc_30d.toLocaleString("pt-BR")}/
            {(thermalGravity.maintenance_required_kg ?? 0).toLocaleString("pt-BR")} kg · 30 dias
          </p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-neutral-600">
            Sessão {thermalGravity.restoration_session_baseline_kg?.toLocaleString("pt-BR")} kg
            restaura o braseiro
          </p>
        </aside>
      ) : null}
    </div>
  );
});
