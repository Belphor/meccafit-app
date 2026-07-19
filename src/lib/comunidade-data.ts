/**
 * Comunidade · Arena Cooperativa — leitura via RPC (ARGOS-safe)
 */

import { supabase } from "@/lib/supabase";

export type ComunidadeTitulos = {
  temCinturaoDuelo?: boolean;
  isReiDasChamas?: boolean;
  isReiChamasSuperiores?: boolean;
  isReiChamasInferiores?: boolean;
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

export type DueloClienteOption = {
  id: string;
  nome: string;
  is_vip?: boolean;
  avatar_path?: string | null;
};

export type DueloConvitePendente = {
  id: string;
  tipo_confronto: ComunidadeDueloAtivo["tipo_confronto"];
  atleta_desafiante_id: string;
  desafiante_nome: string;
  created_at: string;
};

export type DueloClientesPage = {
  clientes: DueloClienteOption[];
  total: number;
  offset: number;
  limit: number;
};

export type ComunidadeAtletaRef = {
  atleta_id: string;
};

export type CampeoesCinturao = {
  SUPERIORES: string | null;
  INFERIORES: string | null;
};

export type ReisChamas = {
  SUPERIORES_MASCULINO: string | null;
  SUPERIORES_FEMININO: string | null;
  INFERIORES_MASCULINO: string | null;
  INFERIORES_FEMININO: string | null;
  /** Legado · primeiro titular encontrado */
  SUPERIORES: string | null;
  INFERIORES: string | null;
};

export type RankingVtcEntry = ComunidadeTitulos & {
  posicao: number;
  atleta_id: string;
  atleta_nome: string;
  atleta_avatar_path?: string | null;
  vtc_total: number;
  vtc_grupo: number;
};

export type RankingsVtcFaixa = {
  superiores: RankingVtcEntry[];
  inferiores: RankingVtcEntry[];
};

export type RankingsThothSlice = {
  janela_tipo?: "mensal";
  mes_referencia?: string;
  janela_inicio: string;
  janela_fim?: string;
  sexo?: "masculino" | "feminino";
  vtc_global: RankingVtcEntry[];
  vtc_faixa?: RankingsVtcFaixa;
  vtc_por_membro: {
    peito: RankingVtcEntry[];
    ombros: RankingVtcEntry[];
    bracos: RankingVtcEntry[];
    costas: RankingVtcEntry[];
    pernas: RankingVtcEntry[];
  };
};

export type RankingsThoth = RankingsThothSlice & {
  /** @deprecated rankings passaram a ser mensais */
  janela_dias?: number;
  por_genero?: {
    masculino: RankingsThothSlice;
    feminino: RankingsThothSlice;
  };
};

/** @deprecated use RankingsThoth */
export type RankingsPorMembro = RankingsThoth;

export type ComunidadeArenaSnapshot = {
  mes_referencia: string;
  meta: ComunidadeMeta;
  campeao_cinturao_id: string | null;
  campeoes_cinturao: CampeoesCinturao;
  reis_chamas: ReisChamas;
  /** legado · lista com faixa */
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
  grupo_supremo: string | null;
  tem_cinturao_duelo: boolean;
  is_rei_das_chamas: boolean;
  is_rei_chamas_superiores: boolean;
  is_rei_chamas_inferiores: boolean;
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
  const isReiSup = Boolean(row.is_rei_chamas_superiores);
  const isReiInf = Boolean(row.is_rei_chamas_inferiores);

  return {
    temCinturaoDuelo: temCinturao,
    isReiChamasSuperiores: isReiSup,
    isReiChamasInferiores: isReiInf,
    isReiDasChamas: isReiSup || isReiInf || Boolean(row.is_rei_das_chamas),
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
    atleta_avatar_path: row.atleta_avatar_path ? String(row.atleta_avatar_path) : null,
    vtc_total: Number(row.vtc_total ?? 0),
    vtc_grupo: Number(row.vtc_grupo ?? 0),
    ...titulos,
  };
}

function parseRankingsThothSlice(payload: unknown): RankingsThothSlice | null {
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

  const faixaRaw = row.vtc_faixa;
  const faixaObj =
    faixaRaw && typeof faixaRaw === "object" && !Array.isArray(faixaRaw)
      ? (faixaRaw as Record<string, unknown>)
      : null;
  const mapFaixaList = (key: string) =>
    faixaObj && Array.isArray(faixaObj[key])
      ? (faixaObj[key] as unknown[])
          .map(parseVtcEntry)
          .filter((entry): entry is RankingVtcEntry => entry !== null)
      : [];

  return {
    janela_tipo: row.janela_tipo === "mensal" ? "mensal" : undefined,
    mes_referencia: row.mes_referencia ? String(row.mes_referencia) : undefined,
    janela_inicio: String(row.janela_inicio ?? ""),
    janela_fim: row.janela_fim ? String(row.janela_fim) : undefined,
    sexo: row.sexo === "masculino" || row.sexo === "feminino" ? row.sexo : undefined,
    vtc_global: vtcGlobal,
    vtc_faixa: faixaObj
      ? {
          superiores: mapFaixaList("superiores"),
          inferiores: mapFaixaList("inferiores"),
        }
      : undefined,
    vtc_por_membro: {
      peito: mapList("peito"),
      ombros: mapList("ombros"),
      bracos: mapList("bracos"),
      costas: mapList("costas"),
      pernas: mapList("pernas"),
    },
  };
}

function parseRankingsThoth(payload: unknown): RankingsThoth | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const row = payload as Record<string, unknown>;
  const base = parseRankingsThothSlice(payload);
  if (!base) return null;

  const porGeneroRaw = row.por_genero;
  let porGenero: RankingsThoth["por_genero"];
  if (porGeneroRaw && typeof porGeneroRaw === "object" && !Array.isArray(porGeneroRaw)) {
    const generoObj = porGeneroRaw as Record<string, unknown>;
    const masc = parseRankingsThothSlice(generoObj.masculino);
    const fem = parseRankingsThothSlice(generoObj.feminino);
    if (masc && fem) {
      porGenero = { masculino: masc, feminino: fem };
    }
  }

  return {
    ...base,
    janela_dias: row.janela_dias !== undefined ? Number(row.janela_dias) : undefined,
    por_genero: porGenero,
  };
}

function parseReisChamas(raw: unknown): ReisChamas {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      SUPERIORES_MASCULINO: null,
      SUPERIORES_FEMININO: null,
      INFERIORES_MASCULINO: null,
      INFERIORES_FEMININO: null,
      SUPERIORES: null,
      INFERIORES: null,
    };
  }
  const row = raw as Record<string, unknown>;
  return {
    SUPERIORES_MASCULINO: row.SUPERIORES_MASCULINO ? String(row.SUPERIORES_MASCULINO) : null,
    SUPERIORES_FEMININO: row.SUPERIORES_FEMININO ? String(row.SUPERIORES_FEMININO) : null,
    INFERIORES_MASCULINO: row.INFERIORES_MASCULINO ? String(row.INFERIORES_MASCULINO) : null,
    INFERIORES_FEMININO: row.INFERIORES_FEMININO ? String(row.INFERIORES_FEMININO) : null,
    SUPERIORES: row.SUPERIORES ? String(row.SUPERIORES) : null,
    INFERIORES: row.INFERIORES ? String(row.INFERIORES) : null,
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
  const reisChamas = parseReisChamas(row.reis_chamas);

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
      reis_chamas: reisChamas,
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

export async function fetchComunidadeArenaSnapshot(options?: {
  skipSideEffects?: boolean;
}): Promise<{
  data: ComunidadeArenaSnapshot | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("get_comunidade_arena_snapshot", {
    p_skip_side_effects: options?.skipSideEffects ?? true,
  });

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
      grupo_supremo: row.grupo_supremo ? String(row.grupo_supremo) : null,
      tem_cinturao_duelo: Boolean(titulos.temCinturaoDuelo),
      is_rei_das_chamas: Boolean(titulos.isReiDasChamas),
      is_rei_chamas_superiores: Boolean(titulos.isReiChamasSuperiores),
      is_rei_chamas_inferiores: Boolean(titulos.isReiChamasInferiores),
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

function parseRpcError(row: Record<string, unknown> | null | undefined): string | null {
  if (!row?.error) return null;
  return String(row.message ?? row.error);
}

export async function fetchClientesDuelo(options?: {
  search?: string;
  offset?: number;
  limit?: number;
}): Promise<{
  data: DueloClientesPage;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("list_clientes_duelo", {
    p_search: options?.search?.trim() || null,
    p_offset: options?.offset ?? 0,
    p_limit: options?.limit ?? 10,
  });

  if (error) {
    if (error.code === "PGRST202") {
      return {
        data: { clientes: [], total: 0, offset: 0, limit: 10 },
        error: "Lista de clientes para duelo ainda não aplicada no servidor.",
      };
    }
    return {
      data: { clientes: [], total: 0, offset: 0, limit: 10 },
      error: error.message,
    };
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      data: { clientes: [], total: 0, offset: 0, limit: 10 },
      error: "Resposta inválida da lista de clientes.",
    };
  }

  const row = data as Record<string, unknown>;
  const rpcError = parseRpcError(row);
  if (rpcError) {
    return {
      data: { clientes: [], total: 0, offset: 0, limit: 10 },
      error: rpcError,
    };
  }

  const clientes = Array.isArray(row.clientes) ? row.clientes : [];
  const parsed: DueloClienteOption[] = clientes.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    const id = typeof entry.id === "string" ? entry.id : null;
    if (!id) return [];
    return [
      {
        id,
        nome: String(entry.nome ?? "Membro da Linhagem"),
        is_vip: Boolean(entry.is_vip),
        avatar_path: entry.avatar_path ? String(entry.avatar_path) : null,
      },
    ];
  });

  return {
    data: {
      clientes: parsed,
      total: Number(row.total ?? parsed.length),
      offset: Number(row.offset ?? options?.offset ?? 0),
      limit: Number(row.limit ?? options?.limit ?? 10),
    },
    error: null,
  };
}

export async function criarDuelo(
  desafiadoId: string,
  tipo: ComunidadeDueloAtivo["tipo_confronto"],
): Promise<{
  data: { duelo_id: string; status?: string } | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("client_criar_duelo", {
    p_desafiado_id: desafiadoId,
    p_tipo: tipo,
  });

  if (error) {
    if (error.code === "PGRST202") {
      return { data: null, error: "Criação de duelo ainda não aplicada no servidor." };
    }
    return { data: null, error: error.message };
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { data: null, error: "Resposta inválida ao criar duelo." };
  }

  const row = data as Record<string, unknown>;
  const rpcError = parseRpcError(row);
  if (rpcError) return { data: null, error: rpcError };

  const dueloId = typeof row.duelo_id === "string" ? row.duelo_id : null;
  const status = typeof row.status === "string" ? row.status : undefined;
  if (!row.ok || !dueloId) {
    return { data: null, error: "Não foi possível criar o duelo." };
  }

  return { data: { duelo_id: dueloId, status }, error: null };
}

export async function fetchDueloConvitePendente(): Promise<{
  data: DueloConvitePendente | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("get_duelo_convite_pendente");

  if (error) {
    if (error.code === "PGRST202") {
      return { data: null, error: null };
    }
    return { data: null, error: error.message };
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { data: null, error: "Resposta inválida do convite." };
  }

  const row = data as Record<string, unknown>;
  const rpcError = parseRpcError(row);
  if (rpcError) return { data: null, error: rpcError };

  const convite = row.convite;
  if (!convite || typeof convite !== "object") {
    return { data: null, error: null };
  }

  const entry = convite as Record<string, unknown>;
  const id = typeof entry.id === "string" ? entry.id : null;
  if (!id) return { data: null, error: null };

  return {
    data: {
      id,
      tipo_confronto: entry.tipo_confronto as DueloConvitePendente["tipo_confronto"],
      atleta_desafiante_id: String(entry.atleta_desafiante_id ?? ""),
      desafiante_nome: String(entry.desafiante_nome ?? "Atleta"),
      created_at: String(entry.created_at ?? ""),
    },
    error: null,
  };
}

export async function responderDuelo(
  dueloId: string,
  aceitar: boolean,
): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc("client_responder_duelo", {
    p_duelo_id: dueloId,
    p_aceitar: aceitar,
  });

  if (error) {
    if (error.code === "PGRST202") {
      return { ok: false, error: "Resposta de duelo ainda não aplicada no servidor." };
    }
    return { ok: false, error: error.message };
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "Resposta inválida ao responder duelo." };
  }

  const row = data as Record<string, unknown>;
  const rpcError = parseRpcError(row);
  if (rpcError) return { ok: false, error: rpcError };

  return { ok: Boolean(row.ok), error: null };
}
