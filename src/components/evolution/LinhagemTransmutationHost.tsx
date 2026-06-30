"use client";

import { useCallback, useEffect, useState } from "react";
import { PhaseTransmutation } from "@/components/dashboard/PhaseTransmutation";
import type { PhaseTier } from "@/lib/dashboard-config";
import { resolveLinhagemTransmutationCopy } from "@/lib/fenix-evolution-glossary";
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
};

export function LinhagemTransmutationHost({ userId }: LinhagemTransmutationHostProps) {
  const [activeTier, setActiveTier] = useState<PhaseTier | null>(null);

  const dismiss = useCallback(() => {
    if (activeTier !== null) {
      writeAcknowledgedLinhagemTier(userId, activeTier);
    }
    setActiveTier(null);
  }, [activeTier, userId]);

  useEffect(() => {
    const onLinhagem = (event: Event) => {
      const detail = (event as CustomEvent<LinhagemTransmutationDetail>).detail;
      if (!detail || detail.userId !== userId) return;
      if (!canShowLinhagemTransmutation(userId, detail.tier)) return;
      setActiveTier(detail.tier);
    };

    const onQa = (event: Event) => {
      const detail = (event as CustomEvent<FenixQaAnimationDetail>).detail;
      if (!detail) return;
      if (detail.kind === "linhagem-level-up") {
        const tier = Math.min(5, Math.max(1, Math.round(detail.tier ?? 3))) as PhaseTier;
        setActiveTier(tier);
      }
    };

    window.addEventListener(LINHAGEM_TRANSMUTATION_EVENT, onLinhagem);
    window.addEventListener(FENIX_QA_ANIMATION_EVENT, onQa);
    return () => {
      window.removeEventListener(LINHAGEM_TRANSMUTATION_EVENT, onLinhagem);
      window.removeEventListener(FENIX_QA_ANIMATION_EVENT, onQa);
    };
  }, [userId]);

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
