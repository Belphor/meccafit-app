import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";
import {
  BODY_CIRCUMFERENCE_FIELDS,
  type BodyCircumferenceId,
  type BodyMetricsDraft,
} from "@/lib/forjador-vip-types";
import { supabase } from "@/lib/supabase";

export type ForjadorVipSyncResult =
  | { ok: true; recordId: string }
  | { ok: false; code: "SESSION" | "VALIDATION" | "RLS" | "NETWORK"; message: string };

function parsePerimetros(
  draft: BodyMetricsDraft,
): { ok: true; payload: Record<string, number> } | { ok: false; message: string } {
  const payload: Record<string, number> = {};

  for (const field of BODY_CIRCUMFERENCE_FIELDS) {
    const raw = draft.perimetros[field.id].trim();
    if (!raw) continue;

    const value = Number(raw.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0 || value > 300) {
      return {
        ok: false,
        message: `${field.label}: valor inválido (0,1–300 cm).`,
      };
    }
    payload[field.id] = Math.round(value * 10) / 10;
  }

  return { ok: true, payload };
}

export function validateBodyMetricsDraft(
  draft: BodyMetricsDraft,
): { ok: true; pesoKg: number; alturaCm: number; perimetros: Record<BodyCircumferenceId, number> } | { ok: false; message: string } {
  if (!draft.clientId.trim()) {
    return { ok: false, message: "Cliente não seleccionado." };
  }
  if (!draft.forgerId.trim()) {
    return { ok: false, message: "Forjador do vínculo VIP inválido." };
  }

  const pesoKg = Number(draft.pesoKg.trim().replace(",", "."));
  if (!Number.isFinite(pesoKg) || pesoKg <= 0 || pesoKg > 400) {
    return { ok: false, message: "Peso inválido (0,1–400 kg)." };
  }

  const alturaCm = Number(draft.alturaCm.trim().replace(",", "."));
  if (!Number.isFinite(alturaCm) || alturaCm < 100 || alturaCm > 260) {
    return { ok: false, message: "Altura inválida (100–260 cm)." };
  }

  const parsedPerimetros = parsePerimetros(draft);
  if (!parsedPerimetros.ok) {
    return { ok: false, message: parsedPerimetros.message };
  }

  return {
    ok: true,
    pesoKg: Math.round(pesoKg * 100) / 100,
    alturaCm: Math.round(alturaCm * 10) / 10,
    perimetros: parsedPerimetros.payload as Record<BodyCircumferenceId, number>,
  };
}

export async function syncBodyMetricsToNucleus(
  athlete: ForjaBondedAthlete,
  draft: BodyMetricsDraft,
): Promise<ForjadorVipSyncResult> {
  const validation = validateBodyMetricsDraft(draft);
  if (!validation.ok) {
    return { ok: false, code: "VALIDATION", message: validation.message };
  }

  if (!athlete.hasVipBond) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Vínculo VIP activo obrigatório para publicar medidas.",
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

    const medidoEm = draft.medidoEm || new Date().toISOString();

    if (existing?.id) {
      const { data, error } = await supabase
        .from("vip_medidas_corporais")
        .update({
          peso_kg: validation.pesoKg,
          altura_cm: validation.alturaCm,
          perimetros: validation.perimetros,
          medido_em: medidoEm,
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
        return { ok: false, code: "NETWORK", message: "Medidas não confirmadas pelo núcleo." };
      }

      return { ok: true, recordId: data.id };
    }

    const { data, error } = await supabase
      .from("vip_medidas_corporais")
      .insert({
        client_id: athlete.clientId,
        forger_id: athlete.forgerId,
        peso_kg: validation.pesoKg,
        altura_cm: validation.alturaCm,
        perimetros: validation.perimetros,
        medido_em: medidoEm,
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
      return { ok: false, code: "NETWORK", message: "Medidas não confirmadas pelo núcleo." };
    }

    return { ok: true, recordId: data.id };
  } catch {
    return { ok: false, code: "NETWORK", message: "Falha de rede ao sincronizar medidas." };
  }
}
