/**
 * Espelho do Ciclo · calendário civil de Brasília (America/Sao_Paulo).
 * Slots: início (1º dia útil seg–sex) e último dia do mês.
 */

import {
  BRASILIA_TIME_ZONE,
  brasiliaDateInputToIso,
  getBrasiliaDateParts,
} from "@/lib/brasilia-time";

export type CycleSelfieSlot = 1 | 30;

export type CycleSelfieCaptureKind = "start" | "end";

/** Quantidade de dias do mês civil em Brasília. */
export function resolveDaysInMonthBrasilia(
  year: number,
  month: number,
): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Dia civil do início do espelho.
 * Se o dia 1 cair no fim de semana, usa o primeiro dia útil (segunda a sexta).
 * Ex.: dia 1 domingo → dia 2. Dia 1 sábado → dia 3.
 */
export function resolveCycleSelfieStartDay(
  year: number,
  month: number,
): number {
  const iso = brasiliaDateInputToIso(
    `${year}-${String(month).padStart(2, "0")}-01`,
  );
  const { weekday } = getBrasiliaDateParts(new Date(iso));
  if (weekday === 0) return 2;
  if (weekday === 6) return 3;
  return 1;
}

/** Último dia civil do mês em Brasília (28, 29, 30 ou 31). */
export function resolveCycleSelfieEndDay(year: number, month: number): number {
  return resolveDaysInMonthBrasilia(year, month);
}

/** Dia civil do mês atual para o slot do espelho. */
export function resolveCycleSelfieCalendarDay(
  slot: CycleSelfieSlot,
  referenceDate: Date = new Date(),
): number {
  const { year, month } = getBrasiliaDateParts(referenceDate);
  if (slot === 1) return resolveCycleSelfieStartDay(year, month);
  return resolveCycleSelfieEndDay(year, month);
}

export function resolveCycleSelfieDayLabel(
  slot: CycleSelfieSlot,
  referenceDate: Date = new Date(),
): string {
  return `Dia ${resolveCycleSelfieCalendarDay(slot, referenceDate)}`;
}

/** Qual captura o calendário de Brasília pede hoje, se houver. */
export function resolveCycleSelfieCaptureKindToday(
  referenceDate: Date = new Date(),
): CycleSelfieCaptureKind | null {
  const { year, month, day } = getBrasiliaDateParts(referenceDate);
  const startDay = resolveCycleSelfieStartDay(year, month);
  const endDay = resolveCycleSelfieEndDay(year, month);
  if (day === startDay) return "start";
  if (day === endDay) return "end";
  return null;
}

export function resolveCycleSelfieMonthKey(
  referenceDate: Date = new Date(),
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BRASILIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  })
    .format(referenceDate)
    .slice(0, 7);
}
