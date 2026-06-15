/**
 * Write path · historico_cargas (MIDAS)
 * Grava um facto biomecânico por exercício concluído — alimenta VTC/VRA na janela 14d.
 */

import { supabase } from "@/lib/supabase";
import type { Enums } from "@/types/database.types";

export type GrupoMuscularEvolucao =
  | "PEITO"
  | "COSTAS"
  | "PERNAS"
  | "OMBROS"
  | "BRACOS"
  | "ABDOMEN";

const SUBGRUPO_TO_GRUPO: Record<Enums<"subgrupo_muscular">, GrupoMuscularEvolucao> = {
  peito: "PEITO",
  costas: "COSTAS",
  pernas: "PERNAS",
  ombros: "OMBROS",
  bracos: "BRACOS",
  abdomen: "ABDOMEN",
};

export function resolveGrupoMuscularEvolucao(
  musculo: string | null | undefined,
): GrupoMuscularEvolucao | null {
  const key = String(musculo ?? "").trim().toLowerCase() as Enums<"subgrupo_muscular">;
  return SUBGRUPO_TO_GRUPO[key] ?? null;
}

export type HistoricoCargaInput = {
  atletaId: string;
  musculo: string;
  exercicioId?: string | number | null;
  exercicioNome?: string;
  peso: number;
  repeticoes?: number;
  series?: number;
};

export async function recordHistoricoCarga(
  input: HistoricoCargaInput,
): Promise<{ ok: boolean; detail?: string }> {
  const atletaId = input.atletaId.trim();
  if (!atletaId || atletaId.length < 20) {
    return { ok: false, detail: "atletaId inválido" };
  }

  const grupo = resolveGrupoMuscularEvolucao(input.musculo);
  if (!grupo) {
    return { ok: false, detail: `musculo não mapeado: ${input.musculo}` };
  }

  const exercicioIdRaw = input.exercicioId;
  const exercicioId =
    exercicioIdRaw !== null &&
    exercicioIdRaw !== undefined &&
    String(exercicioIdRaw).trim() !== "" &&
    Number(exercicioIdRaw) !== 0
      ? String(exercicioIdRaw).trim()
      : (input.exercicioNome?.trim() || "treino-geral");

  const repeticoes = Math.max(1, Math.round(input.repeticoes ?? 1));
  const series = Math.max(1, Math.round(input.series ?? 1));
  const cargaMaxima = Math.max(0, Number(input.peso) || 0);

  const { error } = await supabase.from("historico_cargas").insert({
    atleta_id: atletaId,
    grupo_muscular: grupo,
    exercicio_id: exercicioId,
    carga_maxima: cargaMaxima,
    repeticoes_acumuladas: repeticoes * series,
    data_registro: new Date().toISOString(),
  });

  if (error) {
    console.warn("[meccafit:historico-cargas] falha ao gravar:", error.message);
    return { ok: false, detail: error.message };
  }

  return { ok: true };
}
