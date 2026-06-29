import { parseAcademiaConfig, type AcademiaConfig } from "@/lib/academia-config";
import { supabase } from "@/lib/supabase";

export type AcademiaActionResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; message: string };

function rpcErrorMessage(error: { message?: string } | null): string {
  return error?.message?.trim() || "Operação recusada. Tente novamente.";
}

export async function fetchAcademiaConfig(): Promise<
  { ok: true; config: AcademiaConfig } | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc("argos_get_academia_config");

  if (error) {
    return { ok: false, message: rpcErrorMessage(error) };
  }

  return { ok: true, config: parseAcademiaConfig(data) };
}

export async function sovereignUpdateAcademiaConfig(
  patch: Partial<
    Pick<
      AcademiaConfig,
      | "meta_coletiva_alvo_kg"
      | "phase_vtc_faisca"
      | "phase_vtc_brasa"
      | "phase_vtc_labareda"
      | "phase_vtc_fogo_cosmico"
    >
  >,
): Promise<AcademiaActionResult> {
  const { data, error } = await supabase.rpc("argos_sovereign_update_academia_config", {
    p_patch: patch,
  });

  if (error) {
    return { ok: false, message: rpcErrorMessage(error) };
  }

  return { ok: true, data: (data as Record<string, unknown>) ?? {} };
}

export async function sovereignSetMetaColetivaAlvo(
  alvoKg: number,
): Promise<AcademiaActionResult> {
  const { data, error } = await supabase.rpc("argos_sovereign_set_meta_coletiva_alvo", {
    p_alvo_kg: alvoKg,
  });

  if (error) {
    return { ok: false, message: rpcErrorMessage(error) };
  }

  return { ok: true, data: (data as Record<string, unknown>) ?? {} };
}

export async function clientSyncPlanoMeta(
  totalTreinos: number,
): Promise<AcademiaActionResult> {
  const { data, error } = await supabase.rpc("client_sync_plano_meta", {
    p_total_treinos: totalTreinos,
  });

  if (error) {
    return { ok: false, message: rpcErrorMessage(error) };
  }

  return { ok: true, data: (data as Record<string, unknown>) ?? {} };
}

export async function clientSubmitFeedback(
  categoria: string,
  mensagem: string,
): Promise<AcademiaActionResult> {
  const { data, error } = await supabase.rpc("client_submit_feedback", {
    p_categoria: categoria,
    p_mensagem: mensagem,
  });

  if (error) {
    return { ok: false, message: rpcErrorMessage(error) };
  }

  return { ok: true, data: (data as Record<string, unknown>) ?? {} };
}
