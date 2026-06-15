/**
 * Cliente MIDAS · get_muscular_evolution()
 * RPC sem parâmetros — escopo fixo em auth.uid().
 */

import {
  parseMidasEvolutionJson,
  type EvolutionCalorPayload,
} from "@/components/evolution/human-body-constants";
import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type EvolutionRpcClient = Pick<SupabaseClient<Database>, "rpc">;

export async function fetchMuscularEvolutionPayload(
  client: EvolutionRpcClient = supabase,
): Promise<EvolutionCalorPayload> {
  const { data, error } = await client.rpc("get_muscular_evolution");

  if (error) {
    throw new Error(error.message);
  }

  return parseMidasEvolutionJson(data);
}
