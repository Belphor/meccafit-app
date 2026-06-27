import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";

/**
 * Isolamento multi-tenant · antropometria VIP.
 * Personal: apenas alunos VIP com bond activo onde forgerId === operatorId.
 * Soberano: todos os VIP da academia.
 */
export function resolveMedidasAthletes(
  athletes: ForjaBondedAthlete[],
  operatorId: string,
  sovereign: boolean,
): ForjaBondedAthlete[] {
  const vipOnly = athletes.filter((athlete) => athlete.hasVipBond);

  if (sovereign) {
    return vipOnly;
  }

  return vipOnly.filter((athlete) => athlete.forgerId === operatorId);
}

export function canOperatorAccessMedidasAthlete(
  athlete: ForjaBondedAthlete,
  operatorId: string,
  sovereign: boolean,
): boolean {
  if (!athlete.hasVipBond) return false;
  if (sovereign) return true;
  return athlete.forgerId === operatorId;
}
