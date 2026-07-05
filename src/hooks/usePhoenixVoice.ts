"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PhaseTier } from "@/lib/dashboard-config";
import { DASHBOARD_TAB_CHANGE_EVENT } from "@/lib/dashboard-tab-navigation";
import { injectName } from "@/lib/profile-display-name";
import { CODIGO_DO_RENASCIMENTO } from "@/lib/phoenix-lore";

export { injectName } from "@/lib/profile-display-name";

export const PHOENYX_VOICE_SPECS = {
  rate: 0.86,
  pitch: 1.04,
  volume: 1,
} as const;

export type PhoenixVoiceState = "idle" | "loading-voices" | "speaking" | "unsupported";

export type IgniteVoiceInput =
  | string
  | { text: string; fullName: string; tier?: PhaseTier; isPunished?: boolean }
  | { tier: PhaseTier; fullName: string; isPunished?: boolean };

type VoiceModulation = {
  tier?: PhaseTier;
  isPunished?: boolean;
};

const PHOENYX_VOICE_LANG = "pt-BR" as const;

let synthesisSingleton: SpeechSynthesis | null = null;
let voicesReady = false;
let cachedPhoenixVoice: SpeechSynthesisVoice | null = null;
const voiceWaiters = new Set<() => void>();

type VoiceMatcher = (voice: SpeechSynthesisVoice) => boolean;

const PHOENIX_VOICE_PRIORITY: readonly VoiceMatcher[] = [
  (voice) => {
    const name = voice.name.toLowerCase();
    const lang = voice.lang.toLowerCase();
    return (
      lang.includes("pt-br") &&
      name.includes("francisca") &&
      (name.includes("neural") || name.includes("natural") || name.includes("online"))
    );
  },
  (voice) => {
    const name = voice.name.toLowerCase();
    const lang = voice.lang.toLowerCase();
    return lang.includes("pt-br") && name.includes("google") && name.includes("maria");
  },
  (voice) => {
    const name = voice.name.toLowerCase();
    const lang = voice.lang.toLowerCase();
    return lang.includes("pt-br") && name.includes("francisca");
  },
  (voice) => {
    const name = voice.name.toLowerCase();
    const lang = voice.lang.toLowerCase();
    return (
      lang.includes("pt-br") && (name.includes("neural") || name.includes("natural"))
    );
  },
];

function getSynthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  if (!synthesisSingleton) {
    synthesisSingleton = window.speechSynthesis;
  }
  return synthesisSingleton;
}

function notifyVoiceWaiters(): void {
  voicesReady = true;
  for (const waiter of voiceWaiters) {
    waiter();
  }
  voiceWaiters.clear();
}

function scorePtBrVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  let score = 0;

  if (lang.includes("pt-br")) score += 6;
  else if (lang === "pt") score += 4;
  else if (lang.includes("pt")) score += 2;

  if (name.includes("francisca")) score += 14;
  if (name.includes("neural")) score += 10;
  if (name.includes("premium")) score += 8;
  if (name.includes("natural")) score += 5;
  if (name.includes("google")) score += 3;
  if (name.includes("microsoft")) score += 2;
  if (name.includes("portuguese") || name.includes("brasil")) score += 1;
  if (voice.localService) score += 1;

  return score;
}

function resolveHighestQualityPtBrVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const ptBrVoices = voices.filter((voice) => voice.lang.toLowerCase().includes("pt-br"));
  const ptVoices = voices.filter((voice) => voice.lang.toLowerCase().includes("pt"));
  const pool = ptBrVoices.length > 0 ? ptBrVoices : ptVoices.length > 0 ? ptVoices : voices;

  return pool.reduce<SpeechSynthesisVoice | null>((best, voice) => {
    if (!best) return voice;
    return scorePtBrVoice(voice) > scorePtBrVoice(best) ? voice : best;
  }, null);
}

function resolvePhoenixVoice(synthesis: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = synthesis.getVoices();
  if (voices.length === 0) return null;

  for (const matcher of PHOENIX_VOICE_PRIORITY) {
    const match = voices.find(matcher);
    if (match) return match;
  }

  return resolveHighestQualityPtBrVoice(voices);
}

export function getResolvedPhoenixVoiceLabel(): string | null {
  const synthesis = getSynthesis();
  if (!synthesis) return null;
  const voice = cachedPhoenixVoice ?? resolvePhoenixVoice(synthesis);
  return voice?.name ?? null;
}

function refreshCachedVoice(): SpeechSynthesisVoice | null {
  const synthesis = getSynthesis();
  if (!synthesis) return null;
  cachedPhoenixVoice = resolvePhoenixVoice(synthesis);
  return cachedPhoenixVoice;
}

function ensureVoicesLoaded(): Promise<void> {
  const synthesis = getSynthesis();
  if (!synthesis) return Promise.resolve();

  const voices = synthesis.getVoices();
  if (voices.length > 0) {
    voicesReady = true;
    refreshCachedVoice();
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const onReady = () => {
      synthesis.removeEventListener("voiceschanged", onReady);
      notifyVoiceWaiters();
      refreshCachedVoice();
      resolve();
    };
    voiceWaiters.add(onReady);
    synthesis.addEventListener("voiceschanged", onReady);
    window.setTimeout(() => {
      if (!voicesReady && synthesis.getVoices().length > 0) {
        synthesis.removeEventListener("voiceschanged", onReady);
        notifyVoiceWaiters();
        refreshCachedVoice();
        resolve();
      }
    }, 400);
  });
}

function resolveModulatedSpecs(modulation: VoiceModulation): { rate: number; pitch: number } {
  let rate = PHOENYX_VOICE_SPECS.rate;
  let pitch = PHOENYX_VOICE_SPECS.pitch;

  if (modulation.isPunished) {
    rate *= 1.02;
    pitch *= 0.92;
  } else if (modulation.tier !== undefined) {
    if (modulation.tier <= 2) {
      pitch *= 0.98;
    } else if (modulation.tier >= 5) {
      rate *= 0.94;
      pitch *= 1.06;
    }
  }

  return { rate, pitch };
}

function applyPhoenixVoiceSpecs(
  utterance: SpeechSynthesisUtterance,
  modulation: VoiceModulation,
): void {
  const specs = resolveModulatedSpecs(modulation);
  utterance.lang = PHOENYX_VOICE_LANG;
  utterance.rate = specs.rate;
  utterance.pitch = specs.pitch;
  utterance.volume = PHOENYX_VOICE_SPECS.volume;
}

function resolveIgnitePayload(input: IgniteVoiceInput): { text: string; modulation: VoiceModulation } {
  if (typeof input === "string") {
    return { text: input.trim(), modulation: {} };
  }

  if ("tier" in input && !("text" in input)) {
    return {
      text: injectName(CODIGO_DO_RENASCIMENTO[input.tier], input.fullName),
      modulation: { tier: input.tier, isPunished: input.isPunished },
    };
  }

  if ("text" in input) {
    return {
      text: injectName(input.text, input.fullName),
      modulation: {
        tier: input.tier,
        isPunished: input.isPunished,
      },
    };
  }

  return { text: "", modulation: {} };
}

export function usePhoenixVoice() {
  const [state, setState] = useState<PhoenixVoiceState>(() =>
    getSynthesis() ? "loading-voices" : "unsupported",
  );
  const pendingRef = useRef<string | null>(null);
  const cancelVoiceRef = useRef<(() => void) | null>(null);

  const isSupported = state !== "unsupported";

  const cancelVoice = useCallback(() => {
    const synthesis = getSynthesis();
    synthesis?.cancel();
    pendingRef.current = null;
    setState(isSupported ? "idle" : "unsupported");
  }, [isSupported]);

  cancelVoiceRef.current = cancelVoice;

  const igniteVoice = useCallback((input: IgniteVoiceInput) => {
    const { text, modulation } = resolveIgnitePayload(input);
    const trimmed = text.trim();
    if (!trimmed) return;

    const synthesis = getSynthesis();
    if (!synthesis) {
      setState("unsupported");
      return;
    }

    window.speechSynthesis.cancel();

    pendingRef.current = trimmed;
    setState("loading-voices");

    void ensureVoicesLoaded().then(() => {
      if (pendingRef.current !== trimmed) return;
      pendingRef.current = null;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(trimmed);
      applyPhoenixVoiceSpecs(utterance, modulation);

      const voice = cachedPhoenixVoice ?? refreshCachedVoice();
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setState("speaking");
      utterance.onend = () => setState("idle");
      utterance.onerror = () => setState("idle");

      synthesis.speak(utterance);
    });
  }, []);

  useEffect((): (() => void) | void => {
    const synthesis = getSynthesis();
    if (!synthesis) {
      setState("unsupported");
      return;
    }

    const onVoicesChanged = (): void => {
      refreshCachedVoice();
      notifyVoiceWaiters();
    };

    synthesis.addEventListener("voiceschanged", onVoicesChanged);

    void ensureVoicesLoaded().then(() => {
      setState((current) => (current === "unsupported" ? current : "idle"));
    });

    return (): void => {
      synthesis.removeEventListener("voiceschanged", onVoicesChanged);
      window.speechSynthesis.cancel();
      pendingRef.current = null;
    };
  }, []);

  useEffect((): (() => void) => {
    const onVisibilityChange = (): void => {
      if (document.visibilityState === "hidden") {
        cancelVoiceRef.current?.();
      }
    };

    const onTabChange = (): void => {
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
    };
  }, []);

  return {
    igniteVoice,
    cancelVoice,
    isSupported,
    state,
  } as const;
}
