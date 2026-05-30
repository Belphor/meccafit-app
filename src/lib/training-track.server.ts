import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  DEFAULT_TRAINING_TRACK,
  type TrainingTrackState,
} from "@/lib/training-track";

export async function fetchTrainingTrackForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<TrainingTrackState> {
  const { data: bond, error: bondError } = await supabase
    .from("forger_client_bonds")
    .select("id, forger_id, client_id, created_at")
    .eq("client_id", userId)
    .maybeSingle();

  if (bondError || !bond) {
    return DEFAULT_TRAINING_TRACK;
  }

  const { data: prescriptions, error: rxError } = await supabase
    .from("historico_treinos_personais")
    .select(
      "id, client_id, forger_id, exercicio_id, peso_prescrito, repeticoes_alvo, series_alvo, observacoes, criado_em",
    )
    .eq("client_id", userId)
    .order("criado_em", { ascending: false })
    .limit(64);

  if (rxError) {
    return {
      track: "personal",
      bond,
      personalPrescriptions: [],
    };
  }

  return {
    track: "personal",
    bond,
    personalPrescriptions: (prescriptions ?? []).map((row) => ({
      id: row.id,
      client_id: row.client_id,
      forger_id: row.forger_id,
      exercicio_id: row.exercicio_id,
      peso_prescrito: Number(row.peso_prescrito),
      repeticoes_alvo: row.repeticoes_alvo,
      series_alvo: row.series_alvo,
      observacoes: row.observacoes,
      criado_em: row.criado_em,
    })),
  };
}
