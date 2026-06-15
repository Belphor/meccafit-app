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
  normalizeWeeklyScheduleMuscle,
  type PlanilhaDayRow,
  type WeekdayIndex,
} from "@/lib/training-week";
import {
  DEFAULT_FORJADOR_TREINO_CONFIG,
  parseForjadorPrescriptionRows,
  parseForjadorTreinoConfig,
  type ForjadorPrescriptionRow,
  type ForjadorTreinoConfig,
} from "@/lib/forjador-prescriptions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function fetchForjadorTreinoConfig(userId: string): Promise<ForjadorTreinoConfig> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("config_treino_atleta")
    .select("forjador_id, descanso_padrao_seg, cardio_meta_minutos")
    .eq("atleta_id", userId)
    .maybeSingle();

  if (error || !data) return DEFAULT_FORJADOR_TREINO_CONFIG;
  return parseForjadorTreinoConfig(data as Record<string, unknown>);
}

async function fetchForjadorPrescriptions(userId: string): Promise<ForjadorPrescriptionRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("prescricoes_treino_forjador")
    .select(
      "id, atleta_id, forjador_id, grupo_muscular, exercicio_id, ordem, series_alvo, repeticoes_alvo, peso_prescrito, descanso_segundos, observacoes",
    )
    .eq("atleta_id", userId)
    .order("grupo_muscular")
    .order("ordem");

  if (error || !data) return [];
  return parseForjadorPrescriptionRows(data);
}

async function fetchWeeklySchedule(userId: string): Promise<PlanilhaDayRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("planilhas_forjador")
    .select("dia_semana, grupo_muscular")
    .eq("atleta_id", userId);

  return (data ?? [])
    .map((row) => {
      const muscle = normalizeWeeklyScheduleMuscle(row.grupo_muscular);
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
  searchParams: Promise<{ subgrupo?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [evolutionPayload, initialWeekSchedule, initialAthletePlan, initialForjadorConfig, initialForjadorPrescriptions] =
    await Promise.all([
      fetchMuscularEvolutionPayload(supabase),
      fetchWeeklySchedule(user.id),
      fetchAthletePlan(user.id),
      fetchForjadorTreinoConfig(user.id),
      fetchForjadorPrescriptions(user.id),
    ]);

  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardClient
        userId={user.id}
        subgroupParam={params.subgrupo ?? null}
        tabParam={params.tab ?? null}
        initialEvolutionCalor={evolutionPayload.calorRows}
        initialEvolutionIgnicao={evolutionPayload.indice_ignicao}
        initialWeekSchedule={initialWeekSchedule}
        initialAthletePlan={initialAthletePlan}
        initialForjadorConfig={initialForjadorConfig}
        initialForjadorPrescriptions={initialForjadorPrescriptions}
      />
    </Suspense>
  );
}
