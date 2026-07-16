"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PhaseTransmutation } from "@/components/dashboard/PhaseTransmutation";
import type { PhaseTier } from "@/lib/dashboard-config";
import {
  resolveLinhagemTransmutationCopy,
  resolveTierLore,
} from "@/lib/fenix-evolution-glossary";
import { usePhoenixVoice } from "@/hooks/usePhoenixVoice";
import { canShowLinhagemTransmutation, writeAcknowledgedLinhagemTier } from "@/lib/linhagem-tier-tracker";
import {
  LINHAGEM_TRANSMUTATION_EVENT,
  type LinhagemTransmutationDetail,
} from "@/lib/linhagem-transmutation-events";
import {
  markLinhagemTransmutationEnd,
  markLinhagemTransmutationStart,
} from "@/lib/linhagem-transmutation-coordinator";

type LinhagemTransmutationHostProps = {
  userId: string;
  profileName: string;
};

export function LinhagemTransmutationHost({ userId, profileName }: LinhagemTransmutationHostProps) {
  const { igniteVoice, cancelVoice, isSupported } = usePhoenixVoice();
  const [activeTier, setActiveTier] = useState<PhaseTier | null>(null);
  /** A narração da ANYMA terminou (ou falhou/foi cancelada) para o ritual atual. */
  const [voiceSettled, setVoiceSettled] = useState(false);
  const voiceTokenRef = useRef(0);

  /**
   * Abre a transmutação e, no mesmo instante, faz a ANYMA FÊNIX narrar o Código do
   * Renascimento da nova era. A voz e o texto na tela usam a mesma fonte, então o que
   * a atleta ouve é exatamente o que ela lê durante o ritual. O card permanece até a
   * ANYMA concluir a fala (o fade só começa quando a voz termina).
   */
  const beginTransmutation = useCallback(
    (tier: PhaseTier) => {
      cancelVoice();
      const token = voiceTokenRef.current + 1;
      voiceTokenRef.current = token;
      setVoiceSettled(false);
      setActiveTier(tier);
      markLinhagemTransmutationStart();
      void igniteVoice({ tier, fullName: profileName, allowIntroFallback: false }).finally(() => {
        if (voiceTokenRef.current === token) {
          setVoiceSettled(true);
        }
      });
    },
    [cancelVoice, igniteVoice, profileName],
  );

  const dismiss = useCallback(() => {
    if (activeTier === null) return;
    // Encerra a narração (caso a atleta pule) e reconhece a era para não repetir o ritual.
    voiceTokenRef.current += 1;
    cancelVoice();
    writeAcknowledgedLinhagemTier(userId, activeTier);
    setActiveTier(null);
    setVoiceSettled(false);
    // Libera o direcionamento ao mural que ficou aguardando o fim da transmutação.
    markLinhagemTransmutationEnd();
  }, [activeTier, cancelVoice, userId]);

  useEffect(() => {
    const onLinhagem = (event: Event) => {
      const detail = (event as CustomEvent<LinhagemTransmutationDetail>).detail;
      if (!detail || detail.userId !== userId) return;
      if (!canShowLinhagemTransmutation(userId, detail.tier)) return;
      beginTransmutation(detail.tier);
    };

    window.addEventListener(LINHAGEM_TRANSMUTATION_EVENT, onLinhagem);
    return () => {
      window.removeEventListener(LINHAGEM_TRANSMUTATION_EVENT, onLinhagem);
    };
  }, [beginTransmutation, userId]);

  if (activeTier === null) return null;

  const copy = resolveLinhagemTransmutationCopy(activeTier);
  const animaSpeech = resolveTierLore(activeTier, profileName);

  return (
    <PhaseTransmutation
      phaseTier={activeTier}
      subline={copy.subline}
      copy={copy.copy}
      animaSpeech={animaSpeech}
      ariaLabel="Transmutação da linhagem"
      holdForVoice={isSupported}
      voiceSettled={voiceSettled}
      onDismiss={dismiss}
    />
  );
}
