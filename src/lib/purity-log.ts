/**
 * Write path · purity_logs + calendario_ignicao
 * Marca o dia civil (America/Sao_Paulo) como puro para o Índice de Ignição.
 */

import { dispatchEvolutionCalorRefresh } from "@/lib/evolution-events";
import { supabase } from "@/lib/supabase";
import { resolveAppDayKey } from "@/lib/treino-day-key";
import type { TablesInsert } from "@/types/database.types";

export type PurityLogSource = "cardio_voo_cinzas" | "treino_registrado";

export async function markDailyPurityLog(
  userId: string,
  options?: { source?: PurityLogSource },
): Promise<{ ok: boolean; detail?: string }> {
  const trimmed = userId.trim();
  if (!trimmed || trimmed.length < 20) {
    return { ok: false, detail: "userId inválido" };
  }

  const logDate = resolveAppDayKey();

  const row: TablesInsert<"purity_logs"> = {
    user_id: trimmed,
    log_date: logDate,
    is_pure: true,
  };

  const { error } = await supabase.from("purity_logs").upsert(row, {
    onConflict: "user_id,log_date",
  });

  if (error) {
    console.warn(
      `[meccafit:purity-log] falha ao gravar (${options?.source ?? "app"}):`,
      error.message,
    );
    return { ok: false, detail: error.message };
  }

  const { error: calendarError } = await supabase.from("calendario_ignicao").upsert(
    {
      atleta_id: trimmed,
      data_registro: logDate,
    },
    { onConflict: "atleta_id,data_registro" },
  );

  if (calendarError) {
    console.warn(
      `[meccafit:purity-log] calendario_ignicao falhou (${options?.source ?? "app"}):`,
      calendarError.message,
    );
  }

  dispatchEvolutionCalorRefresh(trimmed, options?.source);
  return { ok: true };
}
