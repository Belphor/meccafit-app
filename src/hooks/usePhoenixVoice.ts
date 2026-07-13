"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PhaseTier } from "@/lib/dashboard-config";
import {
  DASHBOARD_TAB_CHANGE_EVENT,
  type DashboardTabChangeDetail,
} from "@/lib/dashboard-tab-navigation";
import { formatAnymaSpeech, prepareAnymaSpeechForTts } from "@/lib/anima-speech";
import {
  isAnimaAudioSupported,
  playAnimaTts,
  prefetchAnimaTts,
} from "@/lib/anima-audio-controller";
import { injectName } from "@/lib/profile-display-name";
import { CODIGO_DO_RENASCIMENTO } from "@/lib/phoenix-lore";

export { injectName, injectRegisteredName } from "@/lib/profile-display-name";

/**
 * Specs legadas do SpeechSynthesis (mantidas para tipagem / debug).
 * A voz real usa Edge TTS: pt-BR-AntonioNeural, rate -5%, pitch -10Hz.
 */
export const PHOENYX_VOICE_SPECS = {
  rate: 0.86,
  pitch: 1.04,
  volume: 1,
} as const;

export type PhoenixVoiceState = "idle" | "loading-voices" | "speaking" | "unsupported";

export type IgniteVoiceInput =
  | string
  | {
      text: string;
      fullName: string;
      tier?: PhaseTier;
      isPunished?: boolean;
      /** Mantido por compatibilidade. Card e voz sempre usam Nova Chama como fallback. */
      allowIntroFallback?: boolean;
    }
  | { tier: PhaseTier; fullName: string; isPunished?: boolean; allowIntroFallback?: boolean };

type VoiceModulation = {
  tier?: PhaseTier;
  isPunished?: boolean;
};

export function resolveIgnitePayload(input: IgniteVoiceInput): {
  text: string;
  modulation: VoiceModulation;
} {
  if (typeof input === "string") {
    return {
      text: prepareAnymaSpeechForTts(formatAnymaSpeech(input.trim())),
      modulation: {},
    };
  }

  // Card e voz usam a mesma regra: primeiro nome ou Nova Chama.
  const nameInjector = injectName;

  if ("tier" in input && !("text" in input)) {
    return {
      text: prepareAnymaSpeechForTts(
        formatAnymaSpeech(nameInjector(CODIGO_DO_RENASCIMENTO[input.tier], input.fullName)),
      ),
      modulation: { tier: input.tier, isPunished: input.isPunished },
    };
  }

  if ("text" in input) {
    return {
      text: prepareAnymaSpeechForTts(
        formatAnymaSpeech(nameInjector(input.text, input.fullName)),
      ),
      modulation: {
        tier: input.tier,
        isPunished: input.isPunished,
      },
    };
  }

  return { text: "", modulation: {} };
}

/** Label estável para QA / painéis — voz Edge Neural Antonio. */
export function getResolvedPhoenixVoiceLabel(): string | null {
  if (!isAnimaAudioSupported()) return null;
  return "pt-BR-AntonioNeural (Edge TTS)";
}

/**
 * Hook de voz da ANYMA FÊNIX.
 * Sintetiza via `/api/anima/tts` (edge-tts) e expõe `amplitude` para IRIS/magma.
 * Use `prepareVoice` para pré-aquecer o áudio antes do card aparecer.
 */
export function usePhoenixVoice() {
  const [state, setState] = useState<PhoenixVoiceState>(() =>
    isAnimaAudioSupported() ? "idle" : "unsupported",
  );
  const [amplitude, setAmplitude] = useState(0);

  const pendingTokenRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);
  const stopPlaybackRef = useRef<(() => void) | null>(null);
  const cancelVoiceRef = useRef<(() => void) | null>(null);

  const isSupported = state !== "unsupported";
  const isPriming = state === "loading-voices";
  const isSpeaking = state === "speaking";

  const cancelVoice = useCallback(() => {
    pendingTokenRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    stopPlaybackRef.current?.();
    stopPlaybackRef.current = null;
    setAmplitude(0);
    setState(isAnimaAudioSupported() ? "idle" : "unsupported");
  }, []);

  useEffect(() => {
    cancelVoiceRef.current = cancelVoice;
  }, [cancelVoice]);

  /** Pré-síntese em paralelo ao alinhamento do tour/card. */
  const prepareVoice = useCallback((input: IgniteVoiceInput) => {
    if (!isAnimaAudioSupported()) return;

    const { text } = resolveIgnitePayload(input);
    const trimmed = text.trim();
    if (!trimmed) return;

    prefetchAbortRef.current?.abort();
    const abort = new AbortController();
    prefetchAbortRef.current = abort;
    prefetchAnimaTts(trimmed, abort.signal);
  }, []);

  const igniteVoice = useCallback((input: IgniteVoiceInput) => {
    if (!isAnimaAudioSupported()) {
      setState("unsupported");
      return;
    }

    const { text } = resolveIgnitePayload(input);
    const trimmed = text.trim();
    if (!trimmed) return;

    // Cancela síntese/reprodução anterior (mantém prefetch do mesmo texto).
    pendingTokenRef.current += 1;
    const token = pendingTokenRef.current;
    abortRef.current?.abort();
    stopPlaybackRef.current?.();
    stopPlaybackRef.current = null;

    const abort = new AbortController();
    abortRef.current = abort;
    setAmplitude(0);
    setState("loading-voices");

    void (async () => {
      try {
        const playback = await playAnimaTts(trimmed, {
          signal: abort.signal,
          onSpeaking: () => {
            if (pendingTokenRef.current !== token) return;
            setState("speaking");
          },
          onAmplitude: (value) => {
            if (pendingTokenRef.current !== token) return;
            setAmplitude(value);
          },
        });

        if (pendingTokenRef.current !== token) {
          playback.stop();
          return;
        }

        stopPlaybackRef.current = playback.stop;
        await playback.ended;

        if (pendingTokenRef.current === token) {
          stopPlaybackRef.current = null;
          abortRef.current = null;
          setAmplitude(0);
          setState("idle");
        }
      } catch {
        if (pendingTokenRef.current !== token) return;
        if (abort.signal.aborted) {
          setAmplitude(0);
          setState("idle");
          return;
        }
        setAmplitude(0);
        setState("idle");
      }
    })();
  }, []);

  useEffect((): (() => void) => {
    const onVisibilityChange = (): void => {
      if (document.visibilityState === "hidden") {
        cancelVoiceRef.current?.();
      }
    };

    const onTabChange = (event: Event): void => {
      const detail = (event as CustomEvent<DashboardTabChangeDetail>).detail;
      if (detail?.preserveVoice) return;
      cancelVoiceRef.current?.();
    };

    const onPopState = (): void => {
      cancelVoiceRef.current?.();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener(DASHBOARD_TAB_CHANGE_EVENT, onTabChange);
    window.addEventListener("popstate", onPopState);

    return (): void => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener(DASHBOARD_TAB_CHANGE_EVENT, onTabChange);
      window.removeEventListener("popstate", onPopState);
      prefetchAbortRef.current?.abort();
      cancelVoiceRef.current?.();
    };
  }, []);

  return {
    igniteVoice,
    prepareVoice,
    cancelVoice,
    isSupported,
    isPriming,
    isSpeaking,
    state,
    /** 0–1 — amplitude da voz para pulso de magma IRIS. */
    amplitude,
  } as const;
}
