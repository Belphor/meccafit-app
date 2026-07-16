"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimaTourCallout } from "@/components/dashboard/AnimaTourCallout";
import { usePhoenixVoice } from "@/hooks/usePhoenixVoice";
import { DASHBOARD_TAP_TARGET } from "@/lib/dashboard-config";
import type { PhaseTier } from "@/lib/dashboard-config";
import type { DashboardTabId } from "@/lib/dashboard-tabs";
import { ANYMA_BRAND } from "@/lib/anyma-copy";
import {
  ECOSSISTEMA_TOUR_NAV_DELAY_MS,
  resolveEcossistemaTourSpeech,
  resolveTourBeats,
  type EcossistemaTourStep,
} from "@/lib/fenix-ecossistema-tour";
import {
  PLAN_META_SYNCED_EVENT,
  readPlanMetaSyncedFromDom,
} from "@/lib/plan-meta-tour";

type FenixEcossistemaTourHostProps = {
  step: EcossistemaTourStep;
  beatIndex: number;
  activeTab: DashboardTabId;
  profileName: string;
  phaseTier: PhaseTier;
  onContinue: () => void;
};

export function FenixEcossistemaTourHost({
  step,
  beatIndex,
  activeTab,
  profileName,
  phaseTier,
  onContinue,
}: FenixEcossistemaTourHostProps) {
  const { igniteVoice, prepareVoice, cancelVoice, isSupported, state } = usePhoenixVoice();
  const [tabReadyKey, setTabReadyKey] = useState("");
  const [metaSynced, setMetaSynced] = useState(false);
  const [hasSpoken, setHasSpoken] = useState(false);
  const tabAligned = activeTab === step.tab;
  const tabReady = tabAligned && tabReadyKey === `${step.id}-${beatIndex}`;

  const beats = useMemo(() => resolveTourBeats(step), [step]);
  const beat = beats[Math.min(beatIndex, beats.length - 1)] ?? beats[0];
  const highlightSelectors = useMemo(
    () => beat.highlightSelectors ?? [step.navTargetSelector],
    [beat.highlightSelectors, step.navTargetSelector],
  );

  const resolvedSpeech = useMemo(
    () => resolveEcossistemaTourSpeech(beat.speech, profileName),
    [beat.speech, profileName],
  );

  const narrationDone =
    !isSupported || (hasSpoken && state === "idle" && tabReady && tabAligned);
  const advanceGateMet = beat.advanceGate !== "meta-sync" || metaSynced;
  const canContinue = tabAligned && tabReady && narrationDone && advanceGateMet;
  const eyebrowSuffix = step.eyebrow.replace(`${ANYMA_BRAND} · `, "");

  useEffect(() => {
    // Reset da fala ao trocar de beat/passo do tour — sincronização intencional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasSpoken(false);
  }, [beatIndex, step.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state === "speaking") setHasSpoken(true);
  }, [state]);

  useEffect(() => {
    if (!tabAligned) return;

    const readyKey = `${step.id}-${beatIndex}`;
    const timer = window.setTimeout(() => setTabReadyKey(readyKey), ECOSSISTEMA_TOUR_NAV_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [beatIndex, step.id, tabAligned]);

  useEffect(() => {
    prepareVoice({
      text: beat.speech,
      fullName: profileName,
      tier: phaseTier,
      allowIntroFallback: false,
    });
  }, [beat.speech, beatIndex, phaseTier, prepareVoice, profileName, step.id]);

  useEffect(() => {
    if (!tabReady || !tabAligned) return;
    igniteVoice({ text: beat.speech, fullName: profileName, tier: phaseTier, allowIntroFallback: false });
    return () => cancelVoice();
  }, [
    beat.speech,
    beatIndex,
    cancelVoice,
    igniteVoice,
    phaseTier,
    profileName,
    tabAligned,
    tabReady,
  ]);

  useEffect(() => {
    if (beat.advanceGate !== "meta-sync") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMetaSynced(true);
      return;
    }

    const syncFromDom = () => setMetaSynced(readPlanMetaSyncedFromDom());
    syncFromDom();

    const onSynced = () => setMetaSynced(true);
    window.addEventListener(PLAN_META_SYNCED_EVENT, onSynced);
    const poll = window.setInterval(syncFromDom, 800);

    return () => {
      window.removeEventListener(PLAN_META_SYNCED_EVENT, onSynced);
      window.clearInterval(poll);
    };
  }, [beat.advanceGate, beatIndex, step.id, tabReady]);

  const resolveHint = (): string => {
    if (!tabAligned) return `Abrindo ${eyebrowSuffix}.`;
    if (!tabReady) return "Alinhando o altar destacado.";
    if (isSupported && state === "speaking") {
      return `Ouça a ${ANYMA_BRAND} enquanto a linha aponta o que importa.`;
    }
    if (!narrationDone) {
      return isSupported
        ? `Aguarde a ${ANYMA_BRAND} concluir a orientação.`
        : "Voz indisponível neste dispositivo. Leia e continue.";
    }
    if (beat.advanceGate === "meta-sync" && !metaSynced) {
      return "Ajuste os dias planejados e toque em Sincronizar meta para seguir.";
    }
    return "Leia e avance quando estiver pronto.";
  };

  return (
    <AnimaTourCallout
      active={tabAligned && tabReady}
      targetSelector={beat.targetSelector}
      highlightSelectors={highlightSelectors}
      placement={beat.calloutPlacement}
      zIndex={125}
    >
      <div
        className="rounded-2xl border border-orange-500/25 bg-neutral-950/95 p-5 shadow-[0_0_40px_rgba(249,115,22,0.18)] backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Apresentação da aba ${beat.title}`}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300/85">
          {step.eyebrow}
          {beats.length > 1 ? ` · ${beatIndex + 1}/${beats.length}` : ""}
        </p>
        <h2 className="mt-2 text-base font-semibold text-amber-50">{beat.title}</h2>
        <p className="mt-3 max-h-[min(32vh,11rem)] overflow-y-auto text-sm leading-relaxed text-amber-50/90">
          {resolvedSpeech}
        </p>
        <p className="mt-3 text-[11px] text-neutral-400">{resolveHint()}</p>
        <button
          type="button"
          disabled={!canContinue}
          onClick={onContinue}
          className={`${DASHBOARD_TAP_TARGET} mt-4 w-full rounded-full px-5 py-3.5 text-xs font-bold uppercase tracking-[0.18em] transition ${
            canContinue
              ? "anima-acender-linhagem-cta"
              : "anima-acender-linhagem-cta anima-acender-linhagem-cta--waiting"
          }`}
        >
          {canContinue
            ? beat.continueLabel
            : beat.advanceGate === "meta-sync" && !metaSynced
              ? "Sincronize a meta…"
              : "Narrativa em chamas…"}
        </button>
      </div>
    </AnimaTourCallout>
  );
}
