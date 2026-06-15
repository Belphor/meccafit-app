/**
 * Comunidade · Arena Cooperativa — leitura via RPC (ARGOS-safe)
 */

import { supabase } from "@/lib/supabase";

export type ComunidadeMeta = {
  tonelagem_alvo_kg: number;
  tonelagem_atual_acumulada: number;
  progresso_pct: number;
};

export type ComunidadeDueloAtivo = {
  id: string;
  tipo_confronto: "SUPERIORES" | "INFERIORES";
  status: string;
  vtc_desafiante: number;
  vtc_desafiado: number;
  atleta_desafiante_id: string;
  atleta_desafiado_id: string;
  fim_em: string;
  inicio_em: string;
};

export type ComunidadePilar = {
  atleta_id: string;
  is_pilar_fogo_cosmico: boolean;
};

export type ComunidadeArenaSnapshot = {
  mes_referencia: string;
  meta: ComunidadeMeta;
  campeao_cinturao_id: string | null;
  pilares_fogo_cosmico: ComunidadePilar[];
  duelos_ativos: ComunidadeDueloAtivo[];
};

export type PerfilPublicoAtleta = {
  atleta_id: string;
  indice_ignicao: number;
  duelos_vencidos: number;
  grupo_supremo: string;
  detem_cinturao_duelo: boolean;
  is_pilar_fogo_cosmico: boolean;
};

function parseSnapshot(payload: unknown): ComunidadeArenaSnapshot | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const row = payload as Record<string, unknown>;
  if (row.error) return null;

  const metaRaw = row.meta;
  if (!metaRaw || typeof metaRaw !== "object") return null;
  const metaObj = metaRaw as Record<string, unknown>;

  return {
    mes_referencia: String(row.mes_referencia ?? ""),
    meta: {
      tonelagem_alvo_kg: Number(metaObj.tonelagem_alvo_kg ?? 0),
      tonelagem_atual_acumulada: Number(metaObj.tonelagem_atual_acumulada ?? 0),
      progresso_pct: Number(metaObj.progresso_pct ?? 0),
    },
    campeao_cinturao_id: row.campeao_cinturao_id ? String(row.campeao_cinturao_id) : null,
    pilares_fogo_cosmico: Array.isArray(row.pilares_fogo_cosmico)
      ? (row.pilares_fogo_cosmico as ComunidadePilar[])
      : [],
    duelos_ativos: Array.isArray(row.duelos_ativos)
      ? (row.duelos_ativos as ComunidadeDueloAtivo[])
      : [],
  };
}

export async function fetchComunidadeArenaSnapshot(): Promise<{
  data: ComunidadeArenaSnapshot | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("get_comunidade_arena_snapshot");

  if (error) {
    if (error.code === "PGRST202") {
      return { data: null, error: "Módulo Comunidade ainda não aplicado no servidor." };
    }
    return { data: null, error: error.message };
  }

  const parsed = parseSnapshot(data);
  if (!parsed) {
    return { data: null, error: "Resposta inválida da arena." };
  }

  return { data: parsed, error: null };
}

export async function fetchPerfilPublicoAtleta(
  atletaId: string,
): Promise<{ data: PerfilPublicoAtleta | null; error: string | null }> {
  const { data, error } = await supabase.rpc("get_perfil_publico_atleta", {
    p_atleta_id: atletaId,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { data: null, error: "Perfil inválido." };
  }

  const row = data as Record<string, unknown>;
  if (row.error) {
    return { data: null, error: String(row.message ?? row.error) };
  }

  return {
    data: {
      atleta_id: String(row.atleta_id ?? atletaId),
      indice_ignicao: Number(row.indice_ignicao ?? 0),
      duelos_vencidos: Number(row.duelos_vencidos ?? 0),
      grupo_supremo: String(row.grupo_supremo ?? "CINZAS"),
      detem_cinturao_duelo: Boolean(row.detem_cinturao_duelo),
      is_pilar_fogo_cosmico: Boolean(row.is_pilar_fogo_cosmico),
    },
    error: null,
  };
}

export function formatTonelagemKg(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M kg`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k kg`;
  return `${Math.round(value).toLocaleString("pt-BR")} kg`;
}
