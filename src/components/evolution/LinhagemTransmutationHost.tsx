"use client";

import { useCallback, useEffect, useState } from "react";
import { PhaseTransmutation } from "@/components/dashboard/PhaseTransmutation";
import type { PhaseTier } from "@/lib/dashboard-config";
import { resolveLinhagemTransmutationCopy } from "@/lib/fenix-evolution-glossary";
import { usePhoenixVoice } from "@/hooks/usePhoenixVoice";
import { canShowLinhagemTransmutation, writeAcknowledgedLinhagemTier } from "@/lib/linhagem-tier-tracker";
import {
  LINHAGEM_TRANSMUTATION_EVENT,
  type LinhagemTransmutationDetail,
} from "@/lib/linhagem-transmutation-events";
import {
  FENIX_QA_ANIMATION_EVENT,
  type FenixQaAnimationDetail,
} from "@/lib/qa-animation-events";

type LinhagemTransmutationHostProps = {
  userId: string;
  profileName: string;
};

export function LinhagemTransmutationHost({ userId, profileName }: LinhagemTransmutationHostProps) {
  const { igniteVoice, cancelVoice } = usePhoenixVoice();
  const [activeTier, setActiveTier] = useState<PhaseTier | null>(null);

  const dismiss = useCallback(() => {
    if (activeTier === null) return;

    const tier = activeTier;
    writeAcknowledgedLinhagemTier(userId, tier);
    setActiveTier(null);

    window.setTimeout(() => {
      igniteVoice({ tier, fullName: profileName, allowIntroFallback: false });
    }, 480);
  }, [activeTier, igniteVoice, profileName, userId]);

  useEffect(() => {
    const onLinhagem = (event: Event) => {
      const detail = (event as CustomEvent<LinhagemTransmutationDetail>).detail;
      if (!detail || detail.userId !== userId) return;
      if (!canShowLinhagemTransmutation(userId, detail.tier)) return;
      cancelVoice();
      setActiveTier(detail.tier);
    };

    const onQa = (event: Event) => {
      const detail = (event as CustomEvent<FenixQaAnimationDetail>).detail;
      if (!detail) return;
      if (detail.kind === "linhagem-level-up") {
        const tier = Math.min(5, Math.max(1, Math.round(detail.tier ?? 3))) as PhaseTier;
        cancelVoice();
        setActiveTier(tier);
      }
    };

    window.addEventListener(LINHAGEM_TRANSMUTATION_EVENT, onLinhagem);
    window.addEventListener(FENIX_QA_ANIMATION_EVENT, onQa);
    return () => {
      window.removeEventListener(LINHAGEM_TRANSMUTATION_EVENT, onLinhagem);
      window.removeEventListener(FENIX_QA_ANIMATION_EVENT, onQa);
    };
  }, [cancelVoice, userId]);

  if (activeTier === null) return null;

  const copy = resolveLinhagemTransmutationCopy(activeTier);

  return (
    <PhaseTransmutation
      phaseTier={activeTier}
      subline={copy.subline}
      copy={copy.copy}
      ariaLabel="Transmutação da linhagem"
      onDismiss={dismiss}
    />
  );
}
