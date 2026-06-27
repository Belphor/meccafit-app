import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";

export type ForjaAthleteLists = {
  vip: ForjaBondedAthlete[];
  comum: ForjaBondedAthlete[];
  all: ForjaBondedAthlete[];
};

export function splitAthletesByVipBond(athletes: ForjaBondedAthlete[]): ForjaAthleteLists {
  const vip: ForjaBondedAthlete[] = [];
  const comum: ForjaBondedAthlete[] = [];

  for (const athlete of athletes) {
    if (athlete.hasVipBond) {
      vip.push(athlete);
    } else {
      comum.push(athlete);
    }
  }

  return { vip, comum, all: athletes };
}

/** Apenas clientes com vínculo VIP activo. */
export function filterVipAthletes(
  athletes: ForjaBondedAthlete[],
  operatorId: string,
  sovereign: boolean,
): ForjaBondedAthlete[] {
  const vipOnly = athletes.filter((athlete) => athlete.hasVipBond);
  if (sovereign) return vipOnly;
  return vipOnly.filter((athlete) => athlete.forgerId === operatorId);
}
