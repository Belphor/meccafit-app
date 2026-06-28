import { redirect } from "next/navigation";
import { MedidasPageClient } from "@/app/(authenticated)/forjador/medidas/MedidasPageClient";
import { loadBondedAthletes } from "@/lib/forja-athletes.server";
import type { ForjaDashboardPayload } from "@/lib/forja-dashboard";
import { resolveMedidasAthletes } from "@/lib/medidas-access";
import { isForjadorPanelRole, isForjadorSovereign } from "@/lib/internal-routes";
import {
  mapServerScientificSnapshot,
  type ScientificMetricsEntry,
} from "@/lib/scientific-metrics-types";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function loadActiveScientificSnapshots(
  clientIds: string[],
): Promise<Record<string, ScientificMetricsEntry | null>> {
  const map: Record<string, ScientificMetricsEntry | null> = {};
  for (const clientId of clientIds) {
    map[clientId] = null;
  }

  if (clientIds.length === 0) {
    return map;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vip_medidas_corporais")
    .select("client_id, forger_id, peso_kg, altura_cm, perimetros, medido_em, atualizado_em")
    .in("client_id", clientIds)
    .eq("activo", true);

  if (error || !data) {
    return map;
  }

  for (const row of data) {
    map[row.client_id] = mapServerScientificSnapshot(row);
  }

  return map;
}

export default async function ForjadorMedidasPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, nome_linhagem")
    .eq("id", user.id)
    .maybeSingle();

  if (!isForjadorPanelRole(profile?.role)) {
    redirect("/dashboard");
  }

  const sovereign = isForjadorSovereign(profile.role);
  const allAthletes = await loadBondedAthletes(user.id, sovereign);
  const athletes = resolveMedidasAthletes(allAthletes, user.id, sovereign);

  const clientIds = athletes.map((athlete) => athlete.clientId);
  const initialSnapshotByClient = await loadActiveScientificSnapshots(clientIds);

  const payload: ForjaDashboardPayload = {
    operator: {
      displayName:
        profile.full_name?.trim() || profile.nome_linhagem?.trim() || "Forjador",
      role: profile.role,
      userId: user.id,
      isSovereign: sovereign,
    },
    athletes,
  };

  return (
    <MedidasPageClient payload={payload} initialSnapshotByClient={initialSnapshotByClient} />
  );
}
