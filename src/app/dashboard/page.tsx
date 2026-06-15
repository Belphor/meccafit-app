import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DashboardClient } from "@/app/dashboard/DashboardClient";
import { DashboardLoading } from "@/components/dashboard/DashboardLoading";
import type { EvolutionCalorPayload } from "@/components/evolution/human-body-constants";
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

  let initialEvolutionCalor = undefined as EvolutionCalorPayload["calorRows"] | undefined;
  let initialEvolutionIgnicao = undefined as number | undefined;

  if (params.tab === "evolucao") {
    const payload = await fetchMuscularEvolutionPayload(supabase);
    initialEvolutionCalor = payload.calorRows;
    initialEvolutionIgnicao = payload.indice_ignicao;
  }

  const initialWeekSchedule = await fetchWeeklySchedule(user.id);

  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardClient
        userId={user.id}
        subgroupParam={params.subgrupo ?? null}
        tabParam={params.tab ?? null}
        initialEvolutionCalor={initialEvolutionCalor}
        initialEvolutionIgnicao={initialEvolutionIgnicao}
        initialWeekSchedule={initialWeekSchedule}
      />
    </Suspense>
  );
}
