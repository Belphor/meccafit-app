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

/** Valor para `<input type="date">` no calendário de Brasília. */
export function getBrasiliaDateInputValue(date = new Date()): string {
  const { year, month, day } = getBrasiliaDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Interpreta YYYY-MM-DD como meio-dia em Brasília → ISO UTC. */
export function brasiliaDateInputToIso(dateInput: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput.trim());
  if (!match) return new Date().toISOString();

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date().toISOString();
  }

  // 12:00 em Brasília (UTC−3) = 15:00 UTC
  return new Date(Date.UTC(year, month - 1, day, 15, 0, 0, 0)).toISOString();
}

export function formatBrasiliaDateFromIso(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return formatBrasiliaDate(date, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** YYYY-MM-DD → DD/MM/YYYY (calendário Brasília). */
export function ymdToBrasiliaDisplay(ymd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return ymd.trim();
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/** DD/MM/YYYY → YYYY-MM-DD ou null se inválido. */
export function brasiliaDisplayToYmd(display: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(display.trim());
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);

  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const probe = brasiliaDateInputToIso(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  );
  const probeParts = getBrasiliaDateParts(new Date(probe));
  if (probeParts.year !== year || probeParts.month !== month || probeParts.day !== day) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getBrasiliaDateDisplayValue(date = new Date()): string {
  return ymdToBrasiliaDisplay(getBrasiliaDateInputValue(date));
}
