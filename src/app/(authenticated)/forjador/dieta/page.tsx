import { redirect } from "next/navigation";
import {
  DietaPageClient,
  mapServerWeeklyDietRow,
} from "@/app/(authenticated)/forjador/dieta/DietaPageClient";
import { loadBondedAthletes } from "@/lib/forja-athletes.server";
import { filterVipAthletes } from "@/lib/forja-athlete-lists";
import type { ForjaDashboardPayload } from "@/lib/forja-dashboard";
import { resolveIsoWeekRef, type WeeklyDietDraft } from "@/lib/forjador-vip-types";
import { isForjadorPanelRole, isForjadorSovereign } from "@/lib/internal-routes";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function loadActiveWeeklyDiets(
  clientIds: string[],
): Promise<Record<string, WeeklyDietDraft | null>> {
  const map: Record<string, WeeklyDietDraft | null> = {};
  for (const clientId of clientIds) {
    map[clientId] = null;
  }

  if (clientIds.length === 0) {
    return map;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vip_dieta_semanal")
    .select("client_id, forger_id, semana_ref, dias, atualizado_em")
    .in("client_id", clientIds)
    .eq("activo", true);

  if (error || !data) {
    return map;
  }

  for (const row of data) {
    map[row.client_id] = mapServerWeeklyDietRow(row);
  }

  return map;
}

export default async function ForjadorDietaPage() {
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
  const athletes = filterVipAthletes(
    await loadBondedAthletes(user.id, sovereign),
    user.id,
    sovereign,
  );

  const semanaRef = resolveIsoWeekRef(new Date());
  const clientIds = athletes.map((athlete) => athlete.clientId);
  const initialByClient = await loadActiveWeeklyDiets(clientIds);

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
    <DietaPageClient
      payload={payload}
      initialByClient={initialByClient}
      semanaRef={semanaRef}
    />
  );
}
