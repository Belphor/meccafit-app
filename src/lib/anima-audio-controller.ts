/**
 * Controle HTML5 Audio + AnalyserNode para a voz da ANYMA.
 * Streaming progressivo (MSE) quando suportado + cache em memória para sync imediato.
 */

export type AnimaAudioPlayback = {
  stop: () => void;
  /** Promise que resolve quando a reprodução termina (ou é cancelada). */
  ended: Promise<void>;
};

export type PlayAnimaTtsOptions = {
  signal?: AbortSignal;
  onAmplitude?: (value: number) => void;
  /** Dispara no instante em que o áudio começa de fato a tocar. */
  onSpeaking?: () => void;
  /**
   * Sem Web Audio / Analyser — só HTMLAudioElement.
   * Mais confiável para saudação automática pós-login (autoplay).
   */
  simplePlayback?: boolean;
};

type AnimaAudioAnalyserHandle = {
  getAmplitude: () => number;
  dispose: () => void;
  /** Garante AudioContext running antes de audio.play() — evita NotAllowedError silencioso. */
  ensureRunning: () => Promise<void>;
};

const CACHE_LIMIT = 16;
const audioCache = new Map<string, Blob>();
const inflightPrefetch = new Map<string, Promise<Blob>>();
const TTS_CACHE_BUCKET = "anyma-tts-v1";

const MPEG_MSE_MIME = "audio/mpeg";

function touchCache(key: string, blob: Blob): void {
  audioCache.delete(key);
  audioCache.set(key, blob);
  while (audioCache.size > CACHE_LIMIT) {
    const oldest = audioCache.keys().next().value;
    if (oldest === undefined) break;
    audioCache.delete(oldest);
  }
}

function getCachedBlob(text: string): Blob | undefined {
  const hit = audioCache.get(text);
  if (!hit) return undefined;
  touchCache(text, hit);
  return hit;
}

function ttsCacheRequest(text: string): Request {
  // Chave estável só para Cache Storage (não é URL real de rede).
  return new Request(`https://anyma.local/tts/${encodeURIComponent(text)}`, {
    method: "GET",
  });
}

async function readPersistentTtsBlob(text: string): Promise<Blob | null> {
  if (typeof caches === "undefined") return null;
  try {
    const cache = await caches.open(TTS_CACHE_BUCKET);
    const hit = await cache.match(ttsCacheRequest(text));
    if (!hit) return null;
    const blob = await hit.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

async function writePersistentTtsBlob(text: string, blob: Blob): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(TTS_CACHE_BUCKET);
    await cache.put(
      ttsCacheRequest(text),
      new Response(blob, {
        headers: { "Content-Type": "audio/mpeg", "Cache-Control": "max-age=31536000" },
      }),
    );
  } catch {
    // quota / private mode
  }
}

async function fetchAnimaTtsBlob(text: string, signal?: AbortSignal): Promise<Blob> {
  const cached = getCachedBlob(text);
  if (cached) return cached;

  const inflight = inflightPrefetch.get(text);
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    const persistent = await readPersistentTtsBlob(text);
    if (persistent) {
      touchCache(text, persistent);
      return persistent;
    }

    const response = await fetch("/api/anima/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
      credentials: "same-origin",
      body: JSON.stringify({ text }),
      signal,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(`ANIMA_TTS_HTTP_${response.status}${errBody ? `: ${errBody}` : ""}`);
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error("ANIMA_TTS_EMPTY_AUDIO");
    }

    touchCache(text, blob);
    void writePersistentTtsBlob(text, blob);
    return blob;
  })();

  inflightPrefetch.set(text, request);
  try {
    return await request;
  } finally {
    inflightPrefetch.delete(text);
  }
}

function canUseMpegMediaSource(): boolean {
  if (typeof MediaSource === "undefined") return false;
  try {
    return MediaSource.isTypeSupported(MPEG_MSE_MIME);
  } catch {
    return false;
  }
}

function createAnalyserFromElement(audio: HTMLAudioElement): AnimaAudioAnalyserHandle {
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioCtx) {
    return {
      getAmplitude: () => 0,
      dispose: () => undefined,
      ensureRunning: async () => undefined,
    };
  }

  const ctx = new AudioCtx();
  const source = ctx.createMediaElementSource(audio);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.72;
  source.connect(analyser);
  analyser.connect(ctx.destination);

  const timeDomain = new Uint8Array(analyser.fftSize);

  const getAmplitude = (): number => {
    analyser.getByteTimeDomainData(timeDomain);
    let sum = 0;
    for (let i = 0; i < timeDomain.length; i += 1) {
      const centered = (timeDomain[i]! - 128) / 128;
      sum += centered * centered;
    }
    const rms = Math.sqrt(sum / timeDomain.length);
    return Math.min(1, rms * 2.4);
  };

  const dispose = (): void => {
    try {
      source.disconnect();
      analyser.disconnect();
    } catch {
      // already torn down
    }
    void ctx.close().catch(() => undefined);
  };

  const ensureRunning = async (): Promise<void> => {
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        // autoplay / gesture still required by the browser
      }
    }
  };

  void ensureRunning();

  return { getAmplitude, dispose, ensureRunning };
}

/**
 * Pré-aquece a síntese enquanto o card/tour ainda alinha o alvo.
 * Quando `igniteVoice` dispara, o Blob já pode estar em cache.
 */
export function prefetchAnimaTts(text: string, signal?: AbortSignal): void {
  const trimmed = text.trim();
  if (!trimmed || !isAnimaAudioSupported()) return;
  if (getCachedBlob(trimmed) || inflightPrefetch.has(trimmed)) return;

  void fetchAnimaTtsBlob(trimmed, signal).catch(() => undefined);
}

function waitSourceBufferIdle(sourceBuffer: SourceBuffer): Promise<void> {
  if (!sourceBuffer.updating) return Promise.resolve();
  return new Promise((resolve) => {
    sourceBuffer.addEventListener("updateend", () => resolve(), { once: true });
  });
}

function playFromBlob(blob: Blob, options?: PlayAnimaTtsOptions): AnimaAudioPlayback {
  const signal = options?.signal;
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.preload = "auto";
  audio.volume = 1;
  try {
    audio.setAttribute("playsinline", "true");
  } catch {
    // ignore
  }

  const useSimple = Boolean(options?.simplePlayback) || !options?.onAmplitude;
  const analyser = useSimple
    ? {
        getAmplitude: () => 0,
        dispose: () => undefined,
        ensureRunning: async () => undefined,
      }
    : createAnalyserFromElement(audio);

  let rafId = 0;
  let settled = false;
  let finishPlayback: (() => void) | null = null;
  let speakingNotified = false;

  const notifySpeaking = (): void => {
    if (speakingNotified || settled) return;
    speakingNotified = true;
    options?.onSpeaking?.();
  };

  const tick = (): void => {
    if (settled || !options?.onAmplitude) return;
    options.onAmplitude(analyser.getAmplitude());
    rafId = window.requestAnimationFrame(tick);
  };

  const cleanup = (): void => {
    window.cancelAnimationFrame(rafId);
    if (options?.onAmplitude) options.onAmplitude(0);
    analyser.dispose();
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    URL.revokeObjectURL(url);
  };

  const ended = new Promise<void>((resolve) => {
    const finish = (): void => {
      if (settled) return;
      settled = true;
      if (signal) signal.removeEventListener("abort", onAbort);
      cleanup();
      resolve();
    };

    const onAbort = (): void => finish();
    finishPlayback = finish;

    audio.onended = finish;
    audio.onerror = finish;
    audio.onplaying = notifySpeaking;

    if (signal) {
      if (signal.aborted) {
        finish();
        return;
      }
      signal.addEventListener("abort", onAbort);
    }

    void (async () => {
      try {
        await analyser.ensureRunning();
        if (settled || signal?.aborted) {
          finish();
          return;
        }
        await audio.play();
        notifySpeaking();
        if (!settled && !useSimple && options?.onAmplitude) {
          rafId = window.requestAnimationFrame(tick);
        }
      } catch {
        finish();
      }
    })();
  });

  return {
    stop: () => {
      finishPlayback?.();
    },
    ended,
  };
}

function playFromMediaSource(
  response: Response,
  text: string,
  options?: PlayAnimaTtsOptions,
): AnimaAudioPlayback {
  const signal = options?.signal;
  const mediaSource = new MediaSource();
  const url = URL.createObjectURL(mediaSource);
  const audio = new Audio(url);
  audio.preload = "auto";

  const analyser = options?.onAmplitude
    ? createAnalyserFromElement(audio)
    : {
        getAmplitude: () => 0,
        dispose: () => undefined,
        ensureRunning: async () => undefined,
      };
  let rafId = 0;
  let settled = false;
  let finishPlayback: (() => void) | null = null;
  let speakingNotified = false;
  const collected: Uint8Array[] = [];

  const notifySpeaking = (): void => {
    if (speakingNotified || settled) return;
    speakingNotified = true;
    options?.onSpeaking?.();
  };

  const tick = (): void => {
    if (settled || !options?.onAmplitude) return;
    options.onAmplitude(analyser.getAmplitude());
    rafId = window.requestAnimationFrame(tick);
  };

  const cleanup = (): void => {
    window.cancelAnimationFrame(rafId);
    if (options?.onAmplitude) options.onAmplitude(0);
    analyser.dispose();
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    URL.revokeObjectURL(url);
  };

  const ended = new Promise<void>((resolve) => {
    const finish = (): void => {
      if (settled) return;
      settled = true;
      if (signal) signal.removeEventListener("abort", onAbort);
      cleanup();
      resolve();
    };

    const onAbort = (): void => finish();
    finishPlayback = finish;

    audio.onended = finish;
    audio.onerror = finish;
    audio.onplaying = notifySpeaking;

    if (signal) {
      if (signal.aborted) {
        finish();
        return;
      }
      signal.addEventListener("abort", onAbort);
    }

    const onSourceOpen = (): void => {
      void (async () => {
        try {
          const sourceBuffer = mediaSource.addSourceBuffer(MPEG_MSE_MIME);
          const reader = response.body?.getReader();
          if (!reader) {
            finish();
            return;
          }

          let started = false;

          while (true) {
            if (settled || signal?.aborted) {
              await reader.cancel().catch(() => undefined);
              break;
            }

            const { done, value } = await reader.read();
            if (done) break;
            if (!value?.byteLength) continue;

            collected.push(value);
            await waitSourceBufferIdle(sourceBuffer);
            if (settled || mediaSource.readyState !== "open") break;
            sourceBuffer.appendBuffer(value);

            if (!started) {
              started = true;
              void audio.play().then(
                () => {
                  notifySpeaking();
                  if (!settled && options?.onAmplitude) {
                    rafId = window.requestAnimationFrame(tick);
                  }
                },
                () => finish(),
              );
            }
          }

          await waitSourceBufferIdle(sourceBuffer);
          if (mediaSource.readyState === "open") {
            mediaSource.endOfStream();
          }

          // Popula cache com o MP3 completo para replays instantâneos.
          if (collected.length > 0 && !signal?.aborted) {
            let total = 0;
            for (const part of collected) total += part.byteLength;
            const merged = new Uint8Array(total);
            let offset = 0;
            for (const part of collected) {
              merged.set(part, offset);
              offset += part.byteLength;
            }
            touchCache(
              text,
              new Blob([Uint8Array.from(merged)], { type: MPEG_MSE_MIME }),
            );
          }
        } catch {
          finish();
        }
      })();
    };

    mediaSource.addEventListener("sourceopen", onSourceOpen, { once: true });
  });

  return {
    stop: () => {
      finishPlayback?.();
    },
    ended,
  };
}

/**
 * Busca MP3 em `/api/anima/tts` (cache → MSE progressivo → blob) e reproduz.
 */
export async function playAnimaTts(
  text: string,
  options?: PlayAnimaTtsOptions,
): Promise<AnimaAudioPlayback> {
  const trimmed = text.trim();
  const signal = options?.signal;

  const cached = getCachedBlob(trimmed);
  if (cached) {
    return playFromBlob(cached, options);
  }

  const inflight = inflightPrefetch.get(trimmed);
  if (inflight) {
    const blob = await inflight;
    if (signal?.aborted) {
      return {
        stop: () => undefined,
        ended: Promise.resolve(),
      };
    }
    return playFromBlob(blob, options);
  }

  // Saudação automática: blob simples, sem MSE/WebAudio — autoplay mais estável.
  if (options?.simplePlayback) {
    const blob = await fetchAnimaTtsBlob(trimmed, signal);
    return playFromBlob(blob, options);
  }

  // Sem cache: stream progressivo via MSE quando o browser permitir.
  if (canUseMpegMediaSource()) {
    const response = await fetch("/api/anima/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
      credentials: "same-origin",
      body: JSON.stringify({ text: trimmed }),
      signal,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(`ANIMA_TTS_HTTP_${response.status}${errBody ? `: ${errBody}` : ""}`);
    }

    if (response.body) {
      return playFromMediaSource(response, trimmed, options);
    }
  }

  const blob = await fetchAnimaTtsBlob(trimmed, signal);
  return playFromBlob(blob, options);
}

export function isAnimaAudioSupported(): boolean {
  return typeof window !== "undefined" && typeof Audio !== "undefined" && typeof fetch === "function";
}

/**
 * Desbloqueia HTMLAudioElement no gesto do usuário (login / toque).
 * Sem isso, a saudação automática pós-redirect costuma falhar em silêncio.
 */
export function unlockAnimaAudioPlayback(): void {
  if (!isAnimaAudioSupported()) return;

  try {
    const silent = new Audio(
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=",
    );
    silent.volume = 0.01;
    void silent.play().then(
      () => {
        silent.pause();
        silent.removeAttribute("src");
        silent.load();
      },
      () => undefined,
    );
  } catch {
    // private mode / unsupported
  }

  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    void ctx.resume().then(() => {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      window.setTimeout(() => {
        void ctx.close().catch(() => undefined);
      }, 80);
    });
  } catch {
    // unsupported
  }
}
