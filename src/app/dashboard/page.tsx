import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DashboardClient } from "@/app/dashboard/DashboardClient";
import { DashboardLoading } from "@/components/dashboard/DashboardLoading";
import {
  PLAN_SESSIONS_DEFAULT,
  type AthletePlanConfig,
} from "@/components/evolution/plan-config-form";
import type { SovereignMuscleId } from "@/components/evolution/human-body-constants";
import { fetchMuscularEvolutionPayload } from "@/lib/muscular-evolution";
import {
  normalizeTrainingMuscleGroup,
  type PlanilhaDayRow,
  type WeekdayIndex,
} from "@/lib/training-week";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function fetchWeeklySchedule(userId: string): Promise<PlanilhaDayRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("planilhas_forjador")
    .select("dia_semana, grupo_muscular")
    .eq("atleta_id", userId);

  return (data ?? [])
    .map((row) => {
      const muscle = normalizeTrainingMuscleGroup(row.grupo_muscular);
      const day = Number(row.dia_semana) as WeekdayIndex;
      if (!muscle || day < 1 || day > 6) return null;
      return { dia_semana: day, grupo_muscular: muscle };
    })
    .filter((row): row is PlanilhaDayRow => row !== null);
}

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ subgrupo?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [evolutionPayload, initialWeekSchedule, initialAthletePlan] = await Promise.all([
    fetchMuscularEvolutionPayload(supabase),
    fetchWeeklySchedule(user.id),
    fetchAthletePlan(user.id),
  ]);

  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardClient
        userId={user.id}
        subgroupParam={params.subgrupo ?? null}
        initialEvolutionCalor={evolutionPayload.calorRows}
        initialEvolutionIgnicao={evolutionPayload.indice_ignicao}
        initialWeekSchedule={initialWeekSchedule}
        initialAthletePlan={initialAthletePlan}
      />
    </Suspense>
  );
}
