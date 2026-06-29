/** Ciclo civil de sincronização da meta de treino · fuso America/Sao_Paulo */

export const META_SYNC_TIMEZONE = "America/Sao_Paulo";

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

export function getSaoPauloNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: META_SYNC_TIMEZONE }));
}

export function resolveCurrentMonthKeySp(): string {
  const sp = getSaoPauloNow();
  const year = sp.getFullYear();
  const month = String(sp.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function resolveMonthKeyFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const normalized = iso.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(normalized) ? normalized : null;
}

export function isMetaSyncedForCurrentMonth(metaSyncMes: string | null | undefined): boolean {
  const syncedKey = resolveMonthKeyFromIso(metaSyncMes);
  if (!syncedKey) return false;
  return syncedKey === resolveCurrentMonthKeySp().slice(0, 7);
}

export function resolveDaysInMonthSp(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export function resolveDaysInCurrentMonthSp(): number {
  const sp = getSaoPauloNow();
  return resolveDaysInMonthSp(sp.getFullYear(), sp.getMonth());
}

function capitalizeMonthPt(name: string): string {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function formatMonthLabelPt(monthKey?: string | null): string {
  const key = monthKey ?? resolveCurrentMonthKeySp().slice(0, 7);
  const [yearRaw, monthRaw] = key.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11) return key;
  return `${capitalizeMonthPt(MONTH_NAMES_PT[monthIndex])} de ${year}`;
}

export function resolveNextMonthStartSp(): Date {
  const sp = getSaoPauloNow();
  return new Date(sp.getFullYear(), sp.getMonth() + 1, 1, 0, 0, 0, 0);
}

export function formatCycleResetLabelPt(): string {
  const next = resolveNextMonthStartSp();
  const day = next.getDate();
  const month = MONTH_NAMES_PT[next.getMonth()];
  const year = next.getFullYear();
  return `${day} de ${month} de ${year}, 00:00 (horário de Brasília)`;
}

/** Data curta da próxima virada civil (ex.: 1 de agosto). */
export function formatNextViradaDateShortPt(): string {
  const next = resolveNextMonthStartSp();
  return `${next.getDate()} de ${MONTH_NAMES_PT[next.getMonth()]}`;
}

export function resolveDaysUntilCycleResetSp(): number {
  const sp = getSaoPauloNow();
  const end = resolveNextMonthStartSp();
  const ms = end.getTime() - sp.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** Contexto do mês civil (SP) · Gravidade Térmica e meta de treino. */
export function resolveMonthContextSp() {
  const sp = getSaoPauloNow();
  const dayOfMonth = sp.getDate();
  const daysInMonth = resolveDaysInCurrentMonthSp();
  return {
    dayOfMonth,
    daysInMonth,
    daysRemaining: Math.max(0, daysInMonth - dayOfMonth),
    monthLabel: formatMonthLabelPt(),
    monthKey: resolveCurrentMonthKeySp().slice(0, 7),
  };
}

export function buildMonthLengthHintPt(monthKey?: string | null): string {
  const key = monthKey ?? resolveCurrentMonthKeySp().slice(0, 7);
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
