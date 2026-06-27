import type { DietWeekDayId } from "@/lib/forjador-vip-types";

export const BRASILIA_TIME_ZONE = "America/Sao_Paulo";

export type BrasiliaDateParts = {
  year: number;
  month: number;
  day: number;
  /** 0 = domingo … 6 = sábado (calendário de Brasília) */
  weekday: number;
};

const DIET_DAY_BY_WEEKDAY: Record<number, DietWeekDayId> = {
  0: "domingo",
  1: "segunda",
  2: "terca",
  3: "quarta",
  4: "quinta",
  5: "sexta",
  6: "sabado",
};

function readBrasiliaParts(date: Date): BrasiliaDateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRASILIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number.parseInt(parts.find((part) => part.type === type)?.value ?? "0", 10);

  const weekdayToken = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    weekday: weekdayMap[weekdayToken] ?? 1,
  };
}

/** Data/hora actual em Brasília (partes do calendário local). */
export function getBrasiliaDateParts(date = new Date()): BrasiliaDateParts {
  return readBrasiliaParts(date);
}

/** Dia da semana alimentar (Seg–Dom) conforme relógio de Brasília. */
export function resolveBrasiliaDietDayId(date = new Date()): DietWeekDayId {
  const { weekday } = getBrasiliaDateParts(date);
  return DIET_DAY_BY_WEEKDAY[weekday] ?? "segunda";
}

/** Chave ISO da semana · ex.: 2026-W25 (calendário de Brasília). */
export function resolveIsoWeekRefBrasilia(date = new Date()): string {
  const { year, month, day } = getBrasiliaDateParts(date);
  const local = new Date(Date.UTC(year, month - 1, day));
  const dayNum = local.getUTCDay() || 7;
  local.setUTCDate(local.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(local.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((local.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${local.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Segunda=1 … Sábado=6 · domingo mapeia para segunda (treino). */
export function resolveBrasiliaTrainingWeekdayIndex(date = new Date()): 1 | 2 | 3 | 4 | 5 | 6 {
  const { weekday } = getBrasiliaDateParts(date);
  if (weekday === 0) return 1;
  if (weekday === 6) return 6;
  return weekday as 1 | 2 | 3 | 4 | 5 | 6;
}

export function formatBrasiliaDate(date = new Date(), options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRASILIA_TIME_ZONE,
    ...options,
  }).format(date);
}
