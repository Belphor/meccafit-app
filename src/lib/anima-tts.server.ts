import { Communicate } from "edge-tts-universal";

/** Voz masculina pt-BR profunda — ANYMA / Fênix. */
export const ANIMA_TTS_VOICE = "pt-BR-AntonioNeural" as const;
export const ANIMA_TTS_RATE = "-5%" as const;
export const ANIMA_TTS_PITCH = "-10Hz" as const;

/** Limite seguro por request (protocolo Edge TTS). */
export const ANIMA_TTS_MAX_CHARS = 2_500;

export type AnimaTtsChunk = {
  type: "audio" | "WordBoundary" | string;
  data?: Uint8Array;
};

/**
 * Sintetiza fala via Microsoft Edge TTS (zero-cost, sem API key).
 * Yield de chunks MP3 assim que o Edge entrega — para streaming HTTP.
 */
export async function* streamAnimaTts(text: string): AsyncGenerator<Uint8Array, void, undefined> {
  const communicate = new Communicate(text, {
    voice: ANIMA_TTS_VOICE,
    rate: ANIMA_TTS_RATE,
    pitch: ANIMA_TTS_PITCH,
  });

  for await (const chunk of communicate.stream() as AsyncIterable<AnimaTtsChunk>) {
    if (chunk.type === "audio" && chunk.data && chunk.data.byteLength > 0) {
      yield chunk.data;
    }
  }
}

/** Concatena o stream em um único buffer MP3. */
export async function synthesizeAnimaTts(text: string): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  let total = 0;

  for await (const part of streamAnimaTts(text)) {
    parts.push(part);
    total += part.byteLength;
  }

  if (total === 0) {
    throw new Error("NO_AUDIO_RECEIVED");
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.byteLength;
  }
  return merged;
}

/** ReadableStream HTTP a partir do gerador Edge TTS. */
export function createAnimaTtsReadableStream(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let yielded = false;
        for await (const chunk of streamAnimaTts(text)) {
          yielded = true;
          controller.enqueue(chunk);
        }
        if (!yielded) {
          controller.error(new Error("NO_AUDIO_RECEIVED"));
          return;
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
