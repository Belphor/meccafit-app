/**
 * Comunidade · Arena Cooperativa — leitura via RPC (ARGOS-safe)
 */

import { supabase } from "@/lib/supabase";

export type ComunidadeTitulos = {
  temCinturaoDuelo?: boolean;
  isReiDasChamas?: boolean;
  isPilarCooperativo?: boolean;
};

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

export type ComunidadeAtletaRef = {
  atleta_id: string;
};

export type CampeoesCinturao = {
  SUPERIORES: string | null;
  INFERIORES: string | null;
};

export type RankingVtcEntry = ComunidadeTitulos & {
  posicao: number;
  atleta_id: string;
  atleta_nome: string;
  vtc_total: number;
  vtc_grupo: number;
};

export type RankingsThoth = {
  janela_dias: number;
  janela_inicio: string;
  vtc_global: RankingVtcEntry[];
  vtc_por_membro: {
    peito: RankingVtcEntry[];
    ombros: RankingVtcEntry[];
    costas: RankingVtcEntry[];
    pernas: RankingVtcEntry[];
  };
};

/** @deprecated use RankingsThoth */
export type RankingsPorMembro = RankingsThoth;

export type ComunidadeArenaSnapshot = {
  mes_referencia: string;
  meta: ComunidadeMeta;
  campeao_cinturao_id: string | null;
  campeoes_cinturao: CampeoesCinturao;
  reis_das_chamas: ComunidadeAtletaRef[];
  pilares_cooperativos: ComunidadeAtletaRef[];
  duelos_ativos: ComunidadeDueloAtivo[];
  rankings_thoth: RankingsThoth | null;
  /** alias legado */
  rankings_por_membro: RankingsThoth | null;
};

export type PerfilPublicoAtleta = ComunidadeTitulos & {
  atleta_id: string;
  indice_ignicao: number;
  duelos_vencidos: number;
  grupo_supremo: string;
  tem_cinturao_duelo: boolean;
  is_rei_das_chamas: boolean;
  is_pilar_cooperativo: boolean;
};

function parseTitulos(row: Record<string, unknown>): ComunidadeTitulos {
  const temCinturao =
    row.tem_cinturao_duelo !== undefined
      ? Boolean(row.tem_cinturao_duelo)
      : Boolean(row.detem_cinturao_duelo)
        || Boolean(row.tem_cinturao_superiores)
        || Boolean(row.tem_cinturao_inferiores);
  const isPilar =
    row.is_pilar_cooperativo !== undefined
      ? Boolean(row.is_pilar_cooperativo)
      : Boolean(row.is_pilar_fogo_cosmico);

  return {
    temCinturaoDuelo: temCinturao,
    isReiDasChamas: Boolean(row.is_rei_das_chamas),
    isPilarCooperativo: isPilar,
  };
}

function parseVtcEntry(raw: unknown): RankingVtcEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const titulos = parseTitulos(row);
  return {
    posicao: Number(row.posicao ?? 0),
    atleta_id: String(row.atleta_id ?? ""),
    atleta_nome: String(row.atleta_nome ?? "Membro"),
    vtc_total: Number(row.vtc_total ?? 0),
    vtc_grupo: Number(row.vtc_grupo ?? 0),
    ...titulos,
  };
}

function parseRankingsThoth(payload: unknown): RankingsThoth | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const row = payload as Record<string, unknown>;
  const porMembroRaw = row.vtc_por_membro ?? row.rankings;
  const porMembroObj =
    porMembroRaw && typeof porMembroRaw === "object" && !Array.isArray(porMembroRaw)
      ? (porMembroRaw as Record<string, unknown>)
      : {};

  const mapList = (key: string) =>
    Array.isArray(porMembroObj[key])
      ? (porMembroObj[key] as unknown[])
          .map(parseVtcEntry)
          .filter((entry): entry is RankingVtcEntry => entry !== null)
      : [];

  const globalRaw = row.vtc_global;
  const vtcGlobal = Array.isArray(globalRaw)
    ? (globalRaw as unknown[])
        .map(parseVtcEntry)
        .filter((entry): entry is RankingVtcEntry => entry !== null)
    : [];

  return {
    janela_dias: Number(row.janela_dias ?? 14),
    janela_inicio: String(row.janela_inicio ?? ""),
    vtc_global: vtcGlobal,
    vtc_por_membro: {
      peito: mapList("peito"),
      ombros: mapList("ombros"),
      costas: mapList("costas"),
      pernas: mapList("pernas"),
    },
  };
}

function parseCampeoesCinturao(raw: unknown): CampeoesCinturao {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { SUPERIORES: null, INFERIORES: null };
  }
  const row = raw as Record<string, unknown>;
  return {
    SUPERIORES: row.SUPERIORES ? String(row.SUPERIORES) : null,
    INFERIORES: row.INFERIORES ? String(row.INFERIORES) : null,
  };
}

function parseSnapshot(payload: unknown): { data: ComunidadeArenaSnapshot | null; error: string | null } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { data: null, error: "Resposta inválida da arena." };
  }
  const row = payload as Record<string, unknown>;
  if (row.error) {
    return {
      data: null,
      error: String(row.message ?? row.error ?? "Arena indisponível."),
    };
  }

  const metaRaw = row.meta;
  if (!metaRaw || typeof metaRaw !== "object") {
    return { data: null, error: "Meta colectiva ausente na resposta." };
  }
  const metaObj = metaRaw as Record<string, unknown>;

  const pilaresLegacy = row.pilares_fogo_cosmico;
  const pilaresNew = row.pilares_cooperativos;
  const pilaresSource = Array.isArray(pilaresNew)
    ? pilaresNew
    : Array.isArray(pilaresLegacy)
      ? pilaresLegacy
      : [];

  const rankings =
    parseRankingsThoth(row.rankings_thoth) ?? parseRankingsThoth(row.rankings_por_membro);

  const campeoes = parseCampeoesCinturao(row.campeoes_cinturao);

  return {
    data: {
      mes_referencia: String(row.mes_referencia ?? ""),
      meta: {
        tonelagem_alvo_kg: Number(metaObj.tonelagem_alvo_kg ?? 0),
        tonelagem_atual_acumulada: Number(metaObj.tonelagem_atual_acumulada ?? 0),
        progresso_pct: Number(metaObj.progresso_pct ?? 0),
      },
      campeao_cinturao_id: row.campeao_cinturao_id ? String(row.campeao_cinturao_id) : null,
      campeoes_cinturao: campeoes,
      reis_das_chamas: Array.isArray(row.reis_das_chamas)
        ? (row.reis_das_chamas as ComunidadeAtletaRef[])
        : [],
      pilares_cooperativos: pilaresSource as ComunidadeAtletaRef[],
      duelos_ativos: Array.isArray(row.duelos_ativos)
        ? (row.duelos_ativos as ComunidadeDueloAtivo[])
        : [],
      rankings_thoth: rankings,
      rankings_por_membro: rankings,
    },
    error: null,
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
  if (!parsed.data) {
    return { data: null, error: parsed.error ?? "Resposta inválida da arena." };
  }

  return { data: parsed.data, error: null };
}

export async function fetchRankingsThoth(): Promise<{
  data: RankingsThoth | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("get_rankings_thoth");

  if (error) {
    if (error.code === "PGRST202") {
      const fallback = await supabase.rpc("get_rankings_por_membro");
      if (fallback.error) {
        return { data: null, error: "Rankings THOTH ainda não aplicados no servidor." };
      }
      const parsed = parseRankingsThoth(fallback.data);
      return parsed ? { data: parsed, error: null } : { data: null, error: "Resposta inválida." };
    }
    return { data: null, error: error.message };
  }

  const parsed = parseRankingsThoth(data);
  if (!parsed) {
    return { data: null, error: "Resposta inválida dos rankings." };
  }

  return { data: parsed, error: null };
}

/** @deprecated use fetchRankingsThoth */
export const fetchRankingsPorMembro = fetchRankingsThoth;

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

  const titulos = parseTitulos(row);

  return {
    data: {
      atleta_id: String(row.atleta_id ?? atletaId),
      indice_ignicao: Number(row.indice_ignicao ?? 0),
      duelos_vencidos: Number(row.duelos_vencidos ?? 0),
      grupo_supremo: String(row.grupo_supremo ?? "CINZAS"),
      tem_cinturao_duelo: Boolean(titulos.temCinturaoDuelo),
      is_rei_das_chamas: Boolean(titulos.isReiDasChamas),
      is_pilar_cooperativo: Boolean(titulos.isPilarCooperativo),
      ...titulos,
    },
    error: null,
  };
}

export function formatTonelagemKg(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M kg`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k kg`;
  return `${Math.round(value).toLocaleString("pt-BR")} kg`;
}

export function formatVtc(value: number): string {
  return Math.round(value).toLocaleString("pt-BR");
}

export function resolveCampeaoCinturaoPorTipo(
  campeoes: CampeoesCinturao,
  tipo: ComunidadeDueloAtivo["tipo_confronto"],
): string | null {
  return campeoes[tipo] ?? null;
}
