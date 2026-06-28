import type { ForjaBondedAthlete, ForjaVtcFeedEntry } from "@/lib/forja-dashboard";
import type { ForjaFraudSignal } from "@/lib/forja-sovereign-actions";

export type ForjaMonitorSegment = "todos" | "vip" | "comum" | "meus";

export type ForjaMonitorStats = {
  total: number;
  vip: number;
  comum: number;
  meus: number;
  withVtcToday: number;
  spikes: number;
};

export function computeMonitorStats(
  athletes: ForjaBondedAthlete[],
  operatorId: string,
  feedEntries: ForjaVtcFeedEntry[] = [],
): ForjaMonitorStats {
  let vip = 0;
  let comum = 0;
  let meus = 0;

  for (const athlete of athletes) {
    if (athlete.hasVipBond) vip += 1;
    else comum += 1;
    if (!athlete.isGlobalListing) meus += 1;
  }

  const withVtcToday = feedEntries.filter((entry) => entry.vtcToday > 0).length;
  const spikes = feedEntries.filter((entry) => entry.alertSpike).length;

  return {
    total: athletes.length,
    vip,
    comum,
    meus,
    withVtcToday,
    spikes,
  };
}

export function filterAthletesByMonitorSegment(
  athletes: ForjaBondedAthlete[],
  segment: ForjaMonitorSegment,
  operatorId: string,
): ForjaBondedAthlete[] {
  switch (segment) {
    case "vip":
      return athletes.filter((athlete) => athlete.hasVipBond);
    case "comum":
      return athletes.filter((athlete) => !athlete.hasVipBond);
    case "meus":
      return athletes.filter((athlete) => !athlete.isGlobalListing);
    default:
      return athletes;
  }
}

export function patchAthleteVtcAfterAdjust(
  athlete: ForjaBondedAthlete,
  newToday: number,
): Partial<ForjaBondedAthlete> {
  const oldToday = athlete.vtcToday ?? 0;
  const old30d = athlete.vtc30d ?? 0;
  return {
    vtcToday: newToday,
    vtc30d: Math.max(0, old30d + (newToday - oldToday)),
  };
}

export function patchFeedEntryVtcAfterAdjust(
  entry: ForjaVtcFeedEntry,
  newToday: number,
): ForjaVtcFeedEntry {
  const oldToday = entry.vtcToday;
  const old30d = entry.vtc30d;
  const vtc30d = Math.max(0, old30d + (newToday - oldToday));
  const vtcAvg7d = entry.vtcAvg7d;
  const alertSpike =
    newToday > 0 && vtcAvg7d > 0 && newToday > vtcAvg7d * 4;
  return { ...entry, vtcToday: newToday, vtc30d, alertSpike };
}

const FRAUD_SIGNAL_TITLES: Record<string, string> = {
  VTC_SPIKE: "AVISO - VOLUME DE HOJE ACIMA DO HABITUAL",
  SUSPENDED_ACTIVE_TRAINING: "URGENTE - CONTA SUSPENSA COM TREINOS REGISTRADOS",
  CARGA_FLOOD: "AVISO - MUITOS REGISTROS DE CARGA EM 24 HORAS",
  TIER_VTC_MISMATCH: "AVISO - FASE NÃO COMBINA COM O VOLUME TOTAL DE CARGA",
  TIER_VTC_LOW: "AVISO - FASE NÃO COMBINA COM O VOLUME TOTAL DE CARGA",
};

const FRAUD_SIGNAL_MESSAGE =
  "A fase registrada não combina com o volume total de carga dos últimos 30 dias. Confira a fase do cliente e o volume acumulado antes de ajustar o treino.";

export function resolveFraudSignalTitle(signal: ForjaFraudSignal): string {
  return (
    FRAUD_SIGNAL_TITLES[signal.code] ??
    `${signal.severity === "critical" ? "URGENTE" : "AVISO"} - ${signal.code.replace(/_/g, " ")}`
  );
}

export function resolveFraudSignalMessage(signal: ForjaFraudSignal): string {
  switch (signal.code) {
    case "VTC_SPIKE":
      return "Confira se os treinos de hoje foram registrados corretamente ou ajuste o volume abaixo.";
    case "SUSPENDED_ACTIVE_TRAINING":
      return "A conta está suspensa, mas ainda há treinos nesta semana.";
    case "CARGA_FLOOD":
      return "Há registros de carga demais nas últimas 24 horas.";
    case "TIER_VTC_MISMATCH":
    case "TIER_VTC_LOW":
      return FRAUD_SIGNAL_MESSAGE;
    default:
      return signal.severity === "warn"
        ? FRAUD_SIGNAL_MESSAGE
        : signal.message;
  }
}

export function resolveFeedAlertLabel(
  severity: "warn" | "critical" | null,
  options?: { mismatch?: boolean; spike?: boolean },
): string | null {
  if (!severity && !options?.mismatch && !options?.spike) return null;
  if (severity === "critical") return "URGENTE";
  if (options?.mismatch) return FRAUD_SIGNAL_TITLES.TIER_VTC_MISMATCH;
  if (options?.spike) return FRAUD_SIGNAL_TITLES.VTC_SPIKE;
  return FRAUD_SIGNAL_TITLES.TIER_VTC_MISMATCH;
}
