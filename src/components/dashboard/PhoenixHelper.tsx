"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PhoenixPhaseRuntimeContext } from "@/components/dashboard/PhoenixPhaseEngine";
import { AnimaTourCallout } from "@/components/dashboard/AnimaTourCallout";
import { usePhoenixVoice } from "@/hooks/usePhoenixVoice";
import { PhoenixCanvas } from "@/components/dashboard/PhoenixCanvas";
import {
  ANYMA_BRAND,
} from "@/lib/anyma-copy";
import {
  ONBOARDING_SPOTLIGHT_BEATS,
  clearSpotlightBeatProgress,
  readSpotlightBeatProgress,
  waitForTourTarget,
  writeSpotlightBeatProgress,
} from "@/lib/anima-perfil-identity-beats";
import {
  PERFIL_IDENTITY_TOUR_INPUT_EVENT,
  readPerfilIdentityTourFormState,
  type PerfilIdentityTourFormState,
} from "@/lib/anima-perfil-identity-form";
import {
  ANIMA_BALLOONS,
  ANIMA_DEBT_SOFT_GREETING,
  ANIMA_EXIT_COPY,
  ANIMA_ONBOARDING_LOCK_MS,
  ANIMA_ORB_GREETING,
  markDebtSoftGreetingShown,
  readAnimaOnboardingComplete,
  shouldShowAnimaPortalOnboarding,
  writeAnimaOnboardingComplete,
  resolveIntentSummary,
  resolveOnboardingSpeech,
  resolveOrbRevealGreeting,
  resolvePunishmentSpeech,
  shouldShowDebtSoftGreeting,
  writeAnimaLastVisit,
  PHOENIX_PUNISHMENT_LORE,
  type AnimaBalloonAnchor,
  type AnimaSpeechContext,
} from "@/lib/phoenix-lore";
import { markAnimaPortalVisto } from "@/lib/profile-identity";
import {
  DASHBOARD_TAP_TARGET,
  THERMAL_GRAVITY_RESTORATION_FLASH_MS,
} from "@/lib/dashboard-config";
import { formatAnimaSpeech } from "@/lib/anima-speech";
import { injectRegisteredName } from "@/lib/profile-display-name";
import type { DashboardTabId } from "@/lib/dashboard-tabs";

const ANIMA_SPOTLIGHT_LOCK_MS = 8_000;
const ANIMA_SPOTLIGHT_FIELD_LOCK_MS = 3_500;

const ANCHOR_TO_TAB: Record<AnimaBalloonAnchor, DashboardTabId> = {
  treino: "treino",
  evolucao: "evolucao",
  perfil: "perfil",
};

type OnboardingPhase = "intro" | "spotlight" | null;

export type PhoenixHelperProps = {
  userId: string;
  profileName: string;
  phaseContext: PhoenixPhaseRuntimeContext;
  daysAbsent: number | null;
  isPunished?: boolean;
  animaPortalVisto?: boolean;
  onTabChange: (tab: DashboardTabId, options?: { preserveVoice?: boolean }) => void;
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
  const [onboardingPhase, setOnboardingPhase] = useState<OnboardingPhase>(null);
  const [onboardingLockMs, setOnboardingLockMs] = useState(ANIMA_ONBOARDING_LOCK_MS);
  const [spotlightLockMs, setSpotlightLockMs] = useState(ANIMA_SPOTLIGHT_LOCK_MS);
  const [spotlightBeat, setSpotlightBeat] = useState(0);
  const [exitDesaturate, setExitDesaturate] = useState(false);
  const [highlightAnchor, setHighlightAnchor] = useState<AnimaBalloonAnchor | null>(null);
  const onboardingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spotlightTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debtGreetingFiredRef = useRef(false);
  const penaltySpeechFiredRef = useRef(false);
  const onboardingNarrationFiredRef = useRef(false);
  const spotlightNarrationFiredRef = useRef(false);
  const spotlightBootstrappedRef = useRef(false);
  const onboardingHasSpokenRef = useRef(false);
  const spotlightHasSpokenRef = useRef(false);
  const skipNextRevealSpeechRef = useRef(false);
  const [onboardingNarrationDone, setOnboardingNarrationDone] = useState(!isSupported);
  const [spotlightNarrationDone, setSpotlightNarrationDone] = useState(!isSupported);
  const [spotlightTargetReady, setSpotlightTargetReady] = useState(false);
  const [identityForm, setIdentityForm] = useState<PerfilIdentityTourFormState>(() =>
    readPerfilIdentityTourFormState(),
  );

  const speechCtx = useMemo<AnimaSpeechContext>(
    () => ({ profileName, phaseContext, daysAbsent }),
    [profileName, phaseContext, daysAbsent],
  );

  const onboardingSpeech = useMemo(
    () => resolveOnboardingSpeech(speechCtx),
    [speechCtx],
  );

  const spotlightBeatConfig =
    ONBOARDING_SPOTLIGHT_BEATS[Math.min(spotlightBeat, ONBOARDING_SPOTLIGHT_BEATS.length - 1)];

  const spotlightSpeech = useMemo(
    () => formatAnimaSpeech(injectRegisteredName(spotlightBeatConfig.speech, profileName)),
    [profileName, spotlightBeatConfig.speech],
  );

  const tierGreetingCopy = useMemo(
    () => resolveOrbRevealGreeting(profileName),
    [profileName],
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

  const clearSpotlightTimer = useCallback(() => {
    if (spotlightTimerRef.current) {
      clearInterval(spotlightTimerRef.current);
      spotlightTimerRef.current = null;
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
          allowIntroFallback: false,
        }),
      900,
    );
    return () => window.clearTimeout(timer);
  }, [igniteVoice, isPunished, profileName]);

  useEffect(() => {
    if (isPunished) return;

    if (animaPortalVisto && !readAnimaOnboardingComplete(userId)) {
      writeAnimaOnboardingComplete(userId);
    }

    const needsOnboarding = shouldShowAnimaPortalOnboarding(userId, animaPortalVisto);
    if (needsOnboarding) {
      const savedBeat = readSpotlightBeatProgress(userId);
      if (savedBeat !== null) {
        setOnboardingPhase("spotlight");
        setSpotlightBeat(savedBeat);
      } else {
        setOnboardingPhase("intro");
      }
      setOnboardingLockMs(ANIMA_ONBOARDING_LOCK_MS);
      setSpotlightLockMs(ANIMA_SPOTLIGHT_LOCK_MS);
      setOnboardingNarrationDone(!isSupported);
      setSpotlightNarrationDone(!isSupported);
      writeAnimaLastVisit(userId);
      return;
    }

    clearSpotlightBeatProgress(userId);
    setOnboardingPhase(null);
    writeAnimaLastVisit(userId);
  }, [animaPortalVisto, isSupported, userId, isPunished]);

  const guidedTabChange = useCallback(
    (tab: DashboardTabId) => {
      onTabChange(tab, { preserveVoice: true });
    },
    [onTabChange],
  );

  const handlePhoenixRevealed = useCallback(() => {
    if (isPunished) return;

    if (onboardingPhase !== null) {
      if (skipNextRevealSpeechRef.current) {
        skipNextRevealSpeechRef.current = false;
      }
      return;
    }

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
            allowIntroFallback: false,
          }),
        420,
      );
      return;
    }

    igniteVoice({
      text: ANIMA_ORB_GREETING,
      fullName: profileName,
      allowIntroFallback: false,
    });
  }, [daysAbsent, igniteVoice, isPunished, onboardingPhase, phaseContext.phaseTier, profileName, userId]);

  useEffect(() => {
    if (onboardingPhase !== "intro") return;

    onboardingHasSpokenRef.current = false;
    setOnboardingNarrationDone(!isSupported);
  }, [isSupported, onboardingPhase]);

  useEffect(() => {
    if (onboardingPhase !== "intro" || !isSupported) return;
    if (state === "speaking") {
      onboardingHasSpokenRef.current = true;
    }
    if (onboardingNarrationFiredRef.current && onboardingHasSpokenRef.current && state === "idle") {
      setOnboardingNarrationDone(true);
    }
  }, [isSupported, onboardingPhase, state]);

  useEffect(() => {
    if (onboardingPhase !== "intro" || !isSupported || onboardingNarrationDone) return;
    if (onboardingLockMs > 0 || !onboardingNarrationFiredRef.current) return;
    if (onboardingHasSpokenRef.current) return;

    const timer = window.setTimeout(() => setOnboardingNarrationDone(true), 1500);
    return () => window.clearTimeout(timer);
  }, [onboardingLockMs, onboardingNarrationDone, onboardingPhase, isSupported, state]);

  useEffect(() => {
    if (onboardingPhase !== "intro" || isPunished || onboardingNarrationFiredRef.current) return;

    onboardingNarrationFiredRef.current = true;
    const timer = window.setTimeout(
      () =>
        igniteVoice({
          tier: 1,
          fullName: profileName,
          allowIntroFallback: true,
        }),
      480,
    );

    return () => window.clearTimeout(timer);
  }, [igniteVoice, isPunished, onboardingPhase, profileName]);

  useEffect(() => {
    if (onboardingPhase !== "intro") return;

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
  }, [clearOnboardingTimer, onboardingPhase]);

  useEffect(() => {
    if (onboardingPhase !== "spotlight") return;

    const syncForm = () => setIdentityForm(readPerfilIdentityTourFormState());
    syncForm();
    window.addEventListener(PERFIL_IDENTITY_TOUR_INPUT_EVENT, syncForm);
    return () => window.removeEventListener(PERFIL_IDENTITY_TOUR_INPUT_EVENT, syncForm);
  }, [onboardingPhase, spotlightBeat]);

  useEffect(() => {
    if (onboardingPhase !== "spotlight" || spotlightBootstrappedRef.current) return;
    if (spotlightBeat < 1) return;

    spotlightBootstrappedRef.current = true;
    guidedTabChange("perfil");
  }, [guidedTabChange, onboardingPhase, spotlightBeat]);

  useEffect(() => {
    if (onboardingPhase !== "spotlight") {
      setSpotlightTargetReady(false);
      return;
    }

    setSpotlightTargetReady(false);

    if (!spotlightBeatConfig.waitForTarget) {
      const timer = window.setTimeout(() => setSpotlightTargetReady(true), 200);
      return () => window.clearTimeout(timer);
    }

    return waitForTourTarget(
      spotlightBeatConfig.targetSelector,
      () => setSpotlightTargetReady(true),
      { initialDelayMs: 480, intervalMs: 120 },
    );
  }, [onboardingPhase, spotlightBeat, spotlightBeatConfig.targetSelector, spotlightBeatConfig.waitForTarget]);

  useEffect(() => {
    if (onboardingPhase !== "spotlight") return;

    spotlightHasSpokenRef.current = false;
    spotlightNarrationFiredRef.current = false;
    setSpotlightNarrationDone(!isSupported);
    setSpotlightLockMs(
      spotlightBeat === 0 ? ANIMA_SPOTLIGHT_LOCK_MS : ANIMA_SPOTLIGHT_FIELD_LOCK_MS,
    );
  }, [isSupported, onboardingPhase, spotlightBeat]);

  useEffect(() => {
    if (onboardingPhase !== "spotlight" || isPunished || !spotlightTargetReady) return;

    let cancelled = false;
    const speechTimer = window.setTimeout(() => {
      if (cancelled) return;
      spotlightNarrationFiredRef.current = true;
      igniteVoice({
        text: spotlightBeatConfig.speech,
        fullName: profileName,
        allowIntroFallback: true,
      });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(speechTimer);
    };
  }, [
    igniteVoice,
    isPunished,
    onboardingPhase,
    profileName,
    spotlightBeat,
    spotlightBeatConfig.speech,
    spotlightTargetReady,
  ]);

  useEffect(() => {
    if (onboardingPhase !== "spotlight" || !isSupported) return;
    if (state === "speaking") {
      spotlightHasSpokenRef.current = true;
    }
    if (spotlightNarrationFiredRef.current && spotlightHasSpokenRef.current && state === "idle") {
      setSpotlightNarrationDone(true);
    }
  }, [isSupported, onboardingPhase, state]);

  useEffect(() => {
    if (onboardingPhase !== "spotlight" || !isSupported || spotlightNarrationDone) return;
    if (spotlightLockMs > 0 || !spotlightNarrationFiredRef.current) return;
    if (spotlightHasSpokenRef.current) return;

    const timer = window.setTimeout(() => setSpotlightNarrationDone(true), 1200);
    return () => window.clearTimeout(timer);
  }, [isSupported, onboardingPhase, spotlightLockMs, spotlightNarrationDone, state]);

  useEffect(() => {
    if (onboardingPhase !== "spotlight") return;

    clearSpotlightTimer();
    spotlightTimerRef.current = setInterval(() => {
      setSpotlightLockMs((ms) => {
        if (ms <= 100) {
          clearSpotlightTimer();
          return 0;
        }
        return ms - 100;
      });
    }, 100);

    return clearSpotlightTimer;
  }, [clearSpotlightTimer, onboardingPhase, spotlightBeat]);

  useEffect(
    () => () => {
      clearOnboardingTimer();
      clearSpotlightTimer();
      clearHighlightTimer();
      clearExitTimer();
      cancelVoice();
    },
    [cancelVoice, clearExitTimer, clearHighlightTimer, clearOnboardingTimer, clearSpotlightTimer],
  );

  const handleOpenHud = useCallback(() => {
    if (onboardingPhase !== null) return;
    setHudOpen(true);
  }, [onboardingPhase]);

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
      allowIntroFallback: false,
    });
  }, [cancelVoice, clearExitTimer, igniteVoice, phaseContext.phaseTier, profileName]);

  const completeIntro = useCallback(() => {
    clearOnboardingTimer();
    cancelVoice();
    writeSpotlightBeatProgress(userId, 0);
    setSpotlightBeat(0);
    setOnboardingPhase("spotlight");
  }, [cancelVoice, clearOnboardingTimer, userId]);

  const completeSpotlight = useCallback(() => {
    writeAnimaOnboardingComplete(userId);
    clearSpotlightBeatProgress(userId);
    void markAnimaPortalVisto().catch(() => {
      // portal flag opcional até migration aplicada
    });
    setOnboardingPhase(null);
    setSpotlightBeat(0);
    spotlightBootstrappedRef.current = false;
    clearSpotlightTimer();
    skipNextRevealSpeechRef.current = true;
    onOnboardingComplete?.();
  }, [clearSpotlightTimer, onOnboardingComplete, userId]);

  const advanceSpotlight = useCallback(() => {
    const lastBeat = ONBOARDING_SPOTLIGHT_BEATS.length - 1;
    if (spotlightBeat >= lastBeat) {
      completeSpotlight();
      return;
    }

    const nextBeat = spotlightBeat + 1;
    if (nextBeat >= 1) {
      guidedTabChange("perfil");
    }

    writeSpotlightBeatProgress(userId, nextBeat);
    setSpotlightTargetReady(false);
    setSpotlightNarrationDone(!isSupported);
    setSpotlightBeat(nextBeat);
  }, [completeSpotlight, guidedTabChange, isSupported, spotlightBeat, userId]);

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
        allowIntroFallback: false,
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

  const spotlightSecondsLeft = Math.ceil(spotlightLockMs / 1000);
  const spotlightLockReleased = spotlightBeat === 0 ? spotlightLockMs <= 0 : true;

  const advanceGateMet = useMemo(() => {
    if (spotlightBeatConfig.advanceGate === "nome") return identityForm.hasName;
    if (spotlightBeatConfig.advanceGate === "genero") return identityForm.hasGenero;
    return true;
  }, [identityForm.hasGenero, identityForm.hasName, spotlightBeatConfig.advanceGate]);

  const canAdvanceSpotlight =
    spotlightTargetReady &&
    spotlightNarrationDone &&
    spotlightLockReleased &&
    advanceGateMet;

  const resolveOnboardingHint = (): string => {
    if (!onboardingLockReleased) {
      return state === "speaking"
        ? `Ouça a ${ANYMA_BRAND} enquanto a forja se prepara.`
        : `Aguarde ${onboardingSecondsLeft}s para continuar.`;
    }
    if (!onboardingNarrationDone) {
      return isSupported
        ? `Aguarde a ${ANYMA_BRAND} concluir a narrativa sagrada.`
        : "Sua linhagem está pronta para continuar.";
    }
    return "As Cinzas falaram. Agora a ANYMA mostrará onde permanece no Portal.";
  };

  const resolveAcenderButtonLabel = (): string => {
    if (!onboardingLockReleased) return `Forja em ${onboardingSecondsLeft}s`;
    if (!onboardingNarrationDone) return "Narrativa em chamas…";
    return `Conhecer a ${ANYMA_BRAND}`;
  };

  const resolveSpotlightHint = (): string => {
    if (!spotlightTargetReady) {
      return "Localizando o passo na aba Perfil…";
    }

    if (spotlightBeat === 0 && !spotlightLockReleased) {
      return state === "speaking"
        ? "A linha aponta a esfera âmbar. Ouça com atenção."
        : `Aguarde ${spotlightSecondsLeft}s para continuar.`;
    }

    if (!spotlightNarrationDone) {
      return isSupported
        ? `Aguarde a ${ANYMA_BRAND} concluir a orientação.`
        : "Leia a instrução e avance quando estiver pronto.";
    }

    if (spotlightBeatConfig.advanceGate === "nome" && !identityForm.hasName) {
      return "Digite seu nome no campo iluminado (mínimo 2 letras) e toque em continuar.";
    }

    if (spotlightBeatConfig.advanceGate === "genero" && !identityForm.hasGenero) {
      return "Selecione masculino ou feminino no campo iluminado e toque em continuar.";
    }

    if (spotlightBeatConfig.completesTour) {
      return "Quando estiver pronto, use o botão iluminado para selar ou toque em continuar.";
    }

    return "Leia a mensagem e toque em continuar quando estiver pronto.";
  };

  const showPhoenixOrb = onboardingPhase !== "intro";

  return (
    <>
      {exitDesaturate ? (
        <div
          className="anima-exit-desaturate pointer-events-none fixed inset-0 z-[55]"
          aria-hidden="true"
        />
      ) : null}

      {onboardingPhase === "intro" ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 px-5 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label={`Introdução da ${ANYMA_BRAND}`}
        >
          <div className="max-w-lg rounded-2xl border border-orange-500/20 bg-neutral-950/80 p-6 text-center shadow-[0_0_40px_rgba(249,115,22,0.15)] backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-300/80">
              {ANYMA_BRAND} · Juramento das Cinzas
            </p>
            <p className="mt-4 max-h-[min(50vh,20rem)] overflow-y-auto text-sm leading-relaxed text-amber-50/90">
              {onboardingSpeech}
            </p>
            <p className="mt-4 text-xs text-neutral-400">{resolveOnboardingHint()}</p>
            <button
              type="button"
              disabled={!canAcenderLinhagem}
              onClick={completeIntro}
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

      {onboardingPhase === "spotlight" ? (
        <AnimaTourCallout
          active={spotlightTargetReady}
          targetSelector={spotlightBeatConfig.targetSelector}
          highlightSelectors={spotlightBeatConfig.highlightSelectors}
          placement={spotlightBeatConfig.placement}
          zIndex={128}
        >
          <div
            className="rounded-2xl border border-orange-500/25 bg-neutral-950/95 p-5 shadow-[0_0_40px_rgba(249,115,22,0.18)] backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-label={`Apresentação da ${ANYMA_BRAND} no Portal`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300/85">
              {ANYMA_BRAND} · Selo da Linhagem · {spotlightBeat + 1}/{ONBOARDING_SPOTLIGHT_BEATS.length}
            </p>
            <h2 className="mt-2 text-base font-semibold text-amber-50">{spotlightBeatConfig.title}</h2>
            <p className="mt-3 max-h-[min(36vh,12rem)] overflow-y-auto text-sm leading-relaxed text-amber-50/90">
              {spotlightSpeech}
            </p>
            <p className="mt-3 text-[11px] text-neutral-400">{resolveSpotlightHint()}</p>
            <button
              type="button"
              disabled={!canAdvanceSpotlight}
              onClick={advanceSpotlight}
              className={`${DASHBOARD_TAP_TARGET} mt-4 w-full rounded-full px-5 py-3.5 text-xs font-bold uppercase tracking-[0.18em] transition ${
                canAdvanceSpotlight
                  ? "anima-acender-linhagem-cta"
                  : "anima-acender-linhagem-cta anima-acender-linhagem-cta--waiting"
              }`}
            >
              {canAdvanceSpotlight ? spotlightBeatConfig.continueLabel : "Apresentação em chamas…"}
            </button>
          </div>
        </AnimaTourCallout>
      ) : null}

      {showPhoenixOrb ? (
        <PhoenixCanvas
          className={onboardingPhase === "spotlight" ? "anima-phoenix-spotlight-pulse" : ""}
          isPunished={isPunished}
          isDeployed={hudOpen}
          isSpeaking={state === "speaking"}
          greetingCopy={tierGreetingCopy}
          onPhoenixRevealed={handlePhoenixRevealed}
          onEngage={handleOpenHud}
          ariaLabel={
            isPunished
              ? `${ANYMA_BRAND} exilada`
              : hudOpen
                ? `${ANYMA_BRAND} desperta`
                : onboardingPhase === "spotlight"
                  ? `${ANYMA_BRAND} · esfera do Portal`
                  : `Combustionar ${ANYMA_BRAND}`
          }
        />
      ) : null}

      {hudOpen && onboardingPhase === null ? (
        <div className="fixed inset-0 z-[58]" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-label={`Fechar ${ANYMA_BRAND}`}
            onClick={handleCloseHud}
          />

          <aside
            className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] top-[max(4rem,env(safe-area-inset-top))] flex w-[min(40vw,22rem)] min-w-[16rem] flex-col rounded-2xl border border-orange-500/15 bg-neutral-950/60 p-4 shadow-[0_0_32px_rgba(249,115,22,0.12)] backdrop-blur-xl"
            aria-label={`Painel ${ANYMA_BRAND}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300/85">
                  {ANYMA_BRAND}
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
