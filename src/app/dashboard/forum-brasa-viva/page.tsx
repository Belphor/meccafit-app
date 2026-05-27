import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { DashboardLoading } from "@/components/dashboard/DashboardLoading";
import { DASHBOARD_SHELL } from "@/lib/dashboard-config";
import { ForumBrasaVivaView } from "@/features/forum-brasa-viva/ForumBrasaVivaView";
import { resolveForumCardPhase } from "@/features/forum-brasa-viva/forum-phase-styles";
import { resolvePhaseTier } from "@/lib/custom-preferences";
import { profileRowToEnginePayload, type CommunityMuralRow } from "@/lib/dashboard-data";
import { mapInitialForumTopics } from "@/lib/forum-brasa-viva-data";
import { enrichProfileRowWithThermalGravity, fetchThermalGravityMetrics } from "@/lib/thermal-gravity-server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { ForumBrasaVivaRpcRow } from "@/features/forum-brasa-viva/types";

export default async function ForumBrasaVivaPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [profileRes, muralRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("phase_tier, phase_setup_at, custom_preferences, phase_progress")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("argos_fetch_forum_brasa_viva", { p_limit: 48 }),
  ]);

  let profileRow: Record<string, unknown> | null = profileRowToEnginePayload(
    profileRes.data ?? undefined,
  );

  try {
    const metrics = await fetchThermalGravityMetrics(supabase, user.id);
    profileRow = enrichProfileRowWithThermalGravity(profileRow ?? {}, metrics);
  } catch {
    // thermal RPC indisponível — fase base
  }

  let initialTopics = mapInitialForumTopics(null);

  if (!muralRes.error && Array.isArray(muralRes.data)) {
    initialTopics = (muralRes.data as ForumBrasaVivaRpcRow[]).map((row) => {
      const authorPhaseTier = resolvePhaseTier(row.author_phase_tier);
      return {
        id: `forum-${row.id}`,
        title: row.topic_title,
        body: row.topic_body,
        authorName: row.author_name,
        authorLineage: row.author_lineage,
        authorPhaseTier,
        authorCardPhase: resolveForumCardPhase(authorPhaseTier),
        weightKg: Number(row.peso) || 0,
        series: Math.max(1, Number(row.series) || 1),
        createdAt: row.registrado_em,
      };
    });
  } else {
    const { data: muralFallback } = await supabase.rpc("argos_fetch_mural_comunidade", {
      p_limit: 48,
    });
    initialTopics = mapInitialForumTopics((muralFallback ?? []) as CommunityMuralRow[]);
  }

  return (
    <main className={DASHBOARD_SHELL}>
      <div className="relative z-10 mx-auto w-full max-w-6xl px-1 py-6">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex min-h-11 items-center text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400/90 hover:text-amber-200"
        >
          ← Voltar ao altar
        </Link>
        <Suspense fallback={<DashboardLoading message="Abrindo Fórum Brasa-Viva..." />}>
          <ForumBrasaVivaView
            userId={user.id}
            profileRow={profileRow}
            initialTopics={initialTopics}
          />
        </Suspense>
      </div>
    </main>
  );
}
