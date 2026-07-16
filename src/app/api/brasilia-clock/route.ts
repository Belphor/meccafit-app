import { NextResponse } from "next/server";
import {
  getBrasiliaDateParts,
  resolveBrasiliaTrainingWeekdayIndex,
} from "@/lib/brasilia-time";
import { resolveTreinoDayKey } from "@/lib/treino-day-key";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Relógio civil autoritativo (servidor → Brasília/SP).
 * O cliente não deve confiar no relógio do aparelho para liberar VTC.
 */
export async function GET() {
  const now = new Date();
  const parts = getBrasiliaDateParts(now);
  const dayKey = resolveTreinoDayKey(now);
  const weekdayIndex = resolveBrasiliaTrainingWeekdayIndex(now);

  return NextResponse.json(
    {
      iso: now.toISOString(),
      dayKey,
      weekdayIndex,
      year: parts.year,
      month: parts.month,
      day: parts.day,
      timezone: "America/Sao_Paulo",
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
