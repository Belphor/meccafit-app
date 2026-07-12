import { NextResponse } from "next/server";
import {
  applyHistoricoToSubgroup,
  mapCommunityMuralRowsToPosts,
  mapProfileRowToClientProfile,
  MURAL_BUNDLE_LIMIT,
  type CommunityMuralRow,
  type DashboardProfileRow,
  type HistoricoTreinoRow,
} from "@/lib/dashboard-data";
import { resolveSubgroupFromParam } from "@/lib/subgroup-routing";
import { subgroupIdToMusculo } from "@/lib/subgroup-musculo";
import { resolveAuthedSupabase } from "@/lib/supabase-server";
import {
  enrichProfileRowWithThermalGravity,
  fetchThermalGravityMetrics,
  type ThermalGravityMetricsRow,
} from "@/lib/thermal-gravity-server";
import { parseLinhagemInactivitySync, parseThermalGravitySettlement } from "@/lib/linhagem-inactivity";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Enums } from "@/types/database.types";
import type { TrainingTrackState } from "@/lib/training-track";
import { fetchTrainingTrackForUser } from "@/lib/training-track.server";

const SERVER_CACHE_TTL_MS = 90_000;
const TRAINING_TRACK_CACHE_TTL_MS = 90_000;

type BundleCacheEntry = {
  expiresAt: number;
  body: Record<string, unknown>;
};

type TrainingTrackCacheEntry = {
  expiresAt: number;
  track: TrainingTrackState;
};

const serverCache = new Map<string, BundleCacheEntry>();
const trainingTrackCache = new Map<string, TrainingTrackCacheEntry>();

function cacheKey(userId: string, musculo: Enums<"subgrupo_muscular">): string {
  return `${userId}:${musculo}`;
}

async function fetchTrainingTrack(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<TrainingTrackState> {
  const cached = trainingTrackCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.track;
  }

  const track = await fetchTrainingTrackForUser(supabase, userId);
  trainingTrackCache.set(userId, {
    expiresAt: Date.now() + TRAINING_TRACK_CACHE_TTL_MS,
    track,
  });
  return track;
}

function parseBundleThermal(raw: unknown): ThermalGravityMetricsRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  return {
    vtc_month: Number(row.vtc_month ?? row.vtc_20d ?? row.vtc_30d ?? 0),
    vtc_30d: Number(row.vtc_30d ?? row.vtc_month ?? row.vtc_20d ?? 0),
    session_vtc_today: Number(row.session_vtc_today ?? 0),
    available:
      row.vtc_month !== undefined ||
      row.vtc_30d !== undefined ||
      row.vtc_20d !== undefined ||
      row.session_vtc_today !== undefined,
  };
}

function isMissingRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST202" || (error.message ?? "").includes("fetch_dashboard_bundle");
}

async function fetchBundleViaRpc(
  supabase: SupabaseClient<Database>,
  musculo: Enums<"subgrupo_muscular">,
) {
  const { data, error } = await supabase.rpc("fetch_dashboard_bundle", {
    p_musculo: musculo,
    p_mural_limit: MURAL_BUNDLE_LIMIT,
  });

  if (error || !data || typeof data !== "object") {
    return { ok: false as const, error, data: null };
  }

  const bundle = data as {
    profile?: DashboardProfileRow | null;
    historico?: HistoricoTreinoRow[] | null;
    mural?: CommunityMuralRow[] | null;
    thermal_gravity?: { vtc_month?: number; vtc_30d?: number; vtc_20d?: number; session_vtc_today?: number } | null;
    linhagem_inactivity?: unknown;
    thermal_gravity_settlement?: unknown;
  };

  if (!bundle.profile) {
    return { ok: false as const, error, data: null };
  }

  return {
    ok: true as const,
    profile: mapProfileRowToClientProfile(bundle.profile),
    profileRow: bundle.profile,
    historico: bundle.historico ?? [],
    muralPosts: mapCommunityMuralRowsToPosts(bundle.mural ?? []),
    thermalMetrics: parseBundleThermal(bundle.thermal_gravity),
    linhagemInactivity: parseLinhagemInactivitySync(bundle.linhagem_inactivity),
    thermalSettlement: parseThermalGravitySettlement(bundle.thermal_gravity_settlement),
  };
}

async function fetchBundleViaParallel(
  supabase: SupabaseClient<Database>,
  userId: string,
  musculo: Enums<"subgrupo_muscular">,
) {
  const [profileRes, historicoRes, muralRes, phaseRes, inactivityRes, thermalSettleRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, nome_linhagem, status_altar, data_nascimento, role, phase_tier, phase_setup_at, custom_preferences",
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("historico_treinos")
      .select(
        "id, exercicio_id, exercicio_nome, musculo, peso, peso_atual, series, repeticoes, status, registrado_em, updated_at",
      )
      .eq("cliente_id", userId)
      .eq("musculo", musculo)
      .order("registrado_em", { ascending: false }),
    supabase.rpc("argos_fetch_mural_comunidade", { p_limit: MURAL_BUNDLE_LIMIT }),
    supabase.rpc("argos_advance_phase_if_eligible", { p_user_id: userId }),
    supabase.rpc("argos_sync_linhagem_presence"),
    supabase.rpc("argos_settle_thermal_gravity_monthly"),
  ]);

  if (profileRes.error || !profileRes.data) {
    return { ok: false as const, error: profileRes.error ?? historicoRes.error ?? muralRes.error };
  }
  if (historicoRes.error || muralRes.error) {
    return { ok: false as const, error: historicoRes.error ?? muralRes.error };
  }

  const phasePayload = phaseRes.data as
    | { phase_tier?: number; phase_one_progress?: unknown }
    | null;
  const inactivity = parseLinhagemInactivitySync(inactivityRes.data);
  const thermalSettlement = parseThermalGravitySettlement(thermalSettleRes.data);
  const profileRow: DashboardProfileRow = {
    ...(profileRes.data as DashboardProfileRow),
    phase_tier:
      inactivity?.phase_tier ??
      thermalSettlement?.phase_tier ??
      phasePayload?.phase_tier ??
      profileRes.data.phase_tier ??
      1,
    phase_progress: phasePayload?.phase_one_progress ?? null,
  };

  return {
    ok: true as const,
    profile: mapProfileRowToClientProfile(profileRow),
    profileRow,
    historico: historicoRes.data ?? [],
    muralPosts: mapCommunityMuralRowsToPosts((muralRes.data ?? []) as CommunityMuralRow[]),
    thermalMetrics: null as ThermalGravityMetricsRow | null,
    linhagemInactivity: inactivity,
    thermalSettlement,
  };
}

export async function GET(request: Request) {
  const started = performance.now();
  const url = new URL(request.url);
  const subgroupParam = url.searchParams.get("subgrupo");
  const baseSubgroup = resolveSubgroupFromParam(subgroupParam);
  const musculo = subgroupIdToMusculo(baseSubgroup.id);

  const auth = await resolveAuthedSupabase(request);
  if (!auth) {
    return NextResponse.json({ error: "SESSION_REQUIRED" }, { status: 401 });
  }

  const { client: supabase, userId } = auth;
  const key = cacheKey(userId, musculo);
  const cached = serverCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.body, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        "X-Cache": "HIT",
        "X-Latency-Ms": String(Math.round(performance.now() - started)),
      },
    });
  }

  const [trainingTrack, rpcResult] = await Promise.all([
    fetchTrainingTrack(supabase, userId),
    fetchBundleViaRpc(supabase, musculo),
  ]);
  const hasPersonalBond = Boolean(trainingTrack.bond);
  const bundleResult = rpcResult.ok
    ? rpcResult
    : isMissingRpc(rpcResult.error)
      ? await fetchBundleViaParallel(supabase, userId, musculo)
      : rpcResult;

  if (!bundleResult.ok) {
    return NextResponse.json(
      { error: "SUPABASE_ERROR", message: bundleResult.error?.message ?? "Bundle indisponível." },
      { status: 502 },
    );
  }

  const rawProfileRow = bundleResult.profileRow as Record<string, unknown>;
  const inlineThermal = "thermalMetrics" in bundleResult ? bundleResult.thermalMetrics : null;
  const thermalMetrics =
    inlineThermal?.available === true
      ? inlineThermal
      : await fetchThermalGravityMetrics(supabase, userId);
  const enrichedProfileRow = enrichProfileRowWithThermalGravity(rawProfileRow, thermalMetrics);
  const linhagemInactivity =
    "linhagemInactivity" in bundleResult ? bundleResult.linhagemInactivity : null;
  const thermalSettlement =
    "thermalSettlement" in bundleResult ? bundleResult.thermalSettlement : null;

  const body = {
    profile: bundleResult.profile,
    profileRow: enrichedProfileRow,
    thermal_gravity: enrichedProfileRow.thermal_gravity,
    linhagemInactivity,
    thermalSettlement,
    subgroup: applyHistoricoToSubgroup(baseSubgroup, bundleResult.historico),
    muralPosts: bundleResult.muralPosts,
    historico: bundleResult.historico,
    musculo,
    trainingTrack,
    hasPersonalBond,
    fetchedAt: Date.now(),
  };

  serverCache.set(key, {
    expiresAt: Date.now() + SERVER_CACHE_TTL_MS,
    body,
  });

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      "X-Cache": "MISS",
      "X-Latency-Ms": String(Math.round(performance.now() - started)),
    },
  });
}

export async function POST(request: Request) {
  const auth = await resolveAuthedSupabase(request);
  if (!auth) {
    return NextResponse.json({ error: "SESSION_REQUIRED" }, { status: 401 });
  }

  const userId = auth.userId;
  let musculo: Enums<"subgrupo_muscular"> | undefined;
  try {
    const payload = (await request.json()) as { musculo?: Enums<"subgrupo_muscular"> };
    musculo = payload.musculo;
  } catch {
    musculo = undefined;
  }

  const prefix = `${userId}:`;
  if (musculo) {
    serverCache.delete(cacheKey(userId, musculo));
  } else {
    for (const key of serverCache.keys()) {
      if (key.startsWith(prefix)) serverCache.delete(key);
    }
    trainingTrackCache.delete(userId);
  }

  return NextResponse.json({ ok: true });
}
