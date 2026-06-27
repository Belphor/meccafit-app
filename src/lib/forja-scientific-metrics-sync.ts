import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";
import {
  scientificEntryToSnapshotPayload,
  snapshotPayloadToPerimetrosJson,
  type ScientificMetricsEntry,
} from "@/lib/scientific-metrics-types";
import { supabase } from "@/lib/supabase";

export type ScientificMetricsSyncResult =
  | { ok: true; recordId: string }
  | { ok: false; code: "SESSION" | "VALIDATION" | "RLS" | "NETWORK"; message: string };

export async function syncLatestScientificMetricsToNucleus(
  athlete: ForjaBondedAthlete,
  entry: ScientificMetricsEntry,
): Promise<ScientificMetricsSyncResult> {
  if (!athlete.hasVipBond) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Vínculo VIP activo obrigatório para publicar antropometria.",
    };
  }

  const payload = scientificEntryToSnapshotPayload(entry);
  const perimetros = snapshotPayloadToPerimetrosJson(payload);

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    const operatorId = session?.user?.id?.trim();
    if (sessionError || !operatorId) {
      return { ok: false, code: "SESSION", message: "Sessão inválida. Faça login novamente." };
    }

    const { data: existing, error: fetchError } = await supabase
      .from("vip_medidas_corporais")
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

    const row = {
      peso_kg: payload.pesoKg,
      altura_cm: payload.alturaCm,
      perimetros,
      medido_em: payload.medidoEm,
      forger_id: athlete.forgerId,
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from("vip_medidas_corporais")
        .update(row)
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
        return { ok: false, code: "NETWORK", message: "Snapshot não confirmado pelo núcleo." };
      }

      return { ok: true, recordId: data.id };
    }

    const { data, error } = await supabase
      .from("vip_medidas_corporais")
      .insert({
        client_id: athlete.clientId,
        activo: true,
        ...row,
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
      return { ok: false, code: "NETWORK", message: "Snapshot não confirmado pelo núcleo." };
    }

    return { ok: true, recordId: data.id };
  } catch {
    return { ok: false, code: "NETWORK", message: "Falha de rede ao sincronizar antropometria." };
  }
}

export async function deleteScientificMetricsSnapshot(
  clientId: string,
): Promise<ScientificMetricsSyncResult> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user?.id) {
      return { ok: false, code: "SESSION", message: "Sessão inválida." };
    }

    const { error } = await supabase
      .from("vip_medidas_corporais")
      .delete()
      .eq("client_id", clientId)
      .eq("activo", true);

    if (error) {
      const rlsHint = error.message?.toLowerCase().includes("row-level security");
      return {
        ok: false,
        code: rlsHint ? "RLS" : "NETWORK",
        message: error.message,
      };
    }

    return { ok: true, recordId: clientId };
  } catch {
    return { ok: false, code: "NETWORK", message: "Falha ao eliminar snapshot remoto." };
  }
}
