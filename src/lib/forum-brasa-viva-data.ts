import { ARGOS_WEIGHT_MAX } from "@/lib/dashboard-config";
import { mapCommunityMuralRowsToPosts, type CommunityMuralRow } from "@/lib/dashboard-data";
import { resolveForumCardPhase } from "@/features/forum-brasa-viva/forum-phase-styles";
import type {
  ForumBrasaVivaRpcRow,
  ForumBrasaVivaTopic,
} from "@/features/forum-brasa-viva/types";
import { resolvePhaseTier } from "@/lib/custom-preferences";
import type { MuralPost } from "@/lib/mock-data";
import { getActiveSupabaseSession, supabase } from "@/lib/supabase";

export const FORUM_BRASA_VIVA_DEFAULT_LIMIT = 48;

function normalizeWeight(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(ARGOS_WEIGHT_MAX, Math.round(parsed * 100) / 100);
}

function mapRpcRowToTopic(row: ForumBrasaVivaRpcRow): ForumBrasaVivaTopic {
  const authorPhaseTier = resolvePhaseTier(row.author_phase_tier);
  return {
    id: `forum-${row.id}`,
    title: row.topic_title?.trim() || "Tópico Brasa-Viva",
    body: row.topic_body?.trim() || "",
    authorName: row.author_name?.trim() || "Membro da Linhagem",
    authorLineage: row.author_lineage?.trim() || "Linhagem Meccafit",
    authorPhaseTier,
    authorCardPhase: resolveForumCardPhase(authorPhaseTier),
    weightKg: normalizeWeight(row.peso),
    series: Math.max(1, Number(row.series) || 1),
    createdAt: row.registrado_em ?? new Date().toISOString(),
  };
}

function mapMuralFallbackRows(rows: CommunityMuralRow[]): ForumBrasaVivaTopic[] {
  return mapCommunityMuralRowsToPosts(rows).map((post) => ({
    id: post.id.replace(/^mural-/, "forum-"),
    title: post.exerciseName,
    body: "Superação registrada no Fórum Brasa-Viva — volume validado por ARGOS.",
    authorName: post.athleteName ?? "Membro da Linhagem",
    authorLineage: post.lineageName ?? "Linhagem Meccafit",
    authorPhaseTier: 2,
    authorCardPhase: resolveForumCardPhase(2),
    weightKg: post.weight,
    series: post.series,
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
    body: "Superação registrada no Fórum Brasa-Viva — volume validado por ARGOS.",
    authorName: post.athleteName ?? "Membro da Linhagem",
    authorLineage: post.lineageName ?? "Linhagem Meccafit",
    authorPhaseTier: 2,
    authorCardPhase: resolveForumCardPhase(2),
    weightKg: post.weight,
    series: post.series,
    createdAt: post.createdAt,
  }));
}

export function mapInitialForumTopics(
  muralRows: CommunityMuralRow[] | null | undefined,
): ForumBrasaVivaTopic[] {
  if (!muralRows?.length) return [];
  return mapMuralFallbackRows(muralRows);
}
