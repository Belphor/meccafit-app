/** Fuso civil único do app · alinhado ao backend (workout_split_lane · evolução). */
export const TREINO_DAY_TIMEZONE = "America/Sao_Paulo" as const;

/** Alias explícito — treino, cardio e altar usam o mesmo dia civil. */
export const APP_DAY_TIMEZONE = TREINO_DAY_TIMEZONE;

export function resolveTreinoDayKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TREINO_DAY_TIMEZONE }).format(now);
}

export function isTimestampOnTreinoDay(
  iso: string | null | undefined,
  dayKey: string = resolveTreinoDayKey(),
): boolean {
  if (!iso) return false;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return false;
  return resolveTreinoDayKey(parsed) === dayKey;
}

export const resolveAppDayKey = resolveTreinoDayKey;
