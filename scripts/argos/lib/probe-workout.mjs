/**
 * Helpers ARGOS para probes de registrar_treino_com_status
 * (IDs únicos + cleanup service_role + trava diária).
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "../../lib/env.mjs";

export const DAY_LOCK_FRAGMENT = "trava diária";

let probeSeq = 0;

/** ID de exercício de probe único por processo (evita colisão com lock diário). */
export function uniqueProbeExercicioId(bucket = 88) {
  probeSeq += 1;
  const stamp = Date.now() % 900_000;
  return bucket * 1_000_000 + stamp + (probeSeq % 100);
}

export function isDayLockError(message) {
  return String(message ?? "").toLowerCase().includes(DAY_LOCK_FRAGMENT);
}

export function createServiceAdmin(env = loadEnvLocal()) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Remove resíduos de probe em historico_treinos + historico_cargas. */
export async function cleanupProbeWorkout(admin, userId, exercicioId) {
  if (!admin || !userId || exercicioId == null) return;
  const id = Number(exercicioId);
  if (!Number.isFinite(id) || id <= 0) return;

  await admin.from("historico_treinos").delete().eq("cliente_id", userId).eq("exercicio_id", id);
  await admin.from("historico_cargas").delete().eq("atleta_id", userId).eq("exercicio_id", String(id));
}

/**
 * Garante exercício livre hoje: limpa resíduos e devolve ID pronto para RPC.
 */
export async function allocateFreshProbeExercicioId(admin, userId, bucket = 88) {
  const exercicioId = uniqueProbeExercicioId(bucket);
  await cleanupProbeWorkout(admin, userId, exercicioId);
  return exercicioId;
}
