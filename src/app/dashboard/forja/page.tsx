import { redirect } from "next/navigation";
import { ForjaClient } from "@/app/dashboard/forja/ForjaClient";
import type { ForjaBondedAthlete, ForjaDashboardPayload } from "@/lib/forja-dashboard";
import { isForjadorPanelRole, isForjadorSovereign } from "@/lib/internal-routes";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function loadBondedAthletes(
  operatorId: string,
  sovereign: boolean,
): Promise<ForjaBondedAthlete[]> {
  const supabase = await createSupabaseServerClient();

  if (sovereign) {
    const { data: clients, error } = await supabase
      .from("profiles")
      .select("id, full_name, nome_linhagem, phase_tier, forjador_id, status_altar, updated_at")
      .eq("role", "cliente")
      .order("full_name", { ascending: true, nullsFirst: false })
      .limit(256);

    if (error || !clients?.length) {
      return [];
    }

    const forjadorIds = [
      ...new Set(clients.map((row) => row.forjador_id).filter(Boolean) as string[]),
    ];

    const { data: forjadores } =
      forjadorIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, full_name, nome_linhagem")
            .in("id", forjadorIds)
        : { data: [] as Array<{ id: string; full_name: string | null; nome_linhagem: string | null }> };

    const forjadorById = new Map(
      (forjadores ?? []).map((row) => [
        row.id,
        row.full_name?.trim() || row.nome_linhagem?.trim() || null,
      ]),
    );

    const { data: bonds } = await supabase
      .from("forger_client_bonds")
      .select("id, forger_id, client_id, created_at");

    const bondByClient = new Map(
      (bonds ?? []).map((bond) => [bond.client_id, bond]),
    );

    return clients.map((client) => {
      const displayName =
        client.full_name?.trim() ||
        client.nome_linhagem?.trim() ||
        `Atleta ${client.id.slice(0, 8)}`;

      const vipBond = bondByClient.get(client.id);

      return {
        bondId: vipBond?.id ?? `global-${client.id}`,
        clientId: client.id,
        forgerId: vipBond?.forger_id ?? client.forjador_id ?? operatorId,
        displayName,
        lineageName: client.nome_linhagem?.trim() || null,
        phaseTier: Math.min(5, Math.max(1, Number(client.phase_tier ?? 1))),
        bondedAt: vipBond?.created_at ?? client.updated_at ?? new Date().toISOString(),
        forgerName: client.forjador_id ? forjadorById.get(client.forjador_id) ?? null : null,
        statusAltar: client.status_altar,
        isGlobalListing: true,
        hasVipBond: Boolean(vipBond),
      };
    });
  }

  let bondsQuery = supabase
    .from("forger_client_bonds")
    .select("id, forger_id, client_id, created_at")
    .order("created_at", { ascending: false })
    .limit(64);

  bondsQuery = bondsQuery.eq("forger_id", operatorId);

  const { data: bonds, error: bondsError } = await bondsQuery;

  if (bondsError || !bonds?.length) {
    return [];
  }

  const profileIds = [...new Set(bonds.flatMap((bond) => [bond.forger_id, bond.client_id]))];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, nome_linhagem, phase_tier, role, status_altar")
    .in("id", profileIds);

  const profileById = new Map(
    (profiles ?? []).map((row) => [
      row.id,
      {
        full_name: row.full_name,
        nome_linhagem: row.nome_linhagem,
        phase_tier: row.phase_tier ?? 1,
        role: row.role,
        status_altar: row.status_altar,
      },
    ]),
  );

  return bonds.map((bond) => {
    const client = profileById.get(bond.client_id);
    const forger = profileById.get(bond.forger_id);
    const displayName =
      client?.full_name?.trim() ||
      client?.nome_linhagem?.trim() ||
      `Cliente ${bond.client_id.slice(0, 8)}`;

    return {
      bondId: bond.id,
      clientId: bond.client_id,
      forgerId: bond.forger_id,
      displayName,
      lineageName: client?.nome_linhagem?.trim() || null,
      phaseTier: Math.min(5, Math.max(1, Number(client?.phase_tier ?? 1))),
      bondedAt: bond.created_at,
      forgerName: forger?.full_name?.trim() || forger?.nome_linhagem?.trim() || null,
      statusAltar: client?.status_altar ?? null,
      isGlobalListing: false,
      hasVipBond: true,
    };
  });
}

export default async function ForjaDashboardPage() {
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
  const athletes = await loadBondedAthletes(user.id, sovereign);

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

  return <ForjaClient payload={payload} />;
}
