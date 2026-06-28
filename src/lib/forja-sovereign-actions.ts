import { supabase } from "@/lib/supabase";
import type { ForjaBondedAthlete, ForjaVtcFeedEntry } from "@/lib/forja-dashboard";
import type { Database } from "@/types/database.types";

type ForjaRpc = Database["public"]["Functions"] & {
  argos_forja_monitor_athletes: {
    Args: Record<string, never>;
    Returns: ForjaBondedAthlete[] | unknown;
  };
  argos_forja_fraud_signals: {
    Args: { p_cliente_id?: string | null };
    Returns: { signals: ForjaFraudSignal[]; count: number };
  };
  argos_forja_vtc_feed: {
    Args: { p_limit?: number | null };
    Returns: ForjaVtcFeedEntry[];
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
  argos_forja_adjust_client_vtc: {
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
  return error?.message?.trim() || "Operação recusada. Verifique permissões e tente novamente.";
}

function mapMonitorAthleteRow(row: Record<string, unknown>): ForjaBondedAthlete {
  return {
    bondId: String(row.bondId ?? `global-${row.clientId}`),
    clientId: String(row.clientId),
    forgerId: String(row.forgerId ?? ""),
    displayName: String(row.displayName ?? "Cliente"),
    lineageName: row.lineageName ? String(row.lineageName) : null,
    phaseTier: Math.min(5, Math.max(1, Number(row.phaseTier ?? 1))),
    bondedAt: String(row.bondedAt ?? new Date().toISOString()),
    forgerName: row.forgerName ? String(row.forgerName) : null,
    statusAltar: row.statusAltar ? String(row.statusAltar) : null,
    isGlobalListing: Boolean(row.isGlobalListing),
    hasVipBond: Boolean(row.hasVipBond),
    vtcToday: Number(row.vtcToday ?? 0),
    vtcAvg7d: Number(row.vtcAvg7d ?? 0),
    vtc30d: Number(row.vtc30d ?? 0),
  };
}

export async function fetchForjaMonitorAthletes(): Promise<
  { ok: true; athletes: ForjaBondedAthlete[] } | { ok: false; message: string }
> {
  const session = await requireSession();
  if (!session.ok) return session;

  const { data, error } = await forjaSupabase.rpc(
    "argos_forja_monitor_athletes" as keyof ForjaRpc,
    {} as ForjaRpc["argos_forja_monitor_athletes"]["Args"],
  );

  if (error) {
    return { ok: false, message: rpcErrorMessage(error) };
  }

  const rows = (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>;
  return { ok: true, athletes: rows.map(mapMonitorAthleteRow) };
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

export async function fetchForjaVtcFeed(
  limit = 64,
): Promise<{ ok: true; entries: ForjaVtcFeedEntry[] } | { ok: false; message: string }> {
  const session = await requireSession();
  if (!session.ok) return session;

  const { data, error } = await forjaSupabase.rpc("argos_forja_vtc_feed", {
    p_limit: limit,
  });

  if (error) {
    return { ok: false, message: rpcErrorMessage(error) };
  }

  const entries = (data as ForjaVtcFeedEntry[] | null) ?? [];
  return { ok: true, entries: Array.isArray(entries) ? entries : [] };
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
  vtc_today_set?: number;
  reset_vtc_today?: boolean;
};

export type ForjaVtcAdjustPatch = {
  vtc_today_delta?: number;
  vtc_today_set?: number;
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

export async function forjaAdjustClientVtc(
  targetId: string,
  patch: ForjaVtcAdjustPatch,
): Promise<ForjaActionResult> {
  const session = await requireSession();
  if (!session.ok) return session;

  const { data, error } = await forjaSupabase.rpc("argos_forja_adjust_client_vtc", {
    p_target_id: targetId,
    p_patch: patch,
  });

  if (error) return { ok: false, message: rpcErrorMessage(error) };
  return { ok: true, data: (data as Record<string, unknown>) ?? {} };
}
