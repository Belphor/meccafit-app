import {
  DIET_WEEK_DAY_IDS,
  DIET_WEEK_DAY_LABELS,
  parseWeeklyDietDays,
  type DietWeekDayId,
  type WeeklyDietDraft,
} from "@/lib/forjador-vip-types";
import { resolveBrasiliaDietDayId } from "@/lib/brasilia-time";
import { supabase } from "@/lib/supabase";

export type ClientWeeklyDietDay = {
  id: DietWeekDayId;
  label: string;
  notas: string;
  concluido: boolean;
  isToday: boolean;
};

export type ClientWeeklyDiet = {
  semanaRef: string;
  dias: ClientWeeklyDietDay[];
  atualizadoEm: string;
};

export async function fetchActiveWeeklyDiet(
  userId: string,
): Promise<{ diet: ClientWeeklyDiet | null; error: string | null }> {
  const { data, error } = await supabase
    .from("vip_dieta_semanal")
    .select("semana_ref, dias, atualizado_em")
    .eq("client_id", userId)
    .eq("activo", true)
    .maybeSingle();

  if (error) {
    return { diet: null, error: error.message };
  }

  if (!data) {
    return { diet: null, error: null };
  }

  const parsed = parseWeeklyDietDays(data.dias);
  const todayId = resolveBrasiliaDietDayId();

  const dias: ClientWeeklyDietDay[] = DIET_WEEK_DAY_IDS.map((dayId) => ({
    id: dayId,
    label: DIET_WEEK_DAY_LABELS[dayId],
    notas: parsed[dayId].notas,
    concluido: parsed[dayId].concluido,
    isToday: dayId === todayId,
  }));

  return {
    diet: {
      semanaRef: String(data.semana_ref ?? ""),
      dias,
      atualizadoEm: String(data.atualizado_em ?? new Date().toISOString()),
    },
    error: null,
  };
}

export function draftFromServerRow(row: {
  client_id: string;
  forger_id: string;
  semana_ref: string;
  dias: unknown;
  atualizado_em: string;
}): WeeklyDietDraft {
  return {
    clientId: row.client_id,
    forgerId: row.forger_id,
    semanaRef: row.semana_ref,
    dias: parseWeeklyDietDays(row.dias),
    updatedAt: row.atualizado_em,
    syncedAt: row.atualizado_em,
  };
}
