/**
 * Lembrete da ANYMA para o Espelho do Ciclo.
 * Voz + card só no dia de início (útil) e no último dia do mês (Brasília).
 */

import {
  resolveCycleSelfieCaptureKindToday,
  resolveCycleSelfieMonthKey,
  type CycleSelfieCaptureKind,
} from "@/lib/cycle-selfie-calendar";

export const ANYMA_CYCLE_SELFIE_REMINDER_STORAGE_PREFIX =
  "meccafit:anyma-cycle-selfie-reminder:v1:";

/** Texto falado e exibido no card. Lore FENYXIA, português do Brasil. */
export const ANYMA_CYCLE_SELFIE_REMINDER_SPEECH =
  "[Nome], hoje a forja pede o Espelho do Ciclo. Abra a aba Evolução e tire a foto do ciclo com a mesma pose e a mesma luz. O espelho fica só no seu dispositivo.";

export const ANYMA_CYCLE_SELFIE_REMINDER_TITLE = "Espelho do Ciclo";

export const ANYMA_CYCLE_SELFIE_REMINDER_EYEBROW = "ANYMA FÊNIX";

function storageKey(
  userId: string,
  monthKey: string,
  kind: CycleSelfieCaptureKind,
): string {
  return `${ANYMA_CYCLE_SELFIE_REMINDER_STORAGE_PREFIX}${userId}:${monthKey}:${kind}`;
}

export function resolveCycleSelfieReminderKind(
  referenceDate: Date = new Date(),
): CycleSelfieCaptureKind | null {
  return resolveCycleSelfieCaptureKindToday(referenceDate);
}

export function shouldShowCycleSelfieReminder(
  userId: string,
  referenceDate: Date = new Date(),
): CycleSelfieCaptureKind | null {
  if (typeof window === "undefined" || !userId) return null;

  const kind = resolveCycleSelfieCaptureKindToday(referenceDate);
  if (!kind) return null;

  const monthKey = resolveCycleSelfieMonthKey(referenceDate);
  try {
    if (window.localStorage.getItem(storageKey(userId, monthKey, kind)) === "shown") {
      return null;
    }
  } catch {
    return kind;
  }

  return kind;
}

export function markCycleSelfieReminderShown(
  userId: string,
  kind: CycleSelfieCaptureKind,
  referenceDate: Date = new Date(),
): void {
  if (typeof window === "undefined" || !userId) return;
  const monthKey = resolveCycleSelfieMonthKey(referenceDate);
  try {
    window.localStorage.setItem(storageKey(userId, monthKey, kind), "shown");
  } catch {
    /* quota / private mode */
  }
}
