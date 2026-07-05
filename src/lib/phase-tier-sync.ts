import type { PhaseTier } from "@/lib/dashboard-config";
import { supabase } from "@/lib/supabase";

export function resolvePhaseTierFromRpcPayload(raw: unknown): PhaseTier | null {
  if (!raw || typeof raw !== "object") return null;
  const tier = Number((raw as { phase_tier?: number }).phase_tier ?? 0);
  if (!Number.isFinite(tier) || tier < 1) return null;
  return Math.min(5, Math.max(1, Math.round(tier))) as PhaseTier;
}

/** ARGOS · reavalia elegibilidade de fase após atividade no altar (treino, cardio). */
export async function syncPhaseTierAfterActivity(userId: string): Promise<PhaseTier | null> {
  const trimmed = userId.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase.rpc("argos_advance_phase_if_eligible", {
    p_user_id: trimmed,
  });

  if (error) return null;
  return resolvePhaseTierFromRpcPayload(data);
}
