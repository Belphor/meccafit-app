import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  parseLinhagemInactivitySync,
  type LinhagemInactivitySyncResult,
} from "@/lib/linhagem-inactivity";

export async function syncLinhagemPresence(
  supabase: SupabaseClient<Database>,
): Promise<LinhagemInactivitySyncResult | null> {
  const { data, error } = await supabase.rpc("argos_sync_linhagem_presence");

  if (error || !data) return null;
  return parseLinhagemInactivitySync(data);
}

export async function rekindleLinhagemAfterInactivity(
  supabase: SupabaseClient<Database>,
): Promise<{ rekindled: boolean; phase_tier: number } | null> {
  const { data, error } = await supabase.rpc("argos_rekindle_linhagem_inactivity");

  if (error || !data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  return {
    rekindled: row.rekindled === true,
    phase_tier: Number(row.phase_tier ?? 1),
  };
}
