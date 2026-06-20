/**
 * Cardio · sincronização remota (celular ↔ desktop)
 */

import type { CardioSessionSnapshot } from "@/lib/cardio-voo-cinzas";
import { sanitizeCardioSessionSnapshot } from "@/lib/cardio-voo-cinzas";
import { supabase } from "@/lib/supabase";
import { resolveAppDayKey } from "@/lib/treino-day-key";

export function mergeCardioSessionSnapshots(
  left: CardioSessionSnapshot | null,
  right: CardioSessionSnapshot | null,
): CardioSessionSnapshot | null {
  if (!left) return right;
  if (!right) return left;

  const leftTs = Date.parse(left.updatedAt);
  const rightTs = Date.parse(right.updatedAt);
  if (!Number.isFinite(leftTs) && !Number.isFinite(rightTs)) return left;
  if (!Number.isFinite(leftTs)) return right;
  if (!Number.isFinite(rightTs)) return left;
  return leftTs >= rightTs ? left : right;
}

export async function fetchCardioSessionRemote(
  userId: string,
  dayKey: string = resolveAppDayKey(),
  goalMs?: number,
): Promise<CardioSessionSnapshot | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("cardio_sessoes_diarias")
    .select("snapshot")
    .eq("atleta_id", userId)
    .eq("dia_civil", dayKey)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return null;
    console.warn("[meccafit:cardio-sync] leitura remota falhou:", error.message);
    return null;
  }

  if (!data?.snapshot || typeof data.snapshot !== "object") return null;
  return sanitizeCardioSessionSnapshot(data.snapshot, userId, goalMs);
}

export async function upsertCardioSessionRemote(snapshot: CardioSessionSnapshot): Promise<void> {
  if (!snapshot.userId) return;

  const dayKey = snapshot.dayKey || resolveAppDayKey();
  const { error } = await supabase.from("cardio_sessoes_diarias").upsert(
    {
      atleta_id: snapshot.userId,
      dia_civil: dayKey,
      snapshot,
      updated_at: snapshot.updatedAt,
    },
    { onConflict: "atleta_id,dia_civil" },
  );

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return;
    console.warn("[meccafit:cardio-sync] gravação remota falhou:", error.message);
  }
}
