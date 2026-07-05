"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PhoenixPhaseRuntimeContext } from "@/components/dashboard/PhoenixPhaseEngine";
import { usePhoenixVoice } from "@/hooks/usePhoenixVoice";
import { PhoenixCanvas } from "@/components/dashboard/PhoenixCanvas";
import {
  ANIMA_BALLOONS,
  ANIMA_DEBT_SOFT_GREETING,
  ANIMA_EXIT_COPY,
  ANIMA_ONBOARDING_LOCK_MS,
  markDebtSoftGreetingShown,
  readAnimaOnboardingComplete,
  resolveIntentSummary,
  resolveOnboardingSpeech,
  resolvePunishmentSpeech,
  resolveTierLore,
  shouldShowDebtSoftGreeting,
  writeAnimaLastVisit,
  writeAnimaOnboardingComplete,
  PHOENIX_PUNISHMENT_LORE,
  type AnimaBalloonAnchor,
  type AnimaSpeechContext,
} from "@/lib/phoenix-lore";
import { markAnimaPortalVisto } from "@/lib/profile-identity";
import {
  DASHBOARD_TAP_TARGET,
  THERMAL_GRAVITY_RESTORATION_FLASH_MS,
} from "@/lib/dashboard-config";
import type { DashboardTabId } from "@/lib/dashboard-tabs";

const ANCHOR_TO_TAB: Record<AnimaBalloonAnchor, DashboardTabId> = {
  treino: "treino",
  evolucao: "evolucao",
  perfil: "perfil",
};

export type PhoenixHelperProps = {
  userId: string;
  profileName: string;
  phaseContext: PhoenixPhaseRuntimeContext;
  daysAbsent: number | null;
  isPunished?: boolean;
  animaPortalVisto?: boolean;
  onTabChange: (tab: DashboardTabId) => void;
  onOnboardingComplete?: () => void;
};

function readPrefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const PhoenixHelper = memo(function PhoenixHelper({
  userId,
  profileName,
  phaseContext,
  daysAbsent,
  isPunished = false,
  animaPortalVisto = false,
  onTabChange,
  onOnboardingComplete,
}: PhoenixHelperProps) {
  const { igniteVoice, cancelVoice, isSupported, state } = usePhoenixVoice();
  const [hudOpen, setHudOpen] = useState(false);
  const [onboardingActive, setOnboardingActive] = useState(false);
  const [onboardingLockMs, setOnboardingLockMs] = useState(
    animaPortalVisto ? 0 : ANIMA_ONBOARDING_LOCK_MS,
  );
  const [exitDesaturate, setExitDesaturate] = useState(false);
  const [highlightAnchor, setHighlightAnchor] = useState<AnimaBalloonAnchor | null>(null);
  const onboardingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debtGreetingFiredRef = useRef(false);
  const penaltySpeechFiredRef = useRef(false);
  const onboardingNarrationFiredRef = useRef(false);
  const onboardingHasSpokenRef = useRef(false);
  const skipNextRevealSpeechRef = useRef(false);
  const [onboardingNarrationDone, setOnboardingNarrationDone] = useState(
    animaPortalVisto || !isSupported,
  );

  const speechCtx = useMemo<AnimaSpeechContext>(
    () => ({ profileName, phaseContext, daysAbsent }),
    [profileName, phaseContext, daysAbsent],
  );

  const onboardingSpeech = useMemo(
    () => resolveOnboardingSpeech(speechCtx),
    [speechCtx],
  );

  const tierGreetingCopy = useMemo(
    () => resolveTierLore(phaseContext.phaseTier, profileName),
    [phaseContext.phaseTier, profileName],
  );

  const punishmentSpeech = useMemo(
    () => resolvePunishmentSpeech(profileName),
    [profileName],
  );

  const clearOnboardingTimer = useCallback(() => {
    if (onboardingTimerRef.current) {
      clearInterval(onboardingTimerRef.current);
      onboardingTimerRef.current = null;
    }
  }, []);

  const clearHighlightTimer = useCallback(() => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
  }, []);

  const clearExitTimer = useCallback(() => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isPunished || penaltySpeechFiredRef.current) return;
    penaltySpeechFiredRef.current = true;
    const timer = window.setTimeout(
      () =>
        igniteVoice({
          text: PHOENIX_PUNISHMENT_LORE,
          fullName: profileName,
          isPunished: true,
        }),
      900,
    );
    return () => window.clearTimeout(timer);
  }, [igniteVoice, isPunished, profileName]);

  useEffect(() => {
    if (isPunished) return;

    const needsOnboarding = !readAnimaOnboardingComplete(userId);
    if (needsOnboarding) {
      setOnboardingActive(true);
      setOnboardingLockMs(animaPortalVisto ? 0 : ANIMA_ONBOARDING_LOCK_MS);
      setOnboardingNarrationDone(animaPortalVisto || !isSupported);
      writeAnimaLastVisit(userId);
      return;
    }

    writeAnimaLastVisit(userId);
  }, [animaPortalVisto, isSupported, userId, isPunished]);

  const handlePhoenixRevealed = useCallback(() => {
    if (isPunished) return;

    if (skipNextRevealSpeechRef.current) {
      skipNextRevealSpeechRef.current = false;
      return;
    }

    if (!debtGreetingFiredRef.current && shouldShowDebtSoftGreeting(userId, daysAbsent)) {
      debtGreetingFiredRef.current = true;
      markDebtSoftGreetingShown(userId);
      window.setTimeout(
        () =>
          igniteVoice({
            text: ANIMA_DEBT_SOFT_GREETING,
            fullName: profileName,
            tier: phaseContext.phaseTier,
          }),
        420,
      );
      return;
    }

    igniteVoice({ tier: phaseContext.phaseTier, fullName: profileName });
  }, [daysAbsent, igniteVoice, isPunished, phaseContext.phaseTier, profileName, userId]);

  useEffect(() => {
    if (!onboardingActive) return;

    onboardingHasSpokenRef.current = false;
    setOnboardingNarrationDone(!isSupported);
  }, [onboardingActive, isSupported]);

  useEffect(() => {
    if (!onboardingActive || !isSupported) return;
    if (state === "speaking") {
      onboardingHasSpokenRef.current = true;
    }
    if (onboardingNarrationFiredRef.current && onboardingHasSpokenRef.current && state === "idle") {
      setOnboardingNarrationDone(true);
    }
  }, [onboardingActive, isSupported, state]);

  useEffect(() => {
    if (!onboardingActive || !isSupported || onboardingNarrationDone) return;
    if (onboardingLockMs > 0 || !onboardingNarrationFiredRef.current) return;
    if (onboardingHasSpokenRef.current) return;

    const timer = window.setTimeout(() => setOnboardingNarrationDone(true), 1500);
    return () => window.clearTimeout(timer);
  }, [onboardingActive, isSupported, onboardingLockMs, onboardingNarrationDone, state]);

  useEffect(() => {
    if (!onboardingActive || isPunished || onboardingNarrationFiredRef.current) return;

    onboardingNarrationFiredRef.current = true;
    const timer = window.setTimeout(
      () => igniteVoice({ tier: phaseContext.phaseTier, fullName: profileName }),
      480,
    );

    return () => window.clearTimeout(timer);
  }, [onboardingActive, isPunished, igniteVoice, phaseContext.phaseTier, profileName]);

  useEffect(() => {
    if (!onboardingActive) return;

    clearOnboardingTimer();
    onboardingTimerRef.current = setInterval(() => {
      setOnboardingLockMs((ms) => {
        if (ms <= 100) {
          clearOnboardingTimer();
          return 0;
        }
        return ms - 100;
      });
    }, 100);

    return clearOnboardingTimer;
  }, [onboardingActive, clearOnboardingTimer]);

  useEffect(
    () => () => {
      clearOnboardingTimer();
      clearHighlightTimer();
      clearExitTimer();
      cancelVoice();
    },
    [cancelVoice, clearExitTimer, clearHighlightTimer, clearOnboardingTimer],
  );

  const handleOpenHud = useCallback(() => {
    setHudOpen(true);
  }, []);

  const handleCloseHud = useCallback(() => {
    setHudOpen(false);
    cancelVoice();

    if (!readPrefersReducedMotion()) {
      setExitDesaturate(true);
      clearExitTimer();
      exitTimerRef.current = setTimeout(() => {
        setExitDesaturate(false);
        exitTimerRef.current = null;
      }, THERMAL_GRAVITY_RESTORATION_FLASH_MS);
    }

    igniteVoice({
      text: ANIMA_EXIT_COPY,
      fullName: profileName,
      tier: phaseContext.phaseTier,
    });
  }, [cancelVoice, clearExitTimer, igniteVoice, phaseContext.phaseTier, profileName]);

  const completeOnboarding = useCallback(() => {
    writeAnimaOnboardingComplete(userId);
    void markAnimaPortalVisto().catch(() => {
      // portal flag opcional até migration aplicada
    });
    setOnboardingActive(false);
    clearOnboardingTimer();
    skipNextRevealSpeechRef.current = true;
    onOnboardingComplete?.();
  }, [clearOnboardingTimer, onOnboardingComplete, userId]);

  const handleBalloonClick = useCallback(
    (anchor: AnimaBalloonAnchor) => {
      if (isPunished) return;

      const balloon = ANIMA_BALLOONS.find((item) => item.anchor === anchor);
      if (!balloon) return;

      onTabChange(ANCHOR_TO_TAB[anchor]);
      igniteVoice({
        text: resolveIntentSummary(balloon.intentId, speechCtx),
        fullName: profileName,
        tier: phaseContext.phaseTier,
      });

      setHighlightAnchor(anchor);
      clearHighlightTimer();
      highlightTimerRef.current = setTimeout(() => {
        setHighlightAnchor(null);
        highlightTimerRef.current = null;
      }, 2000);
    },
    [
      clearHighlightTimer,
      igniteVoice,
      isPunished,
      onTabChange,
      phaseContext.phaseTier,
      profileName,
      speechCtx,
    ],
  );

  const onboardingSecondsLeft = Math.ceil(onboardingLockMs / 1000);
  const onboardingLockReleased = onboardingLockMs <= 0;
  const canAcenderLinhagem = onboardingLockReleased && onboardingNarrationDone;

  const resolveOnboardingHint = (): string => {
    if (!onboardingLockReleased) {
      return state === "speaking"
        ? "Ouça a Anima Fênix enquanto a forja se prepara."
        : `Aguarde ${onboardingSecondsLeft}s para continuar.`;
    }
    if (!onboardingNarrationDone) {
      return isSupported
        ? "Aguarde a Anima Fênix concluir a narrativa sagrada."
        : "Sua linhagem está pronta para continuar.";
    }
    return "O Portal de Brasa se abre. Este é o início da sua linhagem.";
  };

  const resolveAcenderButtonLabel = (): string => {
    if (animaPortalVisto) return "Acender minha chama";
    if (!onboardingLockReleased) return `Forja em ${onboardingSecondsLeft}s`;
    if (!onboardingNarrationDone) return "Narrativa em chamas…";
    return "Acender minha linhagem";
  };

  return (
    <>
      {exitDesaturate ? (
        <div
          className="anima-exit-desaturate pointer-events-none fixed inset-0 z-[55]"
          aria-hidden="true"
        />
      ) : null}

      {onboardingActive ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 px-5 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Apresentação da Anima Fênix"
        >
          <div className="max-w-lg rounded-2xl border border-orange-500/20 bg-neutral-950/80 p-6 text-center shadow-[0_0_40px_rgba(249,115,22,0.15)] backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-300/80">
              Anima Fênix · Portal de Brasa
            </p>
            <p className="mt-4 max-h-[min(50vh,20rem)] overflow-y-auto text-sm leading-relaxed text-amber-50/90">
              {onboardingSpeech}
            </p>
            <p className="mt-4 text-xs text-neutral-400">{resolveOnboardingHint()}</p>
            <button
              type="button"
              disabled={!canAcenderLinhagem}
              onClick={completeOnboarding}
              className={`${DASHBOARD_TAP_TARGET} mt-6 w-full rounded-full px-5 py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition ${
                canAcenderLinhagem
                  ? "anima-acender-linhagem-cta"
                  : "anima-acender-linhagem-cta anima-acender-linhagem-cta--waiting"
              }`}
            >
              {resolveAcenderButtonLabel()}
            </button>
          </div>
        </div>
      ) : null}

      {!onboardingActive ? (
        <PhoenixCanvas
          isPunished={isPunished}
          isDeployed={hudOpen}
          isSpeaking={state === "speaking"}
          greetingCopy={tierGreetingCopy}
          onPhoenixRevealed={handlePhoenixRevealed}
          onEngage={handleOpenHud}
          ariaLabel={
            isPunished
              ? "Anima Fênix exilada"
              : hudOpen
                ? "Anima Fênix desperta"
                : "Combustionar Anima Fênix"
          }
        />
      ) : null}

      {hudOpen ? (
        <div className="fixed inset-0 z-[58]" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-label="Fechar Anima Fênix"
            onClick={handleCloseHud}
          />

          <aside
            className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] top-[max(4rem,env(safe-area-inset-top))] flex w-[min(40vw,22rem)] min-w-[16rem] flex-col rounded-2xl border border-orange-500/15 bg-neutral-950/60 p-4 shadow-[0_0_32px_rgba(249,115,22,0.12)] backdrop-blur-xl"
            aria-label="Painel Anima Fênix"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300/85">
                  Anima Fênix
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  {phaseContext.phaseLabel}
                  {isSupported ? "" : " · Voz indisponível neste dispositivo"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseHud}
                className={`${DASHBOARD_TAP_TARGET} shrink-0 rounded-full border border-neutral-700/60 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-300`}
              >
                Sair
              </button>
            </div>

            <div className="mt-4 flex flex-1 flex-col gap-3 overflow-y-auto">
              {isPunished ? (
                <div className="anima-glass-magma rounded-xl border border-neutral-700/50 px-4 py-3 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                    Exílio das Chamas
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-500">{punishmentSpeech}</p>
                </div>
              ) : (
                ANIMA_BALLOONS.map((balloon) => (
                  <button
                    key={balloon.anchor}
                    type="button"
                    data-anima-anchor={balloon.anchor}
                    onClick={() => handleBalloonClick(balloon.anchor)}
                    className={`${DASHBOARD_TAP_TARGET} anima-glass-magma w-full rounded-xl border px-4 py-3 text-left transition ${
                      highlightAnchor === balloon.anchor
                        ? "border-amber-400/50 ring-2 ring-amber-400/40"
                        : "border-orange-500/20 hover:border-amber-400/35"
                    }`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/90">
                      {balloon.label}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      Toque para ir a {balloon.tabLabel} e ouvir o resumo vibrante.
                    </p>
                  </button>
                ))
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
});
