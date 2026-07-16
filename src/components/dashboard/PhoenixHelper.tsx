"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PhoenixPhaseRuntimeContext } from "@/components/dashboard/PhoenixPhaseEngine";
import { AnimaTourCallout } from "@/components/dashboard/AnimaTourCallout";
import { usePhoenixVoice } from "@/hooks/usePhoenixVoice";
import { PhoenixCanvas } from "@/components/dashboard/PhoenixCanvas";
import {
  ANYMA_BRAND,
  ANYMA_ORB_GREETING,
} from "@/lib/anyma-copy";
import {
  groupAnymaExplanationCards,
  resolveAnymaExplanationCards,
  type AnymaExplanationId,
} from "@/lib/anyma-explanations";
import {
  ONBOARDING_SPOTLIGHT_BEATS,
  clearSpotlightBeatProgress,
  readSpotlightBeatProgress,
  waitForTourTarget,
  writeSpotlightBeatProgress,
} from "@/lib/anima-perfil-identity-beats";
import {
  PERFIL_IDENTITY_TOUR_INPUT_EVENT,
  clearPerfilIdentityFieldUnlocks,
  publishPerfilIdentityFieldUnlock,
  readPerfilIdentityTourFormState,
  resolveFieldIdFromBeatId,
  revokePerfilIdentityFieldsFrom,
  type PerfilIdentityTourFormState,
} from "@/lib/anima-perfil-identity-form";
import {
  ANYMA_DEBT_SOFT_GREETING,
  ANYMA_EXIT_COPY,
  ANYMA_ONBOARDING_LOCK_MS,
  clearReturningLoginGreetingPending,
  markDebtSoftGreetingShown,
  markReturningLoginGreetingShown,
  readAnymaOnboardingComplete,
  readPresentationSkipIdentityOnly,
  shouldShowAnymaPortalOnboarding,
  writeAnymaOnboardingComplete,
  resolveOnboardingSpeech,
  resolvePunishmentSpeech,
  shouldShowDebtSoftGreeting,
  writeAnymaLastVisit,
  PHOENIX_PUNISHMENT_LORE,
  type AnymaSpeechContext,
} from "@/lib/phoenix-lore";
import { triggerReturningLoginGreeting } from "@/lib/anyma-returning-greeting";
import { markAnymaPortalVisto } from "@/lib/profile-identity";
import {
  DASHBOARD_TAP_TARGET,
  THERMAL_GRAVITY_RESTORATION_FLASH_MS,
} from "@/lib/dashboard-config";
import { resolveAnymaSpeechText } from "@/lib/anima-speech";
import { openAlquimiaManifesto } from "@/lib/alquimia-manifesto-events";
import type { DashboardTabId } from "@/lib/dashboard-tabs";

const ANYMA_SPOTLIGHT_LOCK_MS = 8_000;
const ANYMA_SPOTLIGHT_FIELD_LOCK_MS = 3_500;

const EXPLANATION_SCROLL_TARGETS: Partial<Record<AnymaExplanationId, string>> = {
  "treino-aba": '[data-tour-tab="treino"]',
  "treino-voo": '[data-tour-target="treino-voo-cinzas"]',
  "treino-calendario": '[data-tour-target="treino-calendario"]',
  "treino-dia": '[data-tour-target="treino-dia"]',
  "treino-chama-altar": '[data-tour-target="treino-chama-altar"]',
  "evolucao-aba": '[data-tour-tab="evolucao"]',
  "evolucao-ritmo": '[data-tour-target="evolucao-ritmo"]',
  "evolucao-meta": '[data-tour-target="evolucao-meta"]',
  "evolucao-brasas": '[data-tour-target="evolucao-brasas"]',
  "evolucao-chama": '[data-tour-target="evolucao-chama"]',
  "evolucao-gravidade": '[data-tour-target="evolucao-gravidade"]',
  "evolucao-espelho": '[data-tour-target="evolucao-espelho"]',
  "comunidade-aba": '[data-tour-tab="comunidade"]',
  "comunidade-arena": '[data-tour-target="comunidade-arena"]',
  "comunidade-titulos": '[data-tour-target="comunidade-titulos"]',
  "comunidade-rankings": '[data-tour-target="comunidade-rankings"]',
  "comunidade-mural": '[data-tour-target="comunidade-mural"]',
  "dieta-plano": '[data-tour-target="dieta-plano"]',
  "perfil-linhagem": '[data-tour-target="perfil-identidade"]',
  "perfil-historia": '[data-tour-target="perfil-historia"]',
  "perfil-suporte": '[data-tour-target="fenyxia-suporte"]',
};

type OnboardingPhase = "intro" | "spotlight" | null;

export type PhoenixHelperProps = {
  userId: string;
  profileName: string;
  phaseContext: PhoenixPhaseRuntimeContext;
  daysAbsent: number | null;
  isPunished?: boolean;
  animaPortalVisto?: boolean;
  hasPersonalBond?: boolean;
  /** Entradas do Portal após bump (clientes). Saudação de retorno a partir de 2. */
  portalEntryCount?: number;
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
  hasPersonalBond = false,
  portalEntryCount = 0,
  onTabChange,
  onOnboardingComplete,
}: PhoenixHelperProps) {
  const { igniteVoice, prepareVoice, cancelVoice, isSupported, state } = usePhoenixVoice();
  const [hudOpen, setHudOpen] = useState(false);
  const [onboardingPhase, setOnboardingPhase] = useState<OnboardingPhase>(null);
  const [onboardingLockMs, setOnboardingLockMs] = useState(ANYMA_ONBOARDING_LOCK_MS);
  const [spotlightLockMs, setSpotlightLockMs] = useState(ANYMA_SPOTLIGHT_LOCK_MS);
  const [spotlightBeat, setSpotlightBeat] = useState(0);
  const [exitDesaturate, setExitDesaturate] = useState(false);
  const [highlightExplanation, setHighlightExplanation] = useState<AnymaExplanationId | null>(null);
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
  const [onboardingNarrationDone, setOnboardingNarrationDone] = useState(!isSupported);
  const [spotlightNarrationDone, setSpotlightNarrationDone] = useState(!isSupported);
  const [spotlightTargetReady, setSpotlightTargetReady] = useState(false);
  const [identityForm, setIdentityForm] = useState<PerfilIdentityTourFormState>(() =>
    readPerfilIdentityTourFormState(),
  );

  const speechCtx = useMemo<AnymaSpeechContext>(
    () => ({ profileName, phaseContext, daysAbsent }),
    [profileName, phaseContext, daysAbsent],
  );

  const explanationGroups = useMemo(
    () => groupAnymaExplanationCards(resolveAnymaExplanationCards(hasPersonalBond)),
    [hasPersonalBond],
  );

  const onboardingSpeech = useMemo(
    () => resolveOnboardingSpeech(speechCtx),
    [speechCtx],
  );

  const spotlightBeatConfig =
    ONBOARDING_SPOTLIGHT_BEATS[Math.min(spotlightBeat, ONBOARDING_SPOTLIGHT_BEATS.length - 1)];

  const spotlightSpeech = useMemo(
    () => resolveAnymaSpeechText(spotlightBeatConfig.speech, profileName),
    [profileName, spotlightBeatConfig.speech],
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
    if (!isPunished) return;
    prepareVoice({
      text: PHOENIX_PUNISHMENT_LORE,
      fullName: profileName,
      isPunished: true,
      allowIntroFallback: false,
    });
  }, [isPunished, prepareVoice, profileName]);

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
      120,
    );
    return () => window.clearTimeout(timer);
  }, [igniteVoice, isPunished, profileName]);

  useEffect(() => {
    if (isPunished) return;

    if (animaPortalVisto && !readAnymaOnboardingComplete(userId)) {
      writeAnymaOnboardingComplete(userId);
    }

    const needsOnboarding = shouldShowAnymaPortalOnboarding(userId, animaPortalVisto);
    if (needsOnboarding) {
      const savedBeat = readSpotlightBeatProgress(userId);
      if (savedBeat !== null) {
        setOnboardingPhase("spotlight");
        setSpotlightBeat(savedBeat);
      } else {
        setOnboardingPhase("intro");
      }
      setOnboardingLockMs(ANYMA_ONBOARDING_LOCK_MS);
      setSpotlightLockMs(ANYMA_SPOTLIGHT_LOCK_MS);
      setOnboardingNarrationDone(!isSupported);
      setSpotlightNarrationDone(!isSupported);
      writeAnymaLastVisit(userId);
      return;
    }

    clearSpotlightBeatProgress(userId);
    setOnboardingPhase(null);
    writeAnymaLastVisit(userId);
  }, [animaPortalVisto, isSupported, userId, isPunished]);

  /**
   * "Bem-vindo" só no arm do DashboardClient (início de cada login).
   * Não rearmar aqui após Juramento/spotlight — evita falar no meio das explicações.
   */
  useEffect(() => {
    if (isPunished || onboardingPhase === null) return;
    if (portalEntryCount < 1) return;
    markReturningLoginGreetingShown(userId, portalEntryCount);
    clearReturningLoginGreetingPending(userId);
  }, [isPunished, onboardingPhase, portalEntryCount, userId]);

  const guidedTabChange = useCallback(
    (tab: DashboardTabId) => {
      onTabChange(tab, { preserveVoice: true });
    },
    [onTabChange],
  );

  const handlePhoenixRevealed = useCallback(() => {
    // Saudação falada ao abrir o painel (handleOpenHud). Aqui só o balão visual.
    if (isPunished || onboardingPhase !== null) return;
  }, [isPunished, onboardingPhase]);

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
    if (onboardingPhase !== "intro" || isPunished) return;
    prepareVoice({
      tier: 1,
      fullName: profileName,
      allowIntroFallback: true,
    });
  }, [isPunished, onboardingPhase, prepareVoice, profileName]);

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
      80,
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
      spotlightBeat === 0 ? ANYMA_SPOTLIGHT_LOCK_MS : ANYMA_SPOTLIGHT_FIELD_LOCK_MS,
    );
  }, [isSupported, onboardingPhase, spotlightBeat]);

  useEffect(() => {
    if (onboardingPhase !== "spotlight" || isPunished) return;
    prepareVoice({
      text: spotlightBeatConfig.speech,
      fullName: profileName,
      allowIntroFallback: true,
    });
  }, [
    isPunished,
    onboardingPhase,
    prepareVoice,
    profileName,
    spotlightBeat,
    spotlightBeatConfig.speech,
  ]);

  useEffect(() => {
    if (onboardingPhase !== "spotlight" || isPunished || !spotlightTargetReady) return;

    spotlightNarrationFiredRef.current = true;
    igniteVoice({
      text: spotlightBeatConfig.speech,
      fullName: profileName,
      allowIntroFallback: true,
    });
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

  useEffect(() => {
    if (isPunished || onboardingPhase !== null) return;
    prepareVoice({
      text: ANYMA_ORB_GREETING,
      fullName: profileName,
      allowIntroFallback: false,
    });
  }, [isPunished, onboardingPhase, prepareVoice, profileName]);

  const handleOpenHud = useCallback(() => {
    if (onboardingPhase !== null) return;
    if (hudOpen) return;

    if (isPunished) {
      setHudOpen(true);
      return;
    }

    // Saudação de retorno: só voz. Sem abrir o painel / card.
    if (triggerReturningLoginGreeting()) {
      return;
    }

    setHudOpen(true);

    if (!debtGreetingFiredRef.current && shouldShowDebtSoftGreeting(userId, daysAbsent)) {
      debtGreetingFiredRef.current = true;
      markDebtSoftGreetingShown(userId);
      igniteVoice({
        text: ANYMA_DEBT_SOFT_GREETING,
        fullName: profileName,
        tier: phaseContext.phaseTier,
        allowIntroFallback: false,
      });
      return;
    }

    igniteVoice({
      text: ANYMA_ORB_GREETING,
      fullName: profileName,
      allowIntroFallback: false,
    });
  }, [
    daysAbsent,
    hudOpen,
    igniteVoice,
    isPunished,
    onboardingPhase,
    phaseContext.phaseTier,
    profileName,
    userId,
  ]);

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
      text: ANYMA_EXIT_COPY,
      fullName: profileName,
      tier: phaseContext.phaseTier,
      allowIntroFallback: false,
    });
  }, [cancelVoice, clearExitTimer, igniteVoice, phaseContext.phaseTier, profileName]);

  const finishPortalOnboarding = useCallback(() => {
    writeAnymaOnboardingComplete(userId);
    clearSpotlightBeatProgress(userId);
    if (portalEntryCount >= 1) {
      markReturningLoginGreetingShown(userId, portalEntryCount);
      clearReturningLoginGreetingPending(userId);
    }
    void markAnymaPortalVisto().catch(() => {
      // portal flag opcional até migration aplicada
    });
    setOnboardingPhase(null);
    setSpotlightBeat(0);
    spotlightBootstrappedRef.current = false;
    clearSpotlightTimer();
    onOnboardingComplete?.();
  }, [clearSpotlightTimer, onOnboardingComplete, portalEntryCount, userId]);

  const completeIntro = useCallback(() => {
    clearOnboardingTimer();
    cancelVoice();

    // "Pular apresentação": após Juramento das Cinzas → perfil, sem spotlight.
    if (readPresentationSkipIdentityOnly(userId)) {
      clearPerfilIdentityFieldUnlocks();
      finishPortalOnboarding();
      guidedTabChange("perfil");
      return;
    }

    clearPerfilIdentityFieldUnlocks();
    writeSpotlightBeatProgress(userId, 0);
    setSpotlightBeat(0);
    setOnboardingPhase("spotlight");
  }, [
    cancelVoice,
    clearOnboardingTimer,
    finishPortalOnboarding,
    guidedTabChange,
    userId,
  ]);

  const completeSpotlight = useCallback(() => {
    finishPortalOnboarding();
  }, [finishPortalOnboarding]);

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

  const handleExplanationClick = useCallback(
    (explanationId: AnymaExplanationId) => {
      if (isPunished) return;

      const card = resolveAnymaExplanationCards(hasPersonalBond).find(
        (item) => item.id === explanationId,
      );
      if (!card) return;

      const selector = EXPLANATION_SCROLL_TARGETS[explanationId];

      if (explanationId === "perfil-historia") {
        cancelVoice();
        setHudOpen(false);
        onTabChange(card.tab);
        openAlquimiaManifesto({ narrate: true });
        return;
      }

      if (card.redirectOnly) {
        cancelVoice();
        setHudOpen(false);
        onTabChange(card.tab);

        if (selector) {
          window.setTimeout(() => {
            const target = document.querySelector(selector);
            if (target instanceof HTMLElement) {
              target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
              target.classList.add("anyma-destination-highlight");
              window.setTimeout(() => {
                target.classList.remove("anyma-destination-highlight");
              }, 2000);
            }
          }, 420);
        }

        return;
      }

      onTabChange(card.tab, { preserveVoice: true });
      igniteVoice({
        text: card.speech,
        fullName: profileName,
        tier: phaseContext.phaseTier,
        allowIntroFallback: false,
      });

      if (selector) {
        window.setTimeout(() => {
          const target = document.querySelector(selector);
          if (target instanceof HTMLElement) {
            target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
          }
        }, 420);
      }

      setHighlightExplanation(explanationId);
      clearHighlightTimer();
      highlightTimerRef.current = setTimeout(() => {
        setHighlightExplanation(null);
        highlightTimerRef.current = null;
      }, 2000);
    },
    [
      cancelVoice,
      clearHighlightTimer,
      hasPersonalBond,
      igniteVoice,
      isPunished,
      onTabChange,
      phaseContext.phaseTier,
      profileName,
    ],
  );

  const onboardingSecondsLeft = Math.ceil(onboardingLockMs / 1000);
  const onboardingLockReleased = onboardingLockMs <= 0;
  const canAcenderLinhagem = onboardingLockReleased && onboardingNarrationDone;

  const spotlightSecondsLeft = Math.ceil(spotlightLockMs / 1000);
  const spotlightLockReleased = spotlightLockMs <= 0;
  const fieldUnlockReady =
    spotlightTargetReady && spotlightNarrationDone && spotlightLockReleased;

  useEffect(() => {
    if (onboardingPhase !== "spotlight") return;
    const field = resolveFieldIdFromBeatId(spotlightBeatConfig.id);
    if (!field) return;
    // Relocka nome/gênero/foto ao entrar na explicação do passo.
    revokePerfilIdentityFieldsFrom(field);
  }, [onboardingPhase, spotlightBeatConfig.id]);

  useEffect(() => {
    if (onboardingPhase !== "spotlight" || !fieldUnlockReady) return;
    const field = resolveFieldIdFromBeatId(spotlightBeatConfig.id);
    if (field) publishPerfilIdentityFieldUnlock(field);
  }, [fieldUnlockReady, onboardingPhase, spotlightBeatConfig.id]);

  const advanceGateMet = useMemo(() => {
    if (spotlightBeatConfig.advanceGate === "nome") return identityForm.hasName;
    if (spotlightBeatConfig.advanceGate === "genero") return identityForm.hasGenero;
    if (spotlightBeatConfig.advanceGate === "foto") return identityForm.hasPhoto;
    return true;
  }, [
    identityForm.hasGenero,
    identityForm.hasName,
    identityForm.hasPhoto,
    spotlightBeatConfig.advanceGate,
  ]);

  const canAdvanceSpotlight = fieldUnlockReady && advanceGateMet;

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
    return "As Cinzas falaram. Aceite o juramento para seguir.";
  };

  const resolveAcenderButtonLabel = (): string => {
    if (!onboardingLockReleased) return `Forja em ${onboardingSecondsLeft}s`;
    if (!onboardingNarrationDone) return "Narrativa em chamas…";
    return "Aceito o Juramento";
  };

  const resolveSpotlightHint = (): string => {
    if (!spotlightTargetReady) {
      return "Localizando o passo na aba Perfil…";
    }

    if (!spotlightLockReleased) {
      return state === "speaking"
        ? spotlightBeat === 0
          ? "A linha aponta a esfera âmbar. Ouça com atenção."
          : `Ouça a ${ANYMA_BRAND} enquanto a linha aponta o campo.`
        : `Aguarde ${spotlightSecondsLeft}s. O campo libera após a explicação.`;
    }

    if (!spotlightNarrationDone) {
      return isSupported
        ? `Aguarde a ${ANYMA_BRAND} concluir a orientação.`
        : "Leia a instrução. O campo libera em seguida.";
    }

    if (spotlightBeatConfig.advanceGate === "nome" && !identityForm.hasName) {
      return "Digite seu nome no campo iluminado (mínimo 2 letras) e toque em continuar.";
    }

    if (spotlightBeatConfig.advanceGate === "genero" && !identityForm.hasGenero) {
      return "Selecione masculino ou feminino no campo iluminado e toque em continuar.";
    }

    if (spotlightBeatConfig.advanceGate === "foto" && !identityForm.hasPhoto) {
      return "Toque no botão destacado para inserir a foto. Depois o botão Continuar para selar libera.";
    }

    if (spotlightBeatConfig.completesTour) {
      return "Foto pronta. Continue para selar com Confirmar nome e gênero.";
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
          aria-label="Juramento das Cinzas"
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
              {ANYMA_BRAND} · Selo do Perfil · {spotlightBeat + 1}/{ONBOARDING_SPOTLIGHT_BEATS.length}
            </p>
            <h2 className="mt-2 text-base font-semibold text-amber-50">{spotlightBeatConfig.title}</h2>
            <p className="mt-3 max-h-[min(36vh,12rem)] overflow-y-auto text-sm leading-relaxed text-amber-50/90">
              {spotlightSpeech}
            </p>
            <p className="mt-3 text-[11px] text-neutral-400">{resolveSpotlightHint()}</p>
            {spotlightBeatConfig.hideContinueButton ? null : (
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
            )}
          </div>
        </AnimaTourCallout>
      ) : null}

      {showPhoenixOrb ? (
        <PhoenixCanvas
          className={onboardingPhase === "spotlight" ? "anima-phoenix-spotlight-pulse" : ""}
          isPunished={isPunished}
          isDeployed={hudOpen}
          isSpeaking={state === "speaking"}
          greetingCopy=""
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
            className="anima-hud-panel flex w-[min(46vw,24rem)] min-w-[17rem] flex-col rounded-2xl border border-orange-500/15 bg-neutral-950/60 p-4 shadow-[0_0_32px_rgba(249,115,22,0.12)] backdrop-blur-xl"
            aria-label={`Painel ${ANYMA_BRAND}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300/85">
                  {ANYMA_BRAND}
                </p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  Toque em um card para ir até o altar e ouvir a explicação.
                  {isSupported ? "" : " Voz indisponível neste dispositivo."}
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

            <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain pb-2 pr-1">
              {isPunished ? (
                <div className="anima-glass-magma rounded-xl border border-neutral-700/50 px-4 py-3 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                    Exílio das Chamas
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-500">{punishmentSpeech}</p>
                </div>
              ) : (
                explanationGroups.map((group) => (
                  <div key={group.group} className="space-y-2">
                    <p className="sticky top-0 z-[1] bg-neutral-950/90 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300/70 backdrop-blur-sm">
                      {group.label}
                    </p>
                    {group.cards.map((card) => {
                      const isSuporteAccent = card.accent === "suporte";

                      return (
                      <button
                        key={card.id}
                        type="button"
                        data-anyma-explanation={card.id}
                        onClick={() => handleExplanationClick(card.id)}
                        aria-label={
                          card.redirectOnly
                            ? `Ir para ${card.label} na aba Perfil`
                            : `Ouvir explicação: ${card.label}`
                        }
                        className={`${DASHBOARD_TAP_TARGET} w-full shrink-0 rounded-xl border px-4 py-2.5 text-left transition ${
                          isSuporteAccent
                            ? "anima-glass-suporte border-emerald-500/40 hover:border-emerald-400/55"
                            : "anima-glass-magma border-orange-500/20 hover:border-amber-400/35"
                        } ${
                          highlightExplanation === card.id
                            ? isSuporteAccent
                              ? "border-emerald-300/55 ring-2 ring-emerald-400/40"
                              : "border-amber-400/50 ring-2 ring-amber-400/40"
                            : ""
                        }`}
                      >
                        <p
                          className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
                            isSuporteAccent ? "text-emerald-100/90" : "text-amber-200/90"
                          }`}
                        >
                          {card.label}
                        </p>
                      </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
});
