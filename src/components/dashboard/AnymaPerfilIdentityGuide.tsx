"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimaTourCallout } from "@/components/dashboard/AnimaTourCallout";
import { usePhoenixVoice } from "@/hooks/usePhoenixVoice";
import { ANYMA_BRAND } from "@/lib/anyma-copy";
import {
  PERFIL_IDENTITY_FIELD_BEATS,
  PERFIL_TAB_BEAT,
  PERFIL_TAB_SELECTOR,
  PERFIL_IDENTIDADE_BEAT,
  waitForTourTarget,
} from "@/lib/anima-perfil-identity-beats";
import {
  PERFIL_IDENTITY_TOUR_INPUT_EVENT,
  readPerfilIdentityTourFormState,
  type PerfilIdentityTourFormState,
} from "@/lib/anima-perfil-identity-form";
import { formatAnimaSpeech } from "@/lib/anima-speech";
import type { DashboardTabId } from "@/lib/dashboard-tabs";
import { injectRegisteredName } from "@/lib/profile-display-name";
import { DASHBOARD_TAP_TARGET } from "@/lib/dashboard-config";

type AnymaPerfilIdentityGuideProps = {
  activeTab: DashboardTabId;
  profileName: string;
  onEnsurePerfilTab: () => void;
};

const RETURNING_GUIDE_BEATS = [PERFIL_TAB_BEAT, PERFIL_IDENTIDADE_BEAT, ...PERFIL_IDENTITY_FIELD_BEATS];

/** Destaca cada passo de identidade enquanto o selo está pendente. */
export function AnymaPerfilIdentityGuide({
  activeTab,
  profileName,
  onEnsurePerfilTab,
}: AnymaPerfilIdentityGuideProps) {
  const { igniteVoice, isSupported, state } = usePhoenixVoice();
  const [beatIndex, setBeatIndex] = useState(0);
  const [readyBeatIndex, setReadyBeatIndex] = useState<number | null>(null);
  const targetReady = readyBeatIndex === beatIndex;
  const [guideComplete, setGuideComplete] = useState(false);
  const [identityForm, setIdentityForm] = useState<PerfilIdentityTourFormState>(() =>
    readPerfilIdentityTourFormState(),
  );
  const onPerfil = activeTab === "perfil";

  const beat = RETURNING_GUIDE_BEATS[Math.min(beatIndex, RETURNING_GUIDE_BEATS.length - 1)];

  const speech = useMemo(
    () => formatAnimaSpeech(injectRegisteredName(beat.speech, profileName)),
    [beat.speech, profileName],
  );

  const advanceGateMet = useMemo(() => {
    if (beat.advanceGate === "nome") return identityForm.hasName;
    if (beat.advanceGate === "genero") return identityForm.hasGenero;
    return true;
  }, [beat.advanceGate, identityForm.hasGenero, identityForm.hasName]);

  const narrationDone = !isSupported || (state === "idle" && targetReady && onPerfil);

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
    if (!targetReady || !onPerfil || guideComplete) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      igniteVoice({
        text: beat.speech,
        fullName: profileName,
        allowIntroFallback: true,
      });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [beat.speech, beatIndex, guideComplete, igniteVoice, onPerfil, profileName, targetReady]);

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

  const canContinue = targetReady && narrationDone && advanceGateMet;

  const resolveHint = (): string => {
    if (!targetReady) return "Localizando o passo na aba Perfil…";
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
        aria-label="Selo de identidade da linhagem"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300/85">
          {ANYMA_BRAND} · Selo da Linhagem · {beatIndex + 1}/{RETURNING_GUIDE_BEATS.length}
        </p>
        <h2 className="mt-2 text-base font-semibold text-amber-50">{beat.title}</h2>
        <p className="mt-3 max-h-[min(36vh,12rem)] overflow-y-auto text-sm leading-relaxed text-amber-50/90">
          {speech}
        </p>
        <p className="mt-3 text-[11px] text-neutral-400">{resolveHint()}</p>
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
      </div>
    </AnimaTourCallout>
  );
}
