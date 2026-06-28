import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";

/**
 * ID do personal gravado em registos VIP.
 * O RLS exige forger_id = operador logado, excepto quando o soberano publica
 * em nome do personal vinculado ao cliente.
 */
export function resolveVipForgerIdForPublish(
  athlete: ForjaBondedAthlete,
  operatorId: string,
  isSovereign: boolean,
): string {
  if (isSovereign && athlete.forgerId && athlete.forgerId !== operatorId) {
    return athlete.forgerId;
  }
  return operatorId;
}
