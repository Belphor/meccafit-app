import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";
import {
  scientificEntryToSnapshotPayload,
  snapshotPayloadToPerimetrosJson,
  type ScientificMetricsEntry,
} from "@/lib/scientific-metrics-types";
import { publishVipMedidasUpdate } from "@/lib/vip-medidas-events";
import { supabase } from "@/lib/supabase";

export type ScientificMetricsSyncResult =
  | { ok: true; recordId: string }
  | { ok: false; code: "SESSION" | "VALIDATION" | "RLS" | "NETWORK"; message: string };

export async function syncLatestScientificMetricsToNucleus(
  athlete: ForjaBondedAthlete,
  entry: ScientificMetricsEntry,
  options?: { operatorId?: string; isSovereign?: boolean },
): Promise<ScientificMetricsSyncResult> {
  void options;

  if (!athlete.hasVipBond) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Vínculo VIP ativo obrigatório para publicar antropometria.",
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

    const rpcPayload = {
      peso_kg: payload.pesoKg,
      altura_cm: payload.alturaCm,
      perimetros,
      medido_em: payload.medidoEm,
    };

    const { data, error } = await supabase.rpc("argos_forja_publish_vip_medidas", {
      p_client_id: athlete.clientId,
      p_payload: rpcPayload,
    });

    if (error) {
      const rlsHint = error.message?.toLowerCase().includes("row-level security");
      return {
        ok: false,
        code: rlsHint ? "RLS" : "NETWORK",
        message: error.message,
      };
    }

    const record = (data as unknown) as { ok?: boolean; id?: string } | null;
    if (!record?.id) {
      return { ok: false, code: "NETWORK", message: "Medição não confirmada." };
    }

    publishVipMedidasUpdate(athlete.clientId);
    return { ok: true, recordId: record.id };
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
