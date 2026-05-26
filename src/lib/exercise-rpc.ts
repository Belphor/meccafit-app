/**
 * Normaliza IDs de exercício antes de RPC/filtros Supabase.
 * "geral" e valores não numéricos viram null — evita integer cast inválido.
 */
export function resolveRpcExercicioId(
  rawId: string | number | null | undefined,
): number | null {
  if (rawId === null || rawId === undefined) return null;

  if (typeof rawId === "number") {
    return Number.isFinite(rawId) && rawId > 0 ? Math.trunc(rawId) : null;
  }

  const normalized = String(rawId).trim().toLowerCase();
  if (!normalized || normalized === "geral") return null;

  if (/^\d+$/.test(normalized)) {
    return Number.parseInt(normalized, 10);
  }

  return null;
}

export function resolveRpcExercicioIdParam(
  rawId: string | number | null | undefined,
): string | null {
  const numericId = resolveRpcExercicioId(rawId);
  return numericId === null ? null : String(numericId);
}

/** Coluna integer `exercicio_id` em historico_treinos — 0 = fallback seguro. */
export function resolveHistoricoExercicioId(
  rawId: string | number | null | undefined,
): number {
  return resolveRpcExercicioId(rawId) ?? 0;
}
