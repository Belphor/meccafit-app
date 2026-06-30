/** Ciclo civil de sincronização da meta de treino · fuso America/Sao_Paulo (Brasília) */

import { BRASILIA_TIME_ZONE, getBrasiliaDateParts } from "@/lib/brasilia-time";

export const META_SYNC_TIMEZONE = BRASILIA_TIME_ZONE;

const MONTH_NAMES_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

/** @deprecated Prefer getBrasiliaDateParts — mantido para compatibilidade. */
export function getSaoPauloNow(): Date {
  const { year, month, day } = getBrasiliaDateParts();
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function resolveCurrentMonthKeySp(): string {
  const { year, month } = getBrasiliaDateParts();
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function resolvePreviousMonthKeySp(): string {
  const { year, month } = getBrasiliaDateParts();
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
}

export function resolvePreviousMonthLabelPt(): string {
  return formatMonthLabelPt(resolvePreviousMonthKeySp());
}

export function resolveMonthKeyFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const normalized = iso.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(normalized) ? normalized : null;
}

export function isMetaSyncedForCurrentMonth(metaSyncMes: string | null | undefined): boolean {
  const syncedKey = resolveMonthKeyFromIso(metaSyncMes);
  if (!syncedKey) return false;
  return syncedKey === resolveCurrentMonthKeySp();
}

export function resolveDaysInMonthSp(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export function resolveDaysInCurrentMonthSp(): number {
  const { year, month } = getBrasiliaDateParts();
  return resolveDaysInMonthSp(year, month - 1);
}

function capitalizeMonthPt(name: string): string {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function formatMonthLabelPt(monthKey?: string | null): string {
  const key = monthKey ?? resolveCurrentMonthKeySp();
  const [yearRaw, monthRaw] = key.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11) return key;
  return `${capitalizeMonthPt(MONTH_NAMES_PT[monthIndex])} de ${year}`;
}

function resolveNextMonthPartsSp(): { year: number; month: number } {
  const { year, month } = getBrasiliaDateParts();
  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  return { year: nextYear, month: nextMonth };
}

export function resolveNextMonthStartSp(): Date {
  const { year, month } = resolveNextMonthPartsSp();
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

export function formatCycleResetLabelPt(): string {
  const { year, month } = resolveNextMonthPartsSp();
  const day = 1;
  const monthName = MONTH_NAMES_PT[month - 1];
  return `${day} de ${monthName} de ${year}, 00:00 (horário de Brasília)`;
}

/** Data curta da próxima virada civil (ex.: 1 de julho). */
export function formatNextViradaDateShortPt(): string {
  const { month } = resolveNextMonthPartsSp();
  return `1 de ${MONTH_NAMES_PT[month - 1]}`;
}

export function resolveDaysUntilCycleResetSp(): number {
  const { year, month, day } = getBrasiliaDateParts();
  const daysInMonth = resolveDaysInMonthSp(year, month - 1);
  return Math.max(0, daysInMonth - day);
}

/** Contexto do mês civil (Brasília) · Gravidade Térmica e meta de treino. */
export function resolveMonthContextSp() {
  const { year, month, day } = getBrasiliaDateParts();
  const daysInMonth = resolveDaysInMonthSp(year, month - 1);
  const monthKey = resolveCurrentMonthKeySp();
  return {
    dayOfMonth: day,
    daysInMonth,
    daysRemaining: Math.max(0, daysInMonth - day),
    monthLabel: formatMonthLabelPt(monthKey),
    monthKey,
  };
}

export function buildMonthLengthHintPt(monthKey?: string | null): string {
  const key = monthKey ?? resolveCurrentMonthKeySp();
  const [yearRaw, monthRaw] = key.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  const days =
    Number.isFinite(year) && monthIndex >= 0 && monthIndex <= 11
      ? resolveDaysInMonthSp(year, monthIndex)
      : resolveDaysInCurrentMonthSp();
  return `${formatMonthLabelPt(key)} tem ${days} dias`;
}

export function buildMetaSyncLockedMessagePt(): string {
  return `Meta bloqueada até ${formatCycleResetLabelPt()}. Faltam ${resolveDaysUntilCycleResetSp()} ${resolveDaysUntilCycleResetSp() === 1 ? "dia" : "dias"} para nova sincronização.`;
}
