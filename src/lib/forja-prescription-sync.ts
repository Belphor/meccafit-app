import { supabase } from "@/lib/supabase";
import type { ForjaBondedAthlete, ForjaPrescriptionDraft } from "@/lib/forja-dashboard";

export type ForjaPrescriptionSyncResult =
  | { ok: true; prescriptionId: string }
  | { ok: false; code: "SESSION" | "VALIDATION" | "RLS" | "NETWORK"; message: string };

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

export function parsePrescriptionDraft(
  draft: ForjaPrescriptionDraft,
): { ok: true; payload: { exercicioId: string; peso: number; repeticoes: number; series: number; label: string } } | { ok: false; message: string } {
  const label = draft.exercicio.trim();
  const peso = Number(draft.peso.trim());
  const repeticoes = Number.parseInt(draft.repeticoes.trim(), 10);
  const series = Number.parseInt(draft.series.trim() || "3", 10);

  if (!label) {
    return { ok: false, message: "Informe o nome do exercício." };
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

  return {
    ok: true,
    payload: {
      exercicioId: slugifyExerciseId(label),
      peso,
      repeticoes,
      series,
      label,
    },
  };
}

/**
 * VIP · persiste decreto em historico_treinos_personais (requer forger_client_bonds activo).
 * forger_id deve coincidir com o vínculo do atleta seleccionado.
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

    const { data, error } = await supabase
      .from("historico_treinos_personais")
      .insert({
        client_id: athlete.clientId,
        forger_id: athlete.forgerId,
        exercicio_id: payload.exercicioId,
        peso_prescrito: payload.peso,
        repeticoes_alvo: payload.repeticoes,
        series_alvo: payload.series,
        observacoes: `Forja · ${payload.label}`,
      })
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
