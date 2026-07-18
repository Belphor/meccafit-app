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
import { suppressReturningLoginGreeting } from "@/lib/anyma-returning-greeting";
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
      /** Playback sem Web Audio — saudação automática pós-login. */
      simplePlayback?: boolean;
    }
  | { tier: PhaseTier; fullName: string; isPunished?: boolean; allowIntroFallback?: boolean };

type VoiceModulation = {
  tier?: PhaseTier;
  isPunished?: boolean;
  simplePlayback?: boolean;
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
        simplePlayback: input.simplePlayback,
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
 * Sintetiza via `/api/anima/tts` (edge-tts). Amplitude fica em ref (sem re-render).
 * Use `prepareVoice` para pré-aquecer o áudio antes do card aparecer.
 */
export function usePhoenixVoice() {
  const [state, setState] = useState<PhoenixVoiceState>(() =>
    isAnimaAudioSupported() ? "idle" : "unsupported",
  );
  /** Ref (não state): amplitude a 60fps não pode re-renderizar o HUD/canvas da ANYMA. */
  const amplitudeRef = useRef(0);

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
    amplitudeRef.current = 0;
    setState(isAnimaAudioSupported() ? "idle" : "unsupported");
  }, []);

  useEffect(() => {
    cancelVoiceRef.current = cancelVoice;
  }, [cancelVoice]);

  /** Pré-síntese em paralelo (não cancela os demais beats). */
  const prepareVoice = useCallback((input: IgniteVoiceInput) => {
    if (!isAnimaAudioSupported()) return;

    const { text } = resolveIgnitePayload(input);
    const trimmed = text.trim();
    if (!trimmed) return;

    prefetchAnimaTts(trimmed);
  }, []);

  const igniteVoice = useCallback((input: IgniteVoiceInput): Promise<void> => {
    if (!isAnimaAudioSupported()) {
      setState("unsupported");
      return Promise.resolve();
    }

    const { text } = resolveIgnitePayload(input);
    const trimmed = text.trim();
    if (!trimmed) return Promise.resolve();

    // Cancela síntese/reprodução anterior (mantém prefetch do mesmo texto).
    pendingTokenRef.current += 1;
    const token = pendingTokenRef.current;
    abortRef.current?.abort();
    stopPlaybackRef.current?.();
    stopPlaybackRef.current = null;

    // Não deixa "Bem-vindo" sobrepor Juramento, guia ou explicações.
    suppressReturningLoginGreeting();

    const abort = new AbortController();
    abortRef.current = abort;
    amplitudeRef.current = 0;
    setState("loading-voices");

    return (async () => {
      try {
        const playback = await playAnimaTts(trimmed, {
          signal: abort.signal,
          // Sempre HTMLAudio simples: AnalyserNode + AudioContext competem com WebGL/HUD.
          simplePlayback: true,
          onSpeaking: () => {
            if (pendingTokenRef.current !== token) return;
            setState("speaking");
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
          amplitudeRef.current = 0;
          setState("idle");
        }
      } catch {
        if (pendingTokenRef.current !== token) return;
        if (abort.signal.aborted) {
          amplitudeRef.current = 0;
          setState("idle");
          return;
        }
        amplitudeRef.current = 0;
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
      // Intencional: abortar o prefetch MAIS RECENTE no unmount (o ref é mutado ao
      // longo da sessão), não uma cópia capturada no início do efeito.
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
    /** Leitura pontual da amplitude (não reativa — evita travar o React). */
    getAmplitude: () => amplitudeRef.current,
  } as const;
}
