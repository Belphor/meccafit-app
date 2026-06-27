import type { ForjaBondedAthlete, ForjaVtcFeedEntry } from "@/lib/forja-dashboard";

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
