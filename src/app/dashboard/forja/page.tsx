import { redirect } from "next/navigation";
import { ForjaClient } from "@/app/dashboard/forja/ForjaClient";
import type { ForjaBondedAthlete, ForjaDashboardPayload } from "@/lib/forja-dashboard";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function loadBondedAthletes(): Promise<ForjaBondedAthlete[]> {
  const supabase = await createSupabaseServerClient();

  const { data: bonds, error: bondsError } = await supabase
    .from("forger_client_bonds")
    .select("id, forger_id, client_id, created_at")
    .order("created_at", { ascending: false })
    .limit(64);

  if (bondsError || !bonds?.length) {
    return [];
  }

  const profileIds = [
    ...new Set(bonds.flatMap((bond) => [bond.forger_id, bond.client_id])),
  ];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, nome_linhagem, phase_tier, role")
    .in("id", profileIds);

  const profileById = new Map(
    (profiles ?? []).map((row) => [
      row.id,
      {
        full_name: row.full_name,
        nome_linhagem: row.nome_linhagem,
        phase_tier: row.phase_tier ?? 1,
        role: row.role,
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

  if (profile?.role !== "forjador_soberano") {
    redirect("/");
  }

  const athletes = await loadBondedAthletes();

  const payload: ForjaDashboardPayload = {
    sovereign: {
      displayName:
        profile.full_name?.trim() || profile.nome_linhagem?.trim() || "Soberano",
      role: "forjador_soberano",
    },
    athletes,
  };

  return <ForjaClient payload={payload} />;
}
