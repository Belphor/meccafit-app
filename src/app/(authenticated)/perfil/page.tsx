import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import {
  PLAN_SESSIONS_DEFAULT,
  PlanConfigForm,
  type AthletePlanConfig,
} from "@/components/evolution/plan-config-form";
import type { SovereignMuscleId } from "@/components/evolution/human-body-constants";
import { DASHBOARD_PANEL_FRAME } from "@/lib/dashboard-config";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function fetchAthletePlan(userId: string): Promise<AthletePlanConfig> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("planos_atletas")
    .select("total_treinos_mensais_planejados, grupos_obrigatorios")
    .eq("atleta_id", userId)
    .maybeSingle();

  if (!data) {
    return {
      totalTreinosMensaisPlanejados: PLAN_SESSIONS_DEFAULT,
      gruposObrigatorios: [],
    };
  }

  const grupos = Array.isArray(data.grupos_obrigatorios)
    ? (data.grupos_obrigatorios
        .map((item) => String(item).trim().toUpperCase())
        .filter(Boolean) as SovereignMuscleId[])
    : [];

  return {
    totalTreinosMensaisPlanejados:
      typeof data.total_treinos_mensais_planejados === "number"
        ? data.total_treinos_mensais_planejados
        : PLAN_SESSIONS_DEFAULT,
    gruposObrigatorios: grupos,
  };
}

async function PerfilPageContent({ userId }: { userId: string }) {
  const initialPlan = await fetchAthletePlan(userId);

  return (
    <div className="space-y-4">
      <PlanConfigForm userId={userId} initialPlan={initialPlan} />

      <BrasaVivaCard as="section" variant="treino" className={DASHBOARD_PANEL_FRAME}>
        <DashboardPanelHeader chip="Perfil" meta="Atalhos rápidos" />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link
            href="/dashboard"
            className="rounded-xl border border-cyan-500/15 bg-black/40 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-300/85 transition-colors hover:border-cyan-500/30 hover:text-cyan-100"
          >
            Ir para treino
          </Link>
          <Link
            href="/evolucao"
            className="rounded-xl border border-orange-500/12 bg-black/40 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-200/75 transition-colors hover:border-orange-500/25 hover:text-amber-100"
          >
            Ver evolução
          </Link>
        </div>
      </BrasaVivaCard>
    </div>
  );
}

export default async function PerfilPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#030305] px-[max(1.25rem,env(safe-area-inset-left))] py-[max(1.5rem,env(safe-area-inset-top))] pr-[max(1.25rem,env(safe-area-inset-right))] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(6,182,212,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.4) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative mx-auto w-full max-w-3xl">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-cyan-500/10 bg-black/50 p-6 backdrop-blur-sm">
              <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-500/60">
                Carregando perfil…
              </p>
            </div>
          }
        >
          <PerfilPageContent userId={user.id} />
        </Suspense>
      </div>
    </main>
  );
}
