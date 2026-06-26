import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function mapAthleteRow(input: {
  clientId: string;
  forgerId: string;
  displayName: string;
  lineageName: string | null;
  phaseTier: number;
  bondedAt: string;
  forgerName: string | null;
  statusAltar?: string | null;
  isGlobalListing?: boolean;
  hasVipBond: boolean;
  bondId: string;
}): ForjaBondedAthlete {
  return {
    bondId: input.bondId,
    clientId: input.clientId,
    forgerId: input.forgerId,
    displayName: input.displayName,
    lineageName: input.lineageName,
    phaseTier: input.phaseTier,
    bondedAt: input.bondedAt,
    forgerName: input.forgerName,
    statusAltar: input.statusAltar,
    isGlobalListing: input.isGlobalListing,
    hasVipBond: input.hasVipBond,
  };
}

export async function loadBondedAthletes(
  operatorId: string,
  sovereign: boolean,
): Promise<ForjaBondedAthlete[]> {
  const supabase = await createSupabaseServerClient();

  const { data: bonds } = await supabase
    .from("forger_client_bonds")
    .select("id, forger_id, client_id, created_at");

  const bondByClient = new Map((bonds ?? []).map((bond) => [bond.client_id, bond]));

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

    return clients.map((client) => {
      const displayName =
        client.full_name?.trim() ||
        client.nome_linhagem?.trim() ||
        `Atleta ${client.id.slice(0, 8)}`;

      const vipBond = bondByClient.get(client.id);

      return mapAthleteRow({
        bondId: vipBond?.id ?? `global-${client.id}`,
        clientId: client.id,
        forgerId: vipBond?.forger_id ?? client.forjador_id ?? operatorId,
        displayName,
        lineageName: client.nome_linhagem?.trim() || null,
        phaseTier: Math.min(5, Math.max(1, Number(client.phase_tier ?? 1))),
        bondedAt: vipBond?.created_at ?? client.updated_at ?? new Date().toISOString(),
        forgerName: client.forjador_id ? (forjadorById.get(client.forjador_id) ?? null) : null,
        statusAltar: client.status_altar,
        isGlobalListing: true,
        hasVipBond: Boolean(vipBond),
      });
    });
  }

  const { data: clients, error: clientsError } = await supabase
    .from("profiles")
    .select("id, full_name, nome_linhagem, phase_tier, forjador_id, status_altar, updated_at")
    .eq("role", "cliente")
    .eq("forjador_id", operatorId)
    .order("full_name", { ascending: true, nullsFirst: false })
    .limit(128);

  if (clientsError || !clients?.length) {
    return [];
  }

  const { data: operatorProfile } = await supabase
    .from("profiles")
    .select("full_name, nome_linhagem")
    .eq("id", operatorId)
    .maybeSingle();

  const forgerName =
    operatorProfile?.full_name?.trim() || operatorProfile?.nome_linhagem?.trim() || null;

  return clients.map((client) => {
    const displayName =
      client.full_name?.trim() ||
      client.nome_linhagem?.trim() ||
      `Cliente ${client.id.slice(0, 8)}`;

    const vipBond = bondByClient.get(client.id);

    return mapAthleteRow({
      bondId: vipBond?.id ?? `client-${client.id}`,
      clientId: client.id,
      forgerId: operatorId,
      displayName,
      lineageName: client.nome_linhagem?.trim() || null,
      phaseTier: Math.min(5, Math.max(1, Number(client.phase_tier ?? 1))),
      bondedAt: vipBond?.created_at ?? client.updated_at ?? new Date().toISOString(),
      forgerName,
      statusAltar: client.status_altar,
      isGlobalListing: false,
      hasVipBond: Boolean(vipBond),
    });
  });
}

export function filterAthletesForOperator(
  athletes: ForjaBondedAthlete[],
  _sovereign: boolean,
): ForjaBondedAthlete[] {
  return athletes;
}
