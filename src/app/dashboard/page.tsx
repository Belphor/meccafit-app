import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DashboardClient } from "@/app/dashboard/DashboardClient";
import { DashboardLoading } from "@/components/dashboard/DashboardLoading";
import {
  PLAN_SESSIONS_DEFAULT,
  type AthletePlanConfig,
} from "@/components/evolution/plan-config-form";
import { fetchMuscularEvolutionPayload } from "@/lib/muscular-evolution";
import {
  parsePlanilhaDayRows,
  type PlanilhaDayRow,
} from "@/lib/training-week";
import {
  DEFAULT_FORJADOR_TREINO_CONFIG,
  parseForjadorPrescriptionRows,
  parseForjadorTreinoConfig,
  type ForjadorPrescriptionRow,
  type ForjadorTreinoConfig,
} from "@/lib/forjador-prescriptions";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  FORJA_DASHBOARD_ROUTE,
  isForjadorPanelRole,
} from "@/lib/internal-routes";

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
      "id, atleta_id, forjador_id, dia_semana, grupo_muscular, exercicio_id, ordem, series_alvo, repeticoes_alvo, peso_prescrito, descanso_segundos, progressao_alternativas, repeticoes_por_serie, observacoes, video_url",
    )
    .eq("atleta_id", userId)
    .order("dia_semana")
    .order("grupo_muscular")
    .order("ordem");

  if (error || !data) return [];
  return parseForjadorPrescriptionRows(data);
}

async function fetchWeeklySchedule(userId: string): Promise<PlanilhaDayRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("planilhas_forjador")
    .select("dia_semana, grupo_muscular, ordem")
    .eq("atleta_id", userId)
    .order("dia_semana")
    .order("ordem");

  return parsePlanilhaDayRows(data);
}

async function fetchAthletePlan(userId: string): Promise<AthletePlanConfig> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("planos_atletas")
    .select("total_treinos_mensais_planejados, meta_sync_mes")
    .eq("atleta_id", userId)
    .maybeSingle();

  if (!data) {
    return {
      totalTreinosMensaisPlanejados: PLAN_SESSIONS_DEFAULT,
      metaSyncMes: null,
    };
  }

  return {
    totalTreinosMensaisPlanejados:
      typeof data.total_treinos_mensais_planejados === "number"
        ? data.total_treinos_mensais_planejados
        : PLAN_SESSIONS_DEFAULT,
    metaSyncMes: data.meta_sync_mes ?? null,
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

  const { data: roleRow } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (isForjadorPanelRole(roleRow?.role)) {
    redirect(FORJA_DASHBOARD_ROUTE);
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
