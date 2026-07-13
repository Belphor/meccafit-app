import { NextResponse } from "next/server";
import {
  ANIMA_TTS_MAX_CHARS,
  createAnimaTtsReadableStream,
} from "@/lib/anima-tts.server";
import { resolveAuthedSupabase } from "@/lib/supabase-server";

/** WebSocket Edge TTS exige runtime Node (headers customizados). */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TtsBody = {
  text?: unknown;
};

function parseText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const text = (payload as TtsBody).text;
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  return trimmed;
}

export async function POST(request: Request) {
  const auth = await resolveAuthedSupabase(request);
  if (!auth) {
    return NextResponse.json({ error: "SESSION_REQUIRED" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const text = parseText(payload);
  if (!text) {
    return NextResponse.json(
      { error: "INVALID_TEXT", message: "Informe 'text' não vazio." },
      { status: 400 },
    );
  }

  if (text.length > ANIMA_TTS_MAX_CHARS) {
    return NextResponse.json(
      {
        error: "TEXT_TOO_LONG",
        message: `Máximo de ${ANIMA_TTS_MAX_CHARS} caracteres por síntese.`,
      },
      { status: 413 },
    );
  }

  try {
    const stream = createAnimaTtsReadableStream(text);

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        // Ajuda proxies a não bufferizar o corpo inteiro.
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TTS_FAILED";
    console.error("[anima/tts]", message);
    return NextResponse.json(
      { error: "TTS_FAILED", message: "Falha ao sintetizar a voz da ANYMA." },
      { status: 502 },
    );
  }
}
