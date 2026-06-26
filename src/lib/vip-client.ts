import type { TrainingTrackState } from "@/lib/training-track";
import { resolveHasPersonalBond } from "@/lib/training-track";

/**
 * Cliente VIP = possui vínculo activo em forger_client_bonds (via Personal).
 * Desbloqueia aba Dieta, trilho personal de treino e prescrições forjadas.
 */
export function isVipClient(trainingTrack: TrainingTrackState): boolean {
  return resolveHasPersonalBond(trainingTrack);
}

export function isVipClientFromBond(hasPersonalBond: boolean): boolean {
  return hasPersonalBond;
}

export const VIP_CLIENT_LABEL = "Cliente VIP";
