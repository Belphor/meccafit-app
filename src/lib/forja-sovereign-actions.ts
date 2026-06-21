import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

type ForjaRpc = Database["public"]["Functions"] & {
  argos_forja_fraud_signals: {
    Args: { p_cliente_id?: string | null };
    Returns: { signals: ForjaFraudSignal[]; count: number };
  };
  argos_batch_upsert_planilhas_forjador: {
    Args: { p_atleta_id: string; p_rows: unknown };
    Returns: { ok: boolean; rows_upserted: number };
  };
  argos_sovereign_purify_to_ashes: {
    Args: { p_target_id: string };
    Returns: Record<string, unknown>;
  };
  argos_sovereign_deactivate_account: {
    Args: { p_target_id: string; p_reason?: string | null };
    Returns: Record<string, unknown>;
  };
  argos_sovereign_reactivate_account: {
    Args: { p_target_id: string };
    Returns: Record<string, unknown>;
  };
  argos_sovereign_modify_statistics: {
    Args: { p_target_id: string; p_patch: Record<string, unknown> };
    Returns: Record<string, unknown>;
  };
};

const forjaSupabase = supabase as typeof supabase & {
  rpc<K extends keyof ForjaRpc>(
    fn: K,
    args: ForjaRpc[K]["Args"],
  ): ReturnType<typeof supabase.rpc>;
};

export type ForjaActionResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; message: string };

export type ForjaFraudSignal = {
  severity: "warn" | "critical";
  code: string;
  atleta_id: string;
  display_name: string;
  message: string;
};

async function requireSession(): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user?.id) {
    return { ok: false, message: "Sessão inválida." };
  }

  return { ok: true, userId: session.user.id };
}

function rpcErrorMessage(error: { message?: string } | null): string {
  return error?.message?.trim() || "Operação recusada pelo núcleo ARGOS.";
}

export async function fetchForjaFraudSignals(
  clienteId?: string | null,
): Promise<{ ok: true; signals: ForjaFraudSignal[] } | { ok: false; message: string }> {
  const session = await requireSession();
  if (!session.ok) return session;

  const { data, error } = await forjaSupabase.rpc("argos_forja_fraud_signals", {
    p_cliente_id: clienteId ?? null,
  });

  if (error) {
    return { ok: false, message: rpcErrorMessage(error) };
  }

  const payload = data as { signals?: ForjaFraudSignal[] } | null;
  return { ok: true, signals: payload?.signals ?? [] };
}

export async function batchUpsertPlanilhasForjador(
  atletaId: string,
  rows: Array<{ dia_semana: number; grupo_muscular: string; ordem: number }>,
): Promise<ForjaActionResult> {
  const session = await requireSession();
  if (!session.ok) return session;

  const { data, error } = await forjaSupabase.rpc("argos_batch_upsert_planilhas_forjador", {
    p_atleta_id: atletaId,
    p_rows: rows,
  });

  if (error) return { ok: false, message: rpcErrorMessage(error) };
  return { ok: true, data: (data as Record<string, unknown>) ?? {} };
}

export async function sovereignPurifyToAshes(targetId: string): Promise<ForjaActionResult> {
  const session = await requireSession();
  if (!session.ok) return session;

  const { data, error } = await forjaSupabase.rpc("argos_sovereign_purify_to_ashes", {
    p_target_id: targetId,
  });

  if (error) return { ok: false, message: rpcErrorMessage(error) };
  return { ok: true, data: (data as Record<string, unknown>) ?? {} };
}

export async function sovereignDeactivateAccount(
  targetId: string,
  reason?: string,
): Promise<ForjaActionResult> {
  const session = await requireSession();
  if (!session.ok) return session;

  const { data, error } = await forjaSupabase.rpc("argos_sovereign_deactivate_account", {
    p_target_id: targetId,
    p_reason: reason?.trim() || null,
  });

  if (error) return { ok: false, message: rpcErrorMessage(error) };
  return { ok: true, data: (data as Record<string, unknown>) ?? {} };
}

export async function sovereignReactivateAccount(targetId: string): Promise<ForjaActionResult> {
  const session = await requireSession();
  if (!session.ok) return session;

  const { data, error } = await forjaSupabase.rpc("argos_sovereign_reactivate_account", {
    p_target_id: targetId,
  });

  if (error) return { ok: false, message: rpcErrorMessage(error) };
  return { ok: true, data: (data as Record<string, unknown>) ?? {} };
}

export type SovereignStatsPatch = {
  phase_tier?: number;
  vtc_today_delta?: number;
  reset_vtc_today?: boolean;
};

export async function sovereignModifyStatistics(
  targetId: string,
  patch: SovereignStatsPatch,
): Promise<ForjaActionResult> {
  const session = await requireSession();
  if (!session.ok) return session;

  const { data, error } = await forjaSupabase.rpc("argos_sovereign_modify_statistics", {
    p_target_id: targetId,
    p_patch: patch,
  });

  if (error) return { ok: false, message: rpcErrorMessage(error) };
  return { ok: true, data: (data as Record<string, unknown>) ?? {} };
}
