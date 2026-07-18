import { redirect } from "next/navigation";
import { MedidasDetailClient } from "@/app/(authenticated)/forjador/medidas/[clientId]/MedidasDetailClient";
import { loadBondedAthletes } from "@/lib/forja-athletes.server";
import { resolveForjadorOperator } from "@/lib/forjador-page-context.server";
import { resolveMedidasAthletes } from "@/lib/medidas-access";
import {
  mapServerScientificSnapshot,
  type ScientificMetricsEntry,
} from "@/lib/scientific-metrics-types";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function loadActiveScientificSnapshot(
  clientId: string,
): Promise<ScientificMetricsEntry | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vip_medidas_corporais")
    .select("client_id, forger_id, peso_kg, altura_cm, perimetros, medido_em, atualizado_em")
    .eq("client_id", clientId)
    .eq("activo", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapServerScientificSnapshot(data);
}

export default async function ForjadorMedidasDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { operator, sovereign, userId } = await resolveForjadorOperator();

  const allAthletes = await loadBondedAthletes(userId, sovereign);
  const athletes = resolveMedidasAthletes(allAthletes, userId, sovereign);
  const athlete = athletes.find((item) => item.clientId === clientId);

  if (!athlete) {
    redirect("/forjador/medidas");
  }

  const initialSnapshot = await loadActiveScientificSnapshot(clientId);

  return (
    <MedidasDetailClient
      operator={operator}
      athlete={athlete}
      initialSnapshot={initialSnapshot}
    />
  );
}
