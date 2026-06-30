"use client";

import { useCallback, useEffect, useRef } from "react";
import type { PhaseTier } from "@/lib/dashboard-config";
import {
  evaluateLinhagemTierTransition,
  canShowLinhagemTransmutation,
  writeAcknowledgedLinhagemTier,
} from "@/lib/linhagem-tier-tracker";
import { dispatchLinhagemTransmutation } from "@/lib/linhagem-transmutation-events";

type EvolutionLinhagemLevelUpProps = {
  userId: string;
  phaseTier: PhaseTier;
  /** Só avalia após payload muscular estável (evita falso positivo ao abrir a aba). */
  dataReady?: boolean;
};

/** Dispara transmutação apenas quando a fase sobe de fato nesta sessão. */
export function EvolutionLinhagemLevelUp({
  userId,
  phaseTier,
  dataReady = false,
}: EvolutionLinhagemLevelUpProps) {
  const lastCelebratedRef = useRef<PhaseTier | null>(null);

  const triggerTransmutation = useCallback(
    (tier: PhaseTier) => {
      if (lastCelebratedRef.current === tier) return;
      lastCelebratedRef.current = tier;
      dispatchLinhagemTransmutation({ tier, userId });
    },
    [userId],
  );

  useEffect(() => {
    if (!dataReady) return;

    const tier = Math.min(5, Math.max(1, Math.round(phaseTier))) as PhaseTier;
    const transition = evaluateLinhagemTierTransition(userId, tier, true);
    if (transition !== "celebrate") return;
    if (!canShowLinhagemTransmutation(userId, tier)) return;
    if (tier <= (lastCelebratedRef.current ?? 0)) return;

    triggerTransmutation(tier);
  }, [dataReady, phaseTier, triggerTransmutation, userId]);

  return null;
}

export function acknowledgeLinhagemTransmutationDismiss(userId: string, tier: PhaseTier): void {
  writeAcknowledgedLinhagemTier(userId, tier);
}
