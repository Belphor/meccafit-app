/**
 * Saudação de retorno da ANYMA — player de módulo (fora do React).
 * Uma fala por entrada no Portal. Só no início da sessão (login).
 * Sobrevive a Strict Mode / remount.
 */

import {
  ANYMA_RETURNING_LOGIN_BEATS,
  ANYMA_RETURNING_LOGIN_PAUSE_MS,
} from "@/lib/anyma-copy";
import {
  isAnimaAudioSupported,
  playAnimaTts,
  prefetchAnimaTts,
  unlockAnimaAudioPlayback,
} from "@/lib/anima-audio-controller";
import { formatAnymaSpeech, prepareAnymaSpeechForTts } from "@/lib/anima-speech";
import { injectName } from "@/lib/profile-display-name";
import {
  clearReturningLoginGreetingPending,
  clearReturningLoginGreetingShown,
  markReturningLoginGreetingShown,
  shouldPlayReturningLoginGreeting,
} from "@/lib/phoenix-lore";

type ArmOptions = {
  userId: string;
  profileName: string;
  /** Contagem de entradas no Portal (bump por login). */
  entryCount: number;
  /** Portal já conhecido (pós-1ª visita). */
  portalReady: boolean;
};

type ActiveSession = {
  userId: string;
  profileName: string;
  entryCount: number;
};

let active: ActiveSession | null = null;
let playing = false;
let autoTimerA: number | null = null;
let autoTimerB: number | null = null;
let autoTimerC: number | null = null;
let stopPlayback: (() => void) | null = null;

function resolveBeatTts(beat: string, profileName: string): string {
  return prepareAnymaSpeechForTts(formatAnymaSpeech(injectName(beat, profileName)));
}

function clearAutoTimers(): void {
  if (autoTimerA !== null) {
    window.clearTimeout(autoTimerA);
    autoTimerA = null;
  }
  if (autoTimerB !== null) {
    window.clearTimeout(autoTimerB);
    autoTimerB = null;
  }
  if (autoTimerC !== null) {
    window.clearTimeout(autoTimerC);
    autoTimerC = null;
  }
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function canPlayActive(): boolean {
  if (!active) return false;
  return shouldPlayReturningLoginGreeting(
    active.userId,
    true,
    active.entryCount,
  );
}

export function prefetchReturningLoginGreeting(profileName: string): void {
  if (!isAnimaAudioSupported()) return;
  for (const beat of ANYMA_RETURNING_LOGIN_BEATS) {
    prefetchAnimaTts(resolveBeatTts(beat, profileName));
  }
}

async function playBeat(text: string): Promise<boolean> {
  let spoke = false;

  const playback = await playAnimaTts(text, {
    simplePlayback: true,
    onSpeaking: () => {
      spoke = true;
    },
  });

  stopPlayback = playback.stop;
  await playback.ended;
  stopPlayback = null;
  return spoke;
}

async function runSequence(session: ActiveSession): Promise<boolean> {
  let anySpoke = false;

  for (let index = 0; index < ANYMA_RETURNING_LOGIN_BEATS.length; index += 1) {
    if (
      !active ||
      active.userId !== session.userId ||
      active.entryCount !== session.entryCount
    ) {
      return false;
    }

    const beat = ANYMA_RETURNING_LOGIN_BEATS[index]!;
    // Nome vivo (selo/perfil pode chegar depois do arm).
    const text = resolveBeatTts(beat, active.profileName);
    const spoke = await playBeat(text);
    if (spoke) anySpoke = true;

    // Autoplay bloqueado no 1º beat — espera toque na esfera, sem marcar esta entrada.
    if (index === 0 && !spoke) return false;

    if (index < ANYMA_RETURNING_LOGIN_BEATS.length - 1) {
      await sleepMs(ANYMA_RETURNING_LOGIN_PAUSE_MS);
    }
  }

  return anySpoke;
}

async function tryPlay(): Promise<void> {
  if (!active || playing) return;
  if (!canPlayActive()) return;
  if (!isAnimaAudioSupported()) return;

  playing = true;
  const session = { ...active };
  unlockAnimaAudioPlayback();
  prefetchReturningLoginGreeting(session.profileName);

  try {
    const ok = await runSequence(session);
    if (
      ok &&
      active?.userId === session.userId &&
      active.entryCount === session.entryCount
    ) {
      markReturningLoginGreetingShown(session.userId, session.entryCount);
      clearReturningLoginGreetingPending(session.userId);
      clearAutoTimers();
    }
  } finally {
    playing = false;
  }
}

function scheduleAutoPlay(): void {
  clearAutoTimers();
  autoTimerA = window.setTimeout(() => {
    void tryPlay();
  }, 500);
  autoTimerB = window.setTimeout(() => {
    void tryPlay();
  }, 1800);
  autoTimerC = window.setTimeout(() => {
    void tryPlay();
  }, 4000);
}

/**
 * Arma a saudação para esta entrada no Portal — só no início do login.
 * Cada `entryCount` novo libera uma nova fala (logout/login na mesma aba incluso).
 */
export function armReturningLoginGreeting(options: ArmOptions): void {
  if (typeof window === "undefined") return;
  if (!options.portalReady || options.entryCount < 1) return;

  const isNewEntry =
    !active ||
    active.userId !== options.userId ||
    active.entryCount !== options.entryCount;

  active = {
    userId: options.userId,
    profileName: options.profileName,
    entryCount: options.entryCount,
  };

  if (!shouldPlayReturningLoginGreeting(
    options.userId,
    true,
    options.entryCount,
  )) {
    return;
  }

  prefetchReturningLoginGreeting(options.profileName);

  if (isNewEntry) {
    // Nova sessão/entrada: libera tentativa mesmo se um play antigo ficou travado.
    if (playing) {
      stopPlayback?.();
      stopPlayback = null;
      playing = false;
    }
    scheduleAutoPlay();
  } else if (!playing) {
    scheduleAutoPlay();
  }
}

/** Toque na esfera — retorna true se ainda há saudação pendente nesta entrada. */
export function triggerReturningLoginGreeting(): boolean {
  if (!active || !canPlayActive()) return false;
  unlockAnimaAudioPlayback();
  void tryPlay();
  return true;
}

/**
 * Cancela "Bem-vindo" pendente/em curso e marca a entrada como consumida.
 * Usar quando outra fala da ANYMA começa (explicações, guia, tour).
 */
export function suppressReturningLoginGreeting(): void {
  clearAutoTimers();
  stopPlayback?.();
  stopPlayback = null;
  playing = false;
  if (active) {
    markReturningLoginGreetingShown(active.userId, active.entryCount);
    clearReturningLoginGreetingPending(active.userId);
  }
  active = null;
}

/** Atualiza o nome nos beats pré-aquecidos (ex.: após selar identidade). */
export function refreshReturningLoginGreetingName(profileName: string): void {
  if (!active) return;
  active = { ...active, profileName };
  prefetchReturningLoginGreeting(profileName);
}

/** Logout / troca de conta — limpa estado e permite a próxima sessão falar. */
export function stopReturningLoginGreeting(userId?: string): void {
  clearAutoTimers();
  stopPlayback?.();
  stopPlayback = null;
  playing = false;
  if (userId) {
    clearReturningLoginGreetingShown(userId);
    clearReturningLoginGreetingPending(userId);
  } else if (active) {
    clearReturningLoginGreetingShown(active.userId);
    clearReturningLoginGreetingPending(active.userId);
  }
  active = null;
}
