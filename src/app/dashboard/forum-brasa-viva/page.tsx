import { redirect } from "next/navigation";
import { ForumBrasaVivaStandalone } from "@/app/dashboard/forum-brasa-viva/ForumBrasaVivaStandalone";
import { profileRowToEnginePayload, type DashboardProfileRow } from "@/lib/dashboard-data";
import { enrichProfileRowWithThermalGravity, fetchThermalGravityMetrics } from "@/lib/thermal-gravity-server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function ForumBrasaVivaPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [{ data: profileRes }, { data: phaseRes }] = await Promise.all([
    supabase
      .from("profiles")
      .select("phase_tier, phase_setup_at, custom_preferences, role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("argos_advance_phase_if_eligible", { p_user_id: user.id }),
  ]);

  const phasePayload = phaseRes as { phase_tier?: number; phase_one_progress?: unknown } | null;
  let profileRow: Record<string, unknown> | null = profileRowToEnginePayload({
    ...profileRes,
    phase_tier: phasePayload?.phase_tier ?? profileRes?.phase_tier,
    phase_progress: phasePayload?.phase_one_progress ?? null,
  } as DashboardProfileRow);

  try {
    const metrics = await fetchThermalGravityMetrics(supabase, user.id);
    profileRow = enrichProfileRowWithThermalGravity(profileRow ?? {}, metrics);
  } catch {
    // thermal RPC indisponível — fase base
  }

  return <ForumBrasaVivaStandalone userId={user.id} profileRow={profileRow} />;
}
