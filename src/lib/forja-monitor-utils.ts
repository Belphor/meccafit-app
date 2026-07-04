import { isAccountSuspended } from "@/lib/account-access-status";
import type { ForjaBondedAthlete, ForjaVtcFeedEntry } from "@/lib/forja-dashboard";
import type { ForjaFraudSignal } from "@/lib/forja-sovereign-actions";

export type ForjaMonitorSegment = "vip" | "comum" | "suspenso";

export type ForjaMonitorStats = {
  total: number;
  vip: number;
  comum: number;
  suspenso: number;
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
  let suspenso = 0;

  for (const athlete of athletes) {
    if (isAccountSuspended(athlete.statusAltar)) {
      suspenso += 1;
      continue;
    }
    if (athlete.hasVipBond) vip += 1;
    else comum += 1;
  }

  const withVtcToday = feedEntries.filter((entry) => entry.vtcToday > 0).length;
  const spikes = feedEntries.filter((entry) => entry.alertSpike).length;

  return {
    total: athletes.length,
    vip,
    comum,
    suspenso,
    withVtcToday,
    spikes,
  };
}

export function filterAthletesByMonitorSegment(
  athletes: ForjaBondedAthlete[],
  segment: ForjaMonitorSegment,
): ForjaBondedAthlete[] {
  switch (segment) {
    case "vip":
      return athletes.filter(
        (athlete) => athlete.hasVipBond && !isAccountSuspended(athlete.statusAltar),
      );
    case "comum":
      return athletes.filter(
        (athlete) => !athlete.hasVipBond && !isAccountSuspended(athlete.statusAltar),
      );
    case "suspenso":
      return athletes.filter((athlete) => isAccountSuspended(athlete.statusAltar));
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
  VTC_SPIKE: "Aviso: volume de hoje acima do habitual",
  SUSPENDED_ACTIVE_TRAINING: "Urgente: conta suspensa com treinos registrados",
  CARGA_FLOOD: "Aviso: muitos registros de carga em 24 horas",
  TIER_VTC_MISMATCH: "Aviso: fase não combina com o volume total de carga",
  TIER_VTC_LOW: "Aviso: fase não combina com o volume total de carga",
};

const FRAUD_SIGNAL_MESSAGE =
  "A fase registrada não combina com o volume total de carga dos últimos 30 dias. Confira a fase do cliente e o volume acumulado antes de ajustar o treino.";

export function resolveFraudSignalTitle(signal: ForjaFraudSignal): string {
  return (
    FRAUD_SIGNAL_TITLES[signal.code] ??
    `${signal.severity === "critical" ? "Urgente" : "Aviso"}: ${signal.code.replace(/_/g, " ").toLowerCase()}`
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
  if (severity === "critical") return "Urgente";
  if (options?.mismatch) return FRAUD_SIGNAL_TITLES.TIER_VTC_MISMATCH;
  if (options?.spike) return FRAUD_SIGNAL_TITLES.VTC_SPIKE;
  return FRAUD_SIGNAL_TITLES.TIER_VTC_MISMATCH;
}
