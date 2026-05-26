/**
 * Normaliza auth user.id → cliente_id para public.historico_treinos.
 * A coluna oficial é cliente_id (nunca user_id no payload).
 */
export function resolveHistoricoClienteId(rawUserId: string | null | undefined): string | null {
  if (rawUserId === null || rawUserId === undefined) return null;

  const normalized = rawUserId.trim().toLowerCase();
  if (!normalized || normalized === "undefined" || normalized === "null") return null;

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  if (!uuidPattern.test(normalized)) return null;

  return normalized;
}
