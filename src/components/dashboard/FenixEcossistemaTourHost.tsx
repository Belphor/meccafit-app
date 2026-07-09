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
  const { igniteVoice, cancelVoice, isSupported, state } = usePhoenixVoice();
  const [tabReadyKey, setTabReadyKey] = useState("");
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

  const narrationDone = !isSupported || (state === "idle" && tabReady && tabAligned);

  useEffect(() => {
    if (!tabAligned) return;

    const readyKey = `${step.id}-${beatIndex}`;
    const timer = window.setTimeout(() => setTabReadyKey(readyKey), ECOSSISTEMA_TOUR_NAV_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [beatIndex, step.id, tabAligned]);

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

  const canContinue = tabAligned && tabReady && narrationDone;
  const eyebrowSuffix = step.eyebrow.replace(`${ANYMA_BRAND} · `, "");

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
        <p className="mt-3 max-h-[min(36vh,12rem)] overflow-y-auto text-sm leading-relaxed text-amber-50/90">
          {resolvedSpeech}
        </p>
        <p className="mt-3 text-[11px] text-neutral-400">
          {!tabAligned
            ? `Abrindo ${eyebrowSuffix}.`
            : !tabReady
              ? "Alinhando o altar destacado."
              : isSupported
                ? state === "speaking"
                  ? `Ouça a ${ANYMA_BRAND} enquanto a linha aponta o que importa.`
                  : "Leia e avance quando estiver pronto."
                : "Voz indisponível neste dispositivo. Leia e continue."}
        </p>
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
          {canContinue ? beat.continueLabel : "Narrativa em chamas…"}
        </button>
      </div>
    </AnimaTourCallout>
  );
}
