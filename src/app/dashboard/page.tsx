import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DashboardClient } from "@/app/dashboard/DashboardClient";
import { DashboardLoading } from "@/components/dashboard/DashboardLoading";
import { parseEvolutionCalorJson } from "@/components/evolution/human-body-constants";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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

  let initialEvolutionCalor = undefined as ReturnType<typeof parseEvolutionCalorJson>["calorRows"] | undefined;
  let initialEvolutionIgnicao = undefined as number | undefined;

  if (params.tab === "evolucao") {
    const calorRes = await supabase.rpc("obter_calor_muscular_atleta", {
      target_atleta_id: user.id,
    });

    const payload = parseEvolutionCalorJson(calorRes.data);
    initialEvolutionCalor = payload.calorRows;
    initialEvolutionIgnicao = payload.indice_ignicao;
  }

  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardClient
        userId={user.id}
        subgroupParam={params.subgrupo ?? null}
        tabParam={params.tab ?? null}
        initialEvolutionCalor={initialEvolutionCalor}
        initialEvolutionIgnicao={initialEvolutionIgnicao}
      />
    </Suspense>
  );
}
