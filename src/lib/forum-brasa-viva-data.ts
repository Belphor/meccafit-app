import { ARGOS_WEIGHT_MAX } from "@/lib/dashboard-config";
import { LINHAGEM_PADRAO } from "@/lib/client-lore-copy";
import { mapCommunityMuralRowsToPosts, type CommunityMuralRow } from "@/lib/dashboard-data";
import { muralBodyForExercise, resolveMuralTopicBody } from "@/lib/mural-copy";
import { formatMuralMetricBadge } from "@/lib/mural-metric";
import type {
  ForumBrasaVivaRpcRow,
  ForumBrasaVivaTopic,
} from "@/features/forum-brasa-viva/types";
import type { MuralPost } from "@/lib/mock-data";
import { getActiveSupabaseSession, supabase } from "@/lib/supabase";

export const FORUM_BRASA_VIVA_DEFAULT_LIMIT = 48;

function normalizeWeight(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(ARGOS_WEIGHT_MAX, Math.round(parsed * 100) / 100);
}

function mapRpcRowToTopic(row: ForumBrasaVivaRpcRow): ForumBrasaVivaTopic {
  const title = row.topic_title?.trim() || "Ascensão no altar";
  const weightKg = normalizeWeight(row.peso);
  const series = Math.max(1, Number(row.series) || 1);
  const exercicioId =
    row.exercicio_id === null || row.exercicio_id === undefined
      ? null
      : Number(row.exercicio_id);

  return {
    id: `forum-${row.id}`,
    title,
    body: resolveMuralTopicBody(row.topic_body, title, weightKg, exercicioId),
    authorId: String(row.author_id ?? ""),
    authorName: row.author_name?.trim() || "Membro da Linhagem",
    authorLineage: row.author_lineage?.trim() || LINHAGEM_PADRAO,
    authorAvatarPath: row.author_avatar_path ? String(row.author_avatar_path) : null,
    temCinturaoDuelo: Boolean(row.tem_cinturao_duelo ?? row.detem_cinturao_duelo),
    isReiDasChamas: Boolean(row.is_rei_chamas_superiores ?? row.is_rei_chamas_inferiores ?? row.is_rei_das_chamas),
    isPilarCooperativo: Boolean(row.is_pilar_cooperativo ?? row.is_pilar_fogo_cosmico),
    weightKg,
    series,
    exercicioId,
    metricBadge: weightKg > 0 ? formatMuralMetricBadge(title, weightKg, series, exercicioId) : "",
    createdAt: row.registrado_em ?? new Date().toISOString(),
  };
}

function mapMuralFallbackRows(rows: CommunityMuralRow[]): ForumBrasaVivaTopic[] {
  return mapCommunityMuralRowsToPosts(rows).map((post) => ({
    id: post.id.replace(/^mural-/, "forum-"),
    title: post.exerciseName,
    body: muralBodyForExercise(post.exerciseName, post.weight, post.exercicioId),
    authorId: post.athleteId ?? "",
    authorName: post.athleteName ?? "Membro da Linhagem",
    authorLineage: post.lineageName ?? LINHAGEM_PADRAO,
    authorAvatarPath: post.athleteAvatarPath ?? null,
    temCinturaoDuelo: post.temCinturaoDuelo ?? false,
    isReiDasChamas: post.isReiDasChamas ?? false,
    isPilarCooperativo: post.isPilarCooperativo ?? false,
    weightKg: post.weight,
    series: post.series,
    exercicioId: post.exercicioId ?? null,
    metricBadge:
      post.weight > 0
        ? formatMuralMetricBadge(post.exerciseName, post.weight, post.series, post.exercicioId)
        : "",
    createdAt: post.createdAt,
  }));
}

function isMissingForumRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST202" || (error.message ?? "").includes("argos_fetch_forum_brasa_viva");
}

export async function fetchForumBrasaVivaTopics(
  limit: number = FORUM_BRASA_VIVA_DEFAULT_LIMIT,
): Promise<{ data: ForumBrasaVivaTopic[]; error: string | null }> {
  const session = await getActiveSupabaseSession();
  if (!session) {
    return { data: [], error: "Sessão expirada. Retorne ao Portal de Brasa." };
  }

  const boundedLimit = Math.min(100, Math.max(1, limit));

  const { data, error } = await supabase.rpc("argos_fetch_forum_brasa_viva", {
    p_limit: boundedLimit,
  });

  if (!error && Array.isArray(data)) {
    return {
      data: (data as ForumBrasaVivaRpcRow[]).map(mapRpcRowToTopic),
      error: null,
    };
  }

  if (!isMissingForumRpc(error)) {
    return { data: [], error: error?.message ?? "Falha ao carregar o Fórum Brasa-Viva." };
  }

  const { data: muralRows, error: muralError } = await supabase.rpc(
    "argos_fetch_mural_comunidade",
    { p_limit: boundedLimit },
  );

  if (muralError) {
    return { data: [], error: muralError.message ?? "Falha ao carregar tópicos." };
  }

  return {
    data: mapMuralFallbackRows((muralRows ?? []) as CommunityMuralRow[]),
    error: null,
  };
}

export function mapMuralPostsToForumTopics(posts: MuralPost[]): ForumBrasaVivaTopic[] {
  return posts.map((post) => ({
    id: post.id.replace(/^mural-/, "forum-"),
    title: post.exerciseName,
    body: muralBodyForExercise(post.exerciseName, post.weight, post.exercicioId),
    authorId: post.athleteId ?? "",
    authorName: post.athleteName ?? "Membro da Linhagem",
    authorLineage: post.lineageName ?? LINHAGEM_PADRAO,
    authorAvatarPath: post.athleteAvatarPath ?? null,
    temCinturaoDuelo: post.temCinturaoDuelo ?? false,
    isReiDasChamas: post.isReiDasChamas ?? false,
    isPilarCooperativo: post.isPilarCooperativo ?? false,
    weightKg: post.weight,
    series: post.series,
    exercicioId: post.exercicioId ?? null,
    metricBadge:
      post.weight > 0
        ? formatMuralMetricBadge(post.exerciseName, post.weight, post.series, post.exercicioId)
        : "",
    createdAt: post.createdAt,
  }));
}

export function mapInitialForumTopics(
  muralRows: CommunityMuralRow[] | null | undefined,
): ForumBrasaVivaTopic[] {
  if (!muralRows?.length) return [];
  return mapMuralFallbackRows(muralRows);
}
