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
  const { igniteVoice, prepareVoice, cancelVoice, isSupported, isSpeaking } = usePhoenixVoice();
  const [activeTier, setActiveTier] = useState<PhaseTier | null>(null);
  /** A narração da ANYMA terminou (ou falhou/foi cancelada) para o ritual atual. */
  const [voiceSettled, setVoiceSettled] = useState(false);
  const voiceTokenRef = useRef(0);
  const voiceArmedRef = useRef(false);

  /**
   * Abre a transmutação e pré-aquece o TTS. Voz e texto disparam no mount do ritual
   * (`onReadyForVoice`), para a frase nascer no mesmo instante da narração.
   */
  const beginTransmutation = useCallback(
    (tier: PhaseTier) => {
      cancelVoice();
      voiceTokenRef.current += 1;
      voiceArmedRef.current = false;
      setVoiceSettled(false);
      setActiveTier(tier);
      markLinhagemTransmutationStart();
      if (isSupported) {
        prepareVoice({ tier, fullName: profileName, allowIntroFallback: false });
      } else {
        setVoiceSettled(true);
      }
    },
    [cancelVoice, isSupported, prepareVoice, profileName],
  );

  const handleReadyForVoice = useCallback(() => {
    if (activeTier === null) return;
    if (voiceArmedRef.current) return;
    voiceArmedRef.current = true;

    if (!isSupported) {
      setVoiceSettled(true);
      return;
    }

    const token = voiceTokenRef.current;
    void igniteVoice({
      tier: activeTier,
      fullName: profileName,
      allowIntroFallback: false,
    }).finally(() => {
      if (voiceTokenRef.current === token) {
        setVoiceSettled(true);
      }
    });
  }, [activeTier, igniteVoice, isSupported, profileName]);

  const dismiss = useCallback(() => {
    if (activeTier === null) return;
    // Encerra a narração (caso a atleta pule) e reconhece a era para não repetir o ritual.
    voiceTokenRef.current += 1;
    voiceArmedRef.current = false;
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
      voiceStarted={isSpeaking}
      onReadyForVoice={handleReadyForVoice}
      onDismiss={dismiss}
    />
  );
}
