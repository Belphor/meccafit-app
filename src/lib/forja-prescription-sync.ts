import { supabase } from "@/lib/supabase";
import type { ForjaBondedAthlete, ForjaPrescriptionDraft } from "@/lib/forja-dashboard";
import { CLIENT_TRAINING_MUSCLE_GROUPS, type ClientTrainingMuscleGroup } from "@/lib/training-week";

export type ForjaPrescriptionSyncResult =
  | { ok: true; prescriptionId: string }
  | { ok: false; code: "SESSION" | "VALIDATION" | "RLS" | "NETWORK"; message: string };

const REST_SEC_MIN = 15;
const REST_SEC_MAX = 600;

function slugifyExerciseId(raw: string): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? `forja-${normalized.slice(0, 48)}` : "forja-exercicio";
}

function parseMuscleGroup(raw: string): ClientTrainingMuscleGroup | null {
  const key = raw.trim().toUpperCase();
  return CLIENT_TRAINING_MUSCLE_GROUPS.includes(key as ClientTrainingMuscleGroup)
    ? (key as ClientTrainingMuscleGroup)
    : null;
}

function parseRestSeconds(raw: string, label: string): { ok: true; value: number | null } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };

  const value = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(value) || value < REST_SEC_MIN || value > REST_SEC_MAX) {
    return { ok: false, message: `${label} inválido (${REST_SEC_MIN}–${REST_SEC_MAX} s).` };
  }

  return { ok: true, value };
}

export function parsePrescriptionDraft(
  draft: ForjaPrescriptionDraft,
): { ok: true; payload: {
    exercicioId: string;
    grupoMuscular: ClientTrainingMuscleGroup;
    peso: number;
    repeticoes: number;
    series: number;
    label: string;
    descansoSegundos: number | null;
    descansoPadraoSeg: number | null;
  } } | { ok: false; message: string } {
  const label = draft.exercicio.trim();
  const peso = Number(draft.peso.trim());
  const repeticoes = Number.parseInt(draft.repeticoes.trim(), 10);
  const series = Number.parseInt(draft.series.trim() || "3", 10);
  const grupoMuscular = parseMuscleGroup(draft.grupoMuscular);

  if (!label) {
    return { ok: false, message: "Informe o nome do exercício." };
  }
  if (!grupoMuscular) {
    return { ok: false, message: "Selecione o grupo muscular." };
  }
  if (!Number.isFinite(peso) || peso <= 0 || peso > 9999.99) {
    return { ok: false, message: "Peso inválido (1–9999,99 kg)." };
  }
  if (!Number.isFinite(repeticoes) || repeticoes < 1 || repeticoes > 100) {
    return { ok: false, message: "Repetições inválidas (1–100)." };
  }
  if (!Number.isFinite(series) || series < 1 || series > 20) {
    return { ok: false, message: "Séries inválidas (1–20)." };
  }

  const descansoExercicio = parseRestSeconds(draft.descansoSegundos, "Descanso do exercício");
  if (!descansoExercicio.ok) return descansoExercicio;

  const descansoPadrao = parseRestSeconds(draft.descansoPadraoSeg, "Descanso padrão");
  if (!descansoPadrao.ok) return descansoPadrao;

  return {
    ok: true,
    payload: {
      exercicioId: slugifyExerciseId(label),
      grupoMuscular,
      peso,
      repeticoes,
      series,
      label,
      descansoSegundos: descansoExercicio.value,
      descansoPadraoSeg: descansoPadrao.value,
    },
  };
}

async function upsertTreinoConfig(
  athlete: ForjaBondedAthlete,
  operatorId: string,
  descansoPadraoSeg: number,
): Promise<ForjaPrescriptionSyncResult | null> {
  const { data: existing } = await supabase
    .from("config_treino_atleta")
    .select("atleta_id")
    .eq("atleta_id", athlete.clientId)
    .maybeSingle();

  if (existing?.atleta_id) {
    const { error } = await supabase
      .from("config_treino_atleta")
      .update({
        descanso_padrao_seg: descansoPadraoSeg,
        forjador_id: operatorId,
      })
      .eq("atleta_id", athlete.clientId);

    if (error) {
      return { ok: false, code: "NETWORK", message: error.message };
    }
    return null;
  }

  const { error } = await supabase.from("config_treino_atleta").insert({
    atleta_id: athlete.clientId,
    forjador_id: operatorId,
    descanso_padrao_seg: descansoPadraoSeg,
  });

  if (error) {
    return { ok: false, code: "NETWORK", message: error.message };
  }

  return null;
}

/**
 * Prescrição de treino para qualquer atleta vinculado ao forjador.
 * Persiste em prescricoes_treino_forjador + config_treino_atleta (descanso padrão).
 */
export async function syncForjaPersonalPrescription(
  athlete: ForjaBondedAthlete,
  draft: ForjaPrescriptionDraft,
): Promise<ForjaPrescriptionSyncResult> {
  const parsed = parsePrescriptionDraft(draft);
  if (!parsed.ok) {
    return { ok: false, code: "VALIDATION", message: parsed.message };
  }

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    const operatorId = session?.user?.id?.trim();
    if (sessionError || !operatorId) {
      return { ok: false, code: "SESSION", message: "Sessão inválida. Faça login novamente." };
    }

    const { payload } = parsed;

    if (payload.descansoPadraoSeg !== null) {
      const configError = await upsertTreinoConfig(athlete, operatorId, payload.descansoPadraoSeg);
      if (configError) return configError;
    }

    const { data: existing } = await supabase
      .from("prescricoes_treino_forjador")
      .select("id")
      .eq("atleta_id", athlete.clientId)
      .eq("grupo_muscular", payload.grupoMuscular)
      .eq("exercicio_id", payload.exercicioId)
      .maybeSingle();

    const row = {
      atleta_id: athlete.clientId,
      forjador_id: operatorId,
      grupo_muscular: payload.grupoMuscular,
      exercicio_id: payload.exercicioId,
      series_alvo: payload.series,
      repeticoes_alvo: payload.repeticoes,
      peso_prescrito: payload.peso,
      descanso_segundos: payload.descansoSegundos,
      observacoes: `Forja · ${payload.label}`,
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from("prescricoes_treino_forjador")
        .update(row)
        .eq("id", existing.id)
        .select("id")
        .single();

      if (error) {
        const rlsHint = error.message?.toLowerCase().includes("row-level security");
        return {
          ok: false,
          code: rlsHint ? "RLS" : "NETWORK",
          message: error.message,
        };
      }

      if (!data?.id) {
        return { ok: false, code: "NETWORK", message: "Prescrição não confirmada pelo núcleo." };
      }

      return { ok: true, prescriptionId: data.id };
    }

    const { data, error } = await supabase
      .from("prescricoes_treino_forjador")
      .insert(row)
      .select("id")
      .single();

    if (error) {
      const rlsHint = error.message?.toLowerCase().includes("row-level security");
      return {
        ok: false,
        code: rlsHint ? "RLS" : "NETWORK",
        message: error.message,
      };
    }

    if (!data?.id) {
      return { ok: false, code: "NETWORK", message: "Prescrição não confirmada pelo núcleo." };
    }

    return { ok: true, prescriptionId: data.id };
  } catch {
    return { ok: false, code: "NETWORK", message: "Falha de rede ao forjar prescrição." };
  }
}
