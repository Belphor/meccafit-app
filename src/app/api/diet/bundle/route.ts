import { NextResponse } from "next/server";
import { resolveAuthedSupabase } from "@/lib/supabase-server";
import { fetchTrainingTrackForUser } from "@/lib/training-track.server";
import { resolveHasPersonalBond } from "@/lib/training-track";
import type { Database, Json } from "@/types/database.types";

type DietBlueprintRow = Database["public"]["Tables"]["diet_blueprints"]["Row"];

function parseMeals(raw: Json): unknown[] {
  return Array.isArray(raw) ? raw : [];
}

export async function GET() {
  const auth = await resolveAuthedSupabase();
  if (!auth) {
    return NextResponse.json({ error: "SESSION_REQUIRED" }, { status: 401 });
  }

  const { client: supabase, userId } = auth;
  const trainingTrack = await fetchTrainingTrackForUser(supabase, userId);
  const isVip = resolveHasPersonalBond(trainingTrack);

  if (!isVip) {
    return NextResponse.json({ error: "VIP_REQUIRED" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("diet_blueprints")
    .select("*")
    .eq("client_id", userId)
    .eq("activo", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "SUPABASE_ERROR", message: error.message },
      { status: 502 },
    );
  }

  let forgerName: string | null = null;
  if (data?.forger_id) {
    const { data: forgerProfile } = await supabase
      .from("profiles")
      .select("full_name, nome_linhagem")
      .eq("id", data.forger_id)
      .maybeSingle();
    forgerName =
      forgerProfile?.full_name?.trim() ||
      forgerProfile?.nome_linhagem?.trim() ||
      null;
  }

  const blueprint = data
    ? {
        ...(data as DietBlueprintRow),
        refeicoes: parseMeals((data as DietBlueprintRow).refeicoes),
        forger_name: forgerName,
      }
    : null;

  return NextResponse.json({
    isVip: true,
    blueprint,
    bond: trainingTrack.bond,
    fetchedAt: Date.now(),
  });
}
