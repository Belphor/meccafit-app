import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";
import {
  DIET_WEEK_DAY_IDS,
  type DietWeekDayId,
  type WeeklyDietDraft,
} from "@/lib/forjador-vip-types";
import { supabase } from "@/lib/supabase";

export type ForjadorVipSyncResult =
  | { ok: true; recordId: string }
  | { ok: false; code: "SESSION" | "VALIDATION" | "RLS" | "NETWORK"; message: string };

function buildDiasPayload(draft: WeeklyDietDraft): Record<DietWeekDayId, { notas: string; concluido: boolean }> {
  const payload = {} as Record<DietWeekDayId, { notas: string; concluido: boolean }>;
  for (const dayId of DIET_WEEK_DAY_IDS) {
    payload[dayId] = {
      notas: draft.dias[dayId].notas.trim(),
      concluido: draft.dias[dayId].concluido,
    };
  }
  return payload;
}

export function validateWeeklyDietDraft(draft: WeeklyDietDraft): { ok: true } | { ok: false; message: string } {
  if (!draft.clientId.trim()) {
    return { ok: false, message: "Cliente não seleccionado." };
  }
  if (!draft.forgerId.trim()) {
    return { ok: false, message: "Forjador do vínculo VIP inválido." };
  }
  if (!draft.semanaRef.trim()) {
    return { ok: false, message: "Referência de semana inválida." };
  }
  return { ok: true };
}

export async function syncWeeklyDietToNucleus(
  athlete: ForjaBondedAthlete,
  draft: WeeklyDietDraft,
): Promise<ForjadorVipSyncResult> {
  const validation = validateWeeklyDietDraft(draft);
  if (!validation.ok) {
    return { ok: false, code: "VALIDATION", message: validation.message };
  }

  if (!athlete.hasVipBond) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Vínculo VIP activo obrigatório para publicar dieta semanal.",
    };
  }

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    const operatorId = session?.user?.id?.trim();
    if (sessionError || !operatorId) {
      return { ok: false, code: "SESSION", message: "Sessão inválida. Faça login novamente." };
    }

    const dias = buildDiasPayload(draft);

    const { data: existing, error: fetchError } = await supabase
      .from("vip_dieta_semanal")
      .select("id")
      .eq("client_id", athlete.clientId)
      .eq("activo", true)
      .maybeSingle();

    if (fetchError) {
      const rlsHint = fetchError.message?.toLowerCase().includes("row-level security");
      return {
        ok: false,
        code: rlsHint ? "RLS" : "NETWORK",
        message: fetchError.message,
      };
    }

    if (existing?.id) {
      const { data, error } = await supabase
        .from("vip_dieta_semanal")
        .update({
          semana_ref: draft.semanaRef,
          dias,
          forger_id: athlete.forgerId,
        })
        .eq("id", existing.id)
        .select("id")
        .single();

      if (error) {
        const rlsHint = error.message?.toLowerCase().includes("row-level security");
        return {
          ok: false,
          code: rlsHint ? "RLS" : "NETWORK",
          message: error.message,
        };
      }

      if (!data?.id) {
        return { ok: false, code: "NETWORK", message: "Dieta semanal não confirmada pelo núcleo." };
      }

      return { ok: true, recordId: data.id };
    }

    const { data, error } = await supabase
      .from("vip_dieta_semanal")
      .insert({
        client_id: athlete.clientId,
        forger_id: athlete.forgerId,
        semana_ref: draft.semanaRef,
        dias,
        activo: true,
      })
      .select("id")
      .single();

    if (error) {
      const rlsHint = error.message?.toLowerCase().includes("row-level security");
      return {
        ok: false,
        code: rlsHint ? "RLS" : "NETWORK",
        message: error.message,
      };
    }

    if (!data?.id) {
      return { ok: false, code: "NETWORK", message: "Dieta semanal não confirmada pelo núcleo." };
    }

    return { ok: true, recordId: data.id };
  } catch {
    return { ok: false, code: "NETWORK", message: "Falha de rede ao sincronizar dieta semanal." };
  }
}
