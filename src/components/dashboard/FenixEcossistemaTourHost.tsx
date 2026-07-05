"use client";

import { useEffect, useMemo, useState } from "react";
import { usePhoenixVoice } from "@/hooks/usePhoenixVoice";
import { DASHBOARD_TAP_TARGET } from "@/lib/dashboard-config";
import type { PhaseTier } from "@/lib/dashboard-config";
import type { DashboardTabId } from "@/lib/dashboard-tabs";
import {
  ECOSSISTEMA_TOUR_NAV_DELAY_MS,
  type EcossistemaTourStep,
} from "@/lib/fenix-ecossistema-tour";
import { injectRegisteredName } from "@/lib/profile-display-name";

type FenixEcossistemaTourHostProps = {
  step: EcossistemaTourStep;
  activeTab: DashboardTabId;
  profileName: string;
  phaseTier: PhaseTier;
  onContinue: () => void;
};

export function FenixEcossistemaTourHost({
  step,
  activeTab,
  profileName,
  phaseTier,
  onContinue,
}: FenixEcossistemaTourHostProps) {
  const { igniteVoice, cancelVoice, isSupported, state } = usePhoenixVoice();
  const [tabReady, setTabReady] = useState(false);
  const [narrationDone, setNarrationDone] = useState(!isSupported);
  const tabAligned = activeTab === step.tab;
  const resolvedSpeech = useMemo(
    () => injectRegisteredName(step.speech, profileName),
    [profileName, step.speech],
  );

  useEffect(() => {
    setTabReady(false);
    setNarrationDone(!isSupported);

    if (!tabAligned) return;

    const timer = window.setTimeout(() => setTabReady(true), ECOSSISTEMA_TOUR_NAV_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isSupported, step.id, step.tab, tabAligned]);

  useEffect(() => {
    if (!tabReady || !tabAligned) return;
    igniteVoice({ text: step.speech, fullName: profileName, tier: phaseTier, allowIntroFallback: false });
    return () => cancelVoice();
  }, [
    cancelVoice,
    igniteVoice,
    phaseTier,
    profileName,
    step.id,
    step.speech,
    tabAligned,
    tabReady,
  ]);

  useEffect(() => {
    if (!isSupported) return;
    if (state === "speaking") {
      setNarrationDone(false);
      return;
    }
    if (state === "idle" && tabReady && tabAligned) {
      setNarrationDone(true);
    }
  }, [isSupported, state, tabAligned, tabReady]);

  const canContinue = tabAligned && tabReady && narrationDone;

  return (
    <div
      className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[125] flex justify-center px-4 sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Apresentação da aba ${step.title}`}
    >
      <div className="w-full max-w-lg rounded-2xl border border-orange-500/25 bg-neutral-950/95 p-5 shadow-[0_0_40px_rgba(249,115,22,0.18)] backdrop-blur-xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300/85">
          {step.eyebrow}
        </p>
        <h2 className="mt-2 text-base font-semibold text-amber-50">{step.title}</h2>
        <p className="mt-3 max-h-[min(40vh,14rem)] overflow-y-auto text-sm leading-relaxed text-amber-50/90">
          {resolvedSpeech}
        </p>
        <p className="mt-3 text-[11px] text-neutral-400">
          {!tabAligned
            ? `Abrindo ${step.eyebrow.replace("Anima Fênix · ", "")}…`
            : !tabReady
              ? "Abrindo o altar desta aba…"
              : isSupported
                ? state === "speaking"
                  ? "Ouça a Anima Fênix enquanto lê."
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
          {canContinue ? step.continueLabel : "Narrativa em chamas…"}
        </button>
      </div>
    </div>
  );
}
