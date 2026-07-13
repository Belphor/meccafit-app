"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimaTourCallout } from "@/components/dashboard/AnimaTourCallout";
import { usePhoenixVoice } from "@/hooks/usePhoenixVoice";
import { ANYMA_BRAND } from "@/lib/anyma-copy";
import {
  PERFIL_IDENTITY_FIELD_BEATS,
  PERFIL_TAB_SELECTOR,
  waitForTourTarget,
} from "@/lib/anima-perfil-identity-beats";
import {
  PERFIL_IDENTITY_TOUR_INPUT_EVENT,
  publishPerfilIdentityFieldUnlock,
  readPerfilIdentityTourFormState,
  resolveFieldIdFromBeatId,
  type PerfilIdentityTourFormState,
} from "@/lib/anima-perfil-identity-form";
import { resolveAnymaSpeechText } from "@/lib/anima-speech";
import type { DashboardTabId } from "@/lib/dashboard-tabs";
import { DASHBOARD_TAP_TARGET } from "@/lib/dashboard-config";

type AnymaPerfilIdentityGuideProps = {
  activeTab: DashboardTabId;
  profileName: string;
  onEnsurePerfilTab: () => void;
};

/** Após o spotlight, só os campos restantes. Não reinicia aba Perfil nem identidade. */
const RETURNING_GUIDE_BEATS = [...PERFIL_IDENTITY_FIELD_BEATS];
const GUIDE_FIELD_LOCK_MS = 3_500;

function resolveInitialReturningBeatIndex(form: PerfilIdentityTourFormState): number {
  if (form.hasName && form.hasGenero && form.hasPhoto) {
    return Math.min(3, RETURNING_GUIDE_BEATS.length - 1);
  }
  if (form.hasName && form.hasGenero) return Math.min(2, RETURNING_GUIDE_BEATS.length - 1);
  if (form.hasName) return Math.min(1, RETURNING_GUIDE_BEATS.length - 1);
  return 0;
}

/** Destaca cada passo de identidade enquanto o selo está pendente. */
export function AnymaPerfilIdentityGuide({
  activeTab,
  profileName,
  onEnsurePerfilTab,
}: AnymaPerfilIdentityGuideProps) {
  const { igniteVoice, prepareVoice, isSupported, state } = usePhoenixVoice();
  const [identityForm, setIdentityForm] = useState<PerfilIdentityTourFormState>(() =>
    readPerfilIdentityTourFormState(),
  );
  const [beatIndex, setBeatIndex] = useState(() =>
    resolveInitialReturningBeatIndex(readPerfilIdentityTourFormState()),
  );
  const [readyBeatIndex, setReadyBeatIndex] = useState<number | null>(null);
  const targetReady = readyBeatIndex === beatIndex;
  const [guideComplete, setGuideComplete] = useState(false);
  const [narrationDone, setNarrationDone] = useState(!isSupported);
  const [fieldLockMs, setFieldLockMs] = useState(GUIDE_FIELD_LOCK_MS);
  const hasSpokenRef = useRef(false);
  const narrationFiredRef = useRef(false);
  const fieldLockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onPerfil = activeTab === "perfil";

  const beat = RETURNING_GUIDE_BEATS[Math.min(beatIndex, RETURNING_GUIDE_BEATS.length - 1)];

  const speech = useMemo(
    () => resolveAnymaSpeechText(beat.speech, profileName),
    [beat.speech, profileName],
  );

  const advanceGateMet = useMemo(() => {
    if (beat.advanceGate === "nome") return identityForm.hasName;
    if (beat.advanceGate === "genero") return identityForm.hasGenero;
    if (beat.advanceGate === "foto") return identityForm.hasPhoto;
    return true;
  }, [
    beat.advanceGate,
    identityForm.hasGenero,
    identityForm.hasName,
    identityForm.hasPhoto,
  ]);

  const clearFieldLockTimer = useCallback(() => {
    if (fieldLockTimerRef.current) {
      clearInterval(fieldLockTimerRef.current);
      fieldLockTimerRef.current = null;
    }
  }, []);

  const advanceBeat = useCallback(() => {
    if (beatIndex >= RETURNING_GUIDE_BEATS.length - 1) {
      setGuideComplete(true);
      return;
    }
    setBeatIndex((index) => index + 1);
  }, [beatIndex]);

  useEffect(() => {
    if (!onPerfil) {
      onEnsurePerfilTab();
    }
  }, [onEnsurePerfilTab, onPerfil]);

  useEffect(() => {
    const syncForm = () => setIdentityForm(readPerfilIdentityTourFormState());
    syncForm();
    window.addEventListener(PERFIL_IDENTITY_TOUR_INPUT_EVENT, syncForm);
    return () => window.removeEventListener(PERFIL_IDENTITY_TOUR_INPUT_EVENT, syncForm);
  }, [beatIndex, onPerfil]);

  useEffect(() => {
    if (!onPerfil || guideComplete) {
      return;
    }

    if (!beat.waitForTarget) {
      const timer = window.setTimeout(() => setReadyBeatIndex(beatIndex), 200);
      return () => window.clearTimeout(timer);
    }

    return waitForTourTarget(beat.targetSelector, () => setReadyBeatIndex(beatIndex), {
      initialDelayMs: 480,
      intervalMs: 120,
    });
  }, [beat.targetSelector, beat.waitForTarget, beatIndex, guideComplete, onPerfil]);

  useEffect(() => {
    hasSpokenRef.current = false;
    narrationFiredRef.current = false;
    setNarrationDone(!isSupported);
    setFieldLockMs(GUIDE_FIELD_LOCK_MS);
  }, [beatIndex, isSupported]);

  useEffect(() => {
    if (!onPerfil || guideComplete) {
      clearFieldLockTimer();
      return;
    }

    clearFieldLockTimer();
    fieldLockTimerRef.current = setInterval(() => {
      setFieldLockMs((ms) => {
        if (ms <= 100) {
          clearFieldLockTimer();
          return 0;
        }
        return ms - 100;
      });
    }, 100);

    return clearFieldLockTimer;
  }, [beatIndex, clearFieldLockTimer, guideComplete, onPerfil]);

  useEffect(() => {
    if (!onPerfil || guideComplete) return;
    prepareVoice({
      text: beat.speech,
      fullName: profileName,
      allowIntroFallback: true,
    });
  }, [beat.speech, beatIndex, guideComplete, onPerfil, prepareVoice, profileName]);

  useEffect(() => {
    if (!targetReady || !onPerfil || guideComplete) return;

    narrationFiredRef.current = true;
    igniteVoice({
      text: beat.speech,
      fullName: profileName,
      allowIntroFallback: true,
    });
  }, [beat.speech, beatIndex, guideComplete, igniteVoice, onPerfil, profileName, targetReady]);

  useEffect(() => {
    if (!isSupported || !onPerfil || guideComplete) return;
    if (state === "speaking") {
      hasSpokenRef.current = true;
    }
    if (narrationFiredRef.current && hasSpokenRef.current && state === "idle") {
      setNarrationDone(true);
    }
  }, [guideComplete, isSupported, onPerfil, state]);

  useEffect(() => {
    if (!isSupported || narrationDone || !onPerfil || guideComplete) return;
    if (fieldLockMs > 0 || !narrationFiredRef.current || hasSpokenRef.current) return;
    const timer = window.setTimeout(() => setNarrationDone(true), 1200);
    return () => window.clearTimeout(timer);
  }, [fieldLockMs, guideComplete, isSupported, narrationDone, onPerfil, state, targetReady]);

  const fieldLockReleased = fieldLockMs <= 0;
  const fieldUnlockReady = targetReady && narrationDone && fieldLockReleased;

  useEffect(() => {
    if (!fieldUnlockReady || !onPerfil || guideComplete) return;
    const field = resolveFieldIdFromBeatId(beat.id);
    if (field) publishPerfilIdentityFieldUnlock(field);
  }, [beat.id, fieldUnlockReady, guideComplete, onPerfil]);

  if (guideComplete) return null;

  if (!onPerfil) {
    return (
      <AnimaTourCallout
        active
        targetSelector={PERFIL_TAB_SELECTOR}
        highlightSelectors={[PERFIL_TAB_SELECTOR]}
        placement="bottom"
        zIndex={127}
      >
        <div className="rounded-2xl border border-orange-500/25 bg-neutral-950/95 p-4 shadow-[0_0_32px_rgba(249,115,22,0.16)] backdrop-blur-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300/85">
            {ANYMA_BRAND} · Perfil
          </p>
          <p className="mt-2 text-sm text-amber-50/90">
            Abra a aba Perfil. A linha aponta onde você selará nome e gênero.
          </p>
          <button
            type="button"
            onClick={onEnsurePerfilTab}
            className={`${DASHBOARD_TAP_TARGET} anima-acender-linhagem-cta mt-3 w-full rounded-full px-4 py-3 text-xs font-bold uppercase tracking-[0.16em]`}
          >
            Ir ao Perfil
          </button>
        </div>
      </AnimaTourCallout>
    );
  }

  const canContinue = fieldUnlockReady && advanceGateMet;
  const fieldLockSecondsLeft = Math.ceil(fieldLockMs / 1000);

  const resolveHint = (): string => {
    if (!targetReady) return "Localizando o passo na aba Perfil…";
    if (!fieldLockReleased) {
      return state === "speaking"
        ? `Ouça a ${ANYMA_BRAND} enquanto a linha aponta o campo.`
        : `Aguarde ${fieldLockSecondsLeft}s. O campo libera após a explicação.`;
    }
    if (isSupported && state === "speaking") {
      return `Ouça a ${ANYMA_BRAND} enquanto a linha aponta o campo.`;
    }
    if (!narrationDone) return "Preparando narrativa…";
    if (beat.advanceGate === "nome" && !identityForm.hasName) {
      return "Digite seu nome no campo iluminado (mínimo 2 letras).";
    }
    if (beat.advanceGate === "genero" && !identityForm.hasGenero) {
      return "Selecione masculino ou feminino no campo iluminado.";
    }
    if (beat.advanceGate === "foto" && !identityForm.hasPhoto) {
      return "Toque em Aperta aqui para inserir a foto. Depois Continuar para selar libera.";
    }
    if (beat.completesTour) {
      return "Use o botão iluminado Confirmar nome e gênero para selar sua identidade.";
    }
    return "Toque em continuar quando estiver pronto.";
  };

  return (
    <AnimaTourCallout
      active={targetReady}
      targetSelector={beat.targetSelector}
      highlightSelectors={beat.highlightSelectors}
      placement={beat.placement}
      zIndex={127}
    >
      <div
        className="rounded-2xl border border-orange-500/25 bg-neutral-950/95 p-5 shadow-[0_0_40px_rgba(249,115,22,0.18)] backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Selo de identidade do Perfil"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300/85">
          {ANYMA_BRAND} · Selo do Perfil · {beatIndex + 1}/{RETURNING_GUIDE_BEATS.length}
        </p>
        <h2 className="mt-2 text-base font-semibold text-amber-50">{beat.title}</h2>
        <p className="mt-3 max-h-[min(36vh,12rem)] overflow-y-auto text-sm leading-relaxed text-amber-50/90">
          {speech}
        </p>
        <p className="mt-3 text-[11px] text-neutral-400">{resolveHint()}</p>
        {beat.hideContinueButton ? null : (
          <button
            type="button"
            disabled={!canContinue}
            onClick={advanceBeat}
            className={`${DASHBOARD_TAP_TARGET} mt-4 w-full rounded-full px-5 py-3.5 text-xs font-bold uppercase tracking-[0.18em] transition ${
              canContinue
                ? "anima-acender-linhagem-cta"
                : "anima-acender-linhagem-cta anima-acender-linhagem-cta--waiting"
            }`}
          >
            {canContinue ? beat.continueLabel : "Narrativa em chamas…"}
          </button>
        )}
      </div>
    </AnimaTourCallout>
  );
}
