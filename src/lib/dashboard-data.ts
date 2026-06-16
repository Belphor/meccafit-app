import { resolveSubgroupFromParam } from "@/lib/subgroup-routing";
import { subgroupIdToMusculo } from "@/lib/subgroup-musculo";
import { ARGOS_WEIGHT_MAX } from "@/lib/dashboard-config";
import {
  invalidateDashboardBundleCache,
  readDashboardBundleCache,
  writeDashboardBundleCache,
} from "@/lib/dashboard-cache";
import {
  enrichProfileRowWithThermalGravity,
  fetchThermalGravityMetrics,
} from "@/lib/thermal-gravity-server";
import {
  getActiveSupabaseSession,
  supabase,
  withSupabaseRlsGuard,
  type SupabaseGuardResult,
} from "@/lib/supabase";
import type {
  ClientProfile,
  Exercise,
  MuralPost,
  MuscleSubgroup,
} from "@/lib/mock-data";
import type { Database, Enums } from "@/types/database.types";
import {
  DEFAULT_TRAINING_TRACK,
  parseHasPersonalBondFromBundle,
  parseTrainingTrackFromBundle,
  type TrainingTrackState,
} from "@/lib/training-track";
import { fetchTrainingTrackForUser } from "@/lib/training-track.server";

export type DashboardProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "full_name" | "nome_linhagem" | "status_altar" | "data_nascimento" | "role"
> & {
  phase_tier?: number;
  phase_setup_at?: string;
  custom_preferences?: unknown;
  phase_progress?: unknown;
};

export function profileRowToEnginePayload(
  row: DashboardProfileRow | null | undefined,
): Record<string, unknown> | null {
  if (!row) return null;
  const payload: Record<string, unknown> = {
    phase_tier: row.phase_tier ?? 1,
    phase_setup_at: row.phase_setup_at,
    custom_preferences: row.custom_preferences,
    phase_progress: row.phase_progress,
  };

  const extended = row as DashboardProfileRow & {
    phase_reached?: unknown;
    active_phase_layout?: unknown;
    thermal_gravity?: unknown;
  };

  if (extended.phase_reached !== undefined) payload.phase_reached = extended.phase_reached;
  if (extended.active_phase_layout !== undefined) {
    payload.active_phase_layout = extended.active_phase_layout;
  }
  if (extended.thermal_gravity !== undefined) payload.thermal_gravity = extended.thermal_gravity;

  return payload;
}

export type HistoricoTreinoRow = Pick<
  Database["public"]["Tables"]["historico_treinos"]["Row"],
  | "id"
  | "exercicio_id"
  | "exercicio_nome"
  | "musculo"
  | "peso"
  | "peso_atual"
  | "series"
  | "repeticoes"
  | "status"
  | "registrado_em"
>;

const PROFILE_COLUMNS =
  "full_name, nome_linhagem, status_altar, data_nascimento, role, phase_tier, phase_setup_at, custom_preferences" as const;

const HISTORICO_COLUMNS =
  "id, exercicio_id, exercicio_nome, musculo, peso, peso_atual, series, repeticoes, status, registrado_em" as const;

function normalizeWeight(raw: number | string | null | undefined): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > ARGOS_WEIGHT_MAX) return 0;
  return Number(parsed.toFixed(2));
}

function computeAgeFromBirthDate(birthDate: string | null | undefined): number {
  if (!birthDate) return 0;

  const birth = new Date(`${birthDate}T12:00:00.000Z`);
  if (Number.isNaN(birth.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return Math.max(0, age);
}

function resolveBirthPhase(age: number): string {
  if (age >= 40) return "Fase Brasa Madura";
  if (age >= 30) return "Fase Chama Estável";
  if (age >= 18) return "Fase Faísca";
  return "Fase Despertar";
}

export function mapProfileRowToClientProfile(row: DashboardProfileRow): ClientProfile {
  const age = computeAgeFromBirthDate(row.data_nascimento);

  return {
    name: row.full_name?.trim() || "Membro da Linhagem",
    lineage: row.nome_linhagem?.trim() || "Linhagem Meccafit",
    status: row.status_altar?.trim() || "Ativo",
    birth: resolveBirthPhase(age),
    age,
    role: row.role,
  };
}

export function applyHistoricoToSubgroup(
  subgroup: MuscleSubgroup,
  rows: HistoricoTreinoRow[],
): MuscleSubgroup {
  const historicoByExerciseId = new Map<number, HistoricoTreinoRow>();

  for (const row of rows) {
    if (typeof row.exercicio_id !== "number") continue;
    historicoByExerciseId.set(row.exercicio_id, row);
  }

  const exercises: Exercise[] = subgroup.exercises.map((exercise) => {
    const historico = historicoByExerciseId.get(exercise.id);
    if (!historico) return exercise;

    const persistedWeight = normalizeWeight(historico.peso ?? historico.peso_atual);
    const historicalPrWeight = persistedWeight;

    return {
      ...exercise,
      ...(persistedWeight > 0 ? { currentWeight: persistedWeight } : null),
      historicalPrWeight: historicalPrWeight > 0 ? historicalPrWeight : exercise.historicalPrWeight,
      // Conclusão do dia vem da sessão local (como cardio) — histórico só guarda PR/registro.
      completedSets: 0,
    };
  });

  return { ...subgroup, exercises };
}

export function mergeSessionCompletedSets(
  subgroup: MuscleSubgroup,
  completedSetsByExerciseId: Record<number, number>,
): MuscleSubgroup {
  const reconciled = reconcileSessionCompletedSets(subgroup, completedSetsByExerciseId);

  return {
    ...subgroup,
    exercises: subgroup.exercises.map((exercise) => {
      const sessionCompleted = Math.trunc(reconciled[exercise.id] ?? 0);
      if (sessionCompleted <= 0) return exercise;

      return {
        ...exercise,
        completedSets: Math.min(
          exercise.targetSets,
          Math.max(exercise.completedSets, sessionCompleted),
        ),
      };
    }),
  };
}

/** Mantém apenas conclusões válidas do dia corrente (sessão localStorage). */
export function reconcileSessionCompletedSets(
  subgroup: MuscleSubgroup,
  completedSetsByExerciseId: Record<number, number>,
): Record<number, number> {
  const next: Record<number, number> = {};

  for (const exercise of subgroup.exercises) {
    const sessionCompleted = Math.trunc(completedSetsByExerciseId[exercise.id] ?? 0);
    if (sessionCompleted <= 0) continue;

    next[exercise.id] = Math.min(exercise.targetSets, sessionCompleted);
  }

  return next;
}

export function reconcileSessionMaxLoads(
  subgroup: MuscleSubgroup,
  completedSetsByExerciseId: Record<number, number>,
  maxLoadsByExerciseId: Record<number, number>,
): Record<number, number> {
  const next: Record<number, number> = {};

  for (const exercise of subgroup.exercises) {
    const load = maxLoadsByExerciseId[exercise.id];
    if (typeof load !== "number" || !Number.isFinite(load) || load <= 0) continue;

    const sessionCompleted = Math.trunc(completedSetsByExerciseId[exercise.id] ?? 0);
    if (sessionCompleted < exercise.targetSets) continue;

    next[exercise.id] = load;
  }

  return next;
}

export const MURAL_COMMUNITY_DEFAULT_LIMIT = 48;
export const MURAL_COMMUNITY_MAX_LIMIT = 100;

export type CommunityMuralRow = {
  id: number;
  exercicio_nome: string;
  peso: number;
  series: number;
  registrado_em: string;
  atleta_nome: string;
  nome_linhagem: string;
  author_id?: string;
  tem_cinturao_duelo?: boolean;
  is_rei_das_chamas?: boolean;
  is_pilar_cooperativo?: boolean;
  /** legado pré-THOTH */
  detem_cinturao_duelo?: boolean;
  is_pilar_fogo_cosmico?: boolean;
};

export function mapCommunityMuralRowsToPosts(rows: CommunityMuralRow[]): MuralPost[] {
  return rows.map((row) => ({
    id: `mural-${row.id}`,
    exerciseName: row.exercicio_nome?.trim() || "Exercício",
    weight: normalizeWeight(row.peso),
    series: Math.max(1, Number(row.series) || 1),
    createdAt: row.registrado_em ?? new Date().toISOString(),
    athleteId: row.author_id ? String(row.author_id) : undefined,
    athleteName: row.atleta_nome?.trim() || "Membro da Linhagem",
    lineageName: row.nome_linhagem?.trim() || "Linhagem Meccafit",
    temCinturaoDuelo: Boolean(row.tem_cinturao_duelo ?? row.detem_cinturao_duelo),
    isReiDasChamas: Boolean(row.is_rei_das_chamas),
    isPilarCooperativo: Boolean(row.is_pilar_cooperativo ?? row.is_pilar_fogo_cosmico),
  }));
}

export async function fetchOwnDashboardProfile(): Promise<
  SupabaseGuardResult<ClientProfile>
> {
  const session = await getActiveSupabaseSession();
  if (!session?.user.id) {
    return {
      data: null,
      error: {
        code: "SESSION_REQUIRED",
        message: "Faça login novamente para carregar o perfil.",
      },
    };
  }

  const userId = session.user.id;

  const guarded = await withSupabaseRlsGuard(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();

    if (error) return { data: null, error };
    if (!data) return { data: null, error: null };

    return { data: mapProfileRowToClientProfile(data), error: null };
  });

  if (guarded.data === null && !guarded.error) {
    return {
      data: null,
      error: {
        code: "SUPABASE_ERROR",
        message: "Perfil não encontrado no altar.",
      },
    };
  }

  return guarded;
}

export async function fetchOwnHistoricoTreinos(
  musculo: Enums<"subgrupo_muscular">,
): Promise<SupabaseGuardResult<HistoricoTreinoRow[]>> {
  const session = await getActiveSupabaseSession();
  if (!session?.user.id) {
    return {
      data: null,
      error: {
        code: "SESSION_REQUIRED",
        message: "Faça login novamente para carregar o histórico.",
      },
    };
  }

  const userId = session.user.id;

  return withSupabaseRlsGuard(async () => {
    const { data, error } = await supabase
      .from("historico_treinos")
      .select(HISTORICO_COLUMNS)
      .eq("cliente_id", userId)
      .eq("musculo", musculo)
      .order("registrado_em", { ascending: false });

    return { data: data ?? [], error };
  });
}

export async function fetchCommunityMuralPosts(
  limit: number = MURAL_COMMUNITY_DEFAULT_LIMIT,
): Promise<SupabaseGuardResult<MuralPost[]>> {
  const session = await getActiveSupabaseSession();
  if (!session?.user.id) {
    return {
      data: null,
      error: {
        code: "SESSION_REQUIRED",
        message: "Faça login novamente para carregar o mural da comunidade.",
      },
    };
  }

  const safeLimit = Math.min(
    MURAL_COMMUNITY_MAX_LIMIT,
    Math.max(1, Math.trunc(limit) || MURAL_COMMUNITY_DEFAULT_LIMIT),
  );

  return withSupabaseRlsGuard(async () => {
    const { data, error } = await supabase.rpc("argos_fetch_mural_comunidade", {
      p_limit: safeLimit,
    });

    if (error) return { data: null, error };

    const rows = (data ?? []) as CommunityMuralRow[];
    return { data: mapCommunityMuralRowsToPosts(rows), error: null };
  });
}

export async function invalidateDashboardCaches(
  userId: string,
  musculo?: Enums<"subgrupo_muscular">,
): Promise<void> {
  invalidateDashboardBundleCache(userId, musculo);

  try {
    await fetch("/api/dashboard/bundle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(musculo ? { musculo } : {}),
    });
  } catch {
    // rota indisponível offline — cache client-side já foi limpo
  }
}

async function fetchDashboardBundleFromApi(subgroupParam: string | null): Promise<
  SupabaseGuardResult<{
    profile: ClientProfile;
    profileRow: Record<string, unknown> | null;
    subgroup: MuscleSubgroup;
    muralPosts: MuralPost[];
    musculo: Enums<"subgrupo_muscular">;
    historico: HistoricoTreinoRow[];
    trainingTrack: TrainingTrackState;
    hasPersonalBond: boolean;
  }>
> {
  const query = subgroupParam ? `?subgrupo=${encodeURIComponent(subgroupParam)}` : "";
  const response = await fetch(`/api/dashboard/bundle${query}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (response.status === 401) {
    return {
      data: null,
      error: {
        code: "SESSION_REQUIRED",
        message: "Faça login novamente para carregar o dashboard.",
      },
    };
  }

  if (!response.ok) {
    return {
      data: null,
      error: {
        code: "SUPABASE_ERROR",
        message: "Falha ao carregar bundle do dashboard.",
      },
    };
  }

  const payload = (await response.json()) as {
    profile: ClientProfile;
    profileRow?: Record<string, unknown> | null;
    subgroup: MuscleSubgroup;
    muralPosts: MuralPost[];
    musculo: Enums<"subgrupo_muscular">;
    historico?: HistoricoTreinoRow[];
    trainingTrack?: TrainingTrackState;
    hasPersonalBond?: boolean;
  };

  const trainingTrack = parseTrainingTrackFromBundle(payload.trainingTrack);
  const hasPersonalBond = parseHasPersonalBondFromBundle(
    payload.hasPersonalBond,
    trainingTrack,
  );

  return {
    data: {
      ...payload,
      profileRow: payload.profileRow ?? null,
      historico: payload.historico ?? [],
      trainingTrack,
      hasPersonalBond,
    },
    error: null,
  };
}

async function fetchDashboardBundleDirect(subgroupParam: string | null): Promise<
  SupabaseGuardResult<{
    profile: ClientProfile;
    profileRow: Record<string, unknown> | null;
    subgroup: MuscleSubgroup;
    muralPosts: MuralPost[];
    musculo: Enums<"subgrupo_muscular">;
    historico: HistoricoTreinoRow[];
    trainingTrack: TrainingTrackState;
    hasPersonalBond: boolean;
  }>
> {
  const session = await getActiveSupabaseSession();
  if (!session?.user.id) {
    return {
      data: null,
      error: {
        code: "SESSION_REQUIRED",
        message: "Faça login novamente para carregar o dashboard.",
      },
    };
  }

  const baseSubgroup = resolveSubgroupFromParam(subgroupParam);
  const musculo = subgroupIdToMusculo(baseSubgroup.id);
  const trainingTrack = await fetchTrainingTrackForUser(supabase, session.user.id);
  const hasPersonalBond = Boolean(trainingTrack.bond);

  const rpcResult = await withSupabaseRlsGuard(async () => {
    const { data, error } = await supabase.rpc("fetch_dashboard_bundle", {
      p_musculo: musculo,
      p_mural_limit: MURAL_COMMUNITY_DEFAULT_LIMIT,
    });
    return { data, error };
  });

  if (!rpcResult.error && rpcResult.data && typeof rpcResult.data === "object") {
    const bundle = rpcResult.data as {
      profile?: DashboardProfileRow | null;
      historico?: HistoricoTreinoRow[] | null;
      mural?: CommunityMuralRow[] | null;
    };

    if (bundle.profile) {
      const historico = bundle.historico ?? [];
      const baseProfileRow = profileRowToEnginePayload(bundle.profile) ?? {};
      let enrichedProfileRow: Record<string, unknown> = baseProfileRow;

      try {
        const metrics = await fetchThermalGravityMetrics(supabase, session.user.id);
        enrichedProfileRow = enrichProfileRowWithThermalGravity(baseProfileRow, metrics);
      } catch {
        // RPC thermal gravity indisponível — perfil base sem degradação
      }

      return {
        data: {
          profile: mapProfileRowToClientProfile(bundle.profile),
          profileRow: enrichedProfileRow,
          subgroup: applyHistoricoToSubgroup(baseSubgroup, historico),
          muralPosts: mapCommunityMuralRowsToPosts(bundle.mural ?? []),
          musculo,
          historico,
          trainingTrack,
          hasPersonalBond,
        },
        error: null,
      };
    }
  }

  const [profileRowResult, historicoResult, muralResult] = await Promise.all([
    withSupabaseRlsGuard(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", session.user.id)
        .maybeSingle();
      return { data, error };
    }),
    fetchOwnHistoricoTreinos(musculo),
    fetchCommunityMuralPosts(),
  ]);

  if (profileRowResult.error || !profileRowResult.data) {
    return {
      data: null,
      error:
        profileRowResult.error ?? { code: "SUPABASE_ERROR", message: "Perfil indisponível." },
    };
  }
  if (historicoResult.error) return { data: null, error: historicoResult.error };
  if (muralResult.error) return { data: null, error: muralResult.error };

  const historico = historicoResult.data ?? [];
  const baseProfileRow = profileRowToEnginePayload(profileRowResult.data as DashboardProfileRow) ?? {};
  let enrichedProfileRow: Record<string, unknown> = baseProfileRow;

  try {
    const metrics = await fetchThermalGravityMetrics(supabase, session.user.id);
    enrichedProfileRow = enrichProfileRowWithThermalGravity(baseProfileRow, metrics);
  } catch {
    // RPC thermal gravity indisponível
  }

  return {
    data: {
      profile: mapProfileRowToClientProfile(profileRowResult.data as DashboardProfileRow),
      profileRow: enrichedProfileRow,
      subgroup: applyHistoricoToSubgroup(baseSubgroup, historico),
      muralPosts: muralResult.data ?? [],
      musculo,
      historico,
      trainingTrack,
      hasPersonalBond,
    },
    error: null,
  };
}

export async function loadDashboardTrainingBundle(subgroupParam: string | null): Promise<
  SupabaseGuardResult<{
    profile: ClientProfile;
    profileRow: Record<string, unknown> | null;
    subgroup: MuscleSubgroup;
    muralPosts: MuralPost[];
    trainingTrack: TrainingTrackState;
    hasPersonalBond: boolean;
  }>
> {
  const session = await getActiveSupabaseSession();
  if (!session?.user.id) {
    return {
      data: null,
      error: {
        code: "SESSION_REQUIRED",
        message: "Faça login novamente para carregar o dashboard.",
      },
    };
  }

  const baseSubgroup = resolveSubgroupFromParam(subgroupParam);
  const musculo = subgroupIdToMusculo(baseSubgroup.id);
  const cached = readDashboardBundleCache(session.user.id, musculo);
  if (cached) {
    return {
      data: {
        profile: cached.profile,
        profileRow: cached.profileRow ?? null,
        subgroup: applyHistoricoToSubgroup(baseSubgroup, cached.historico),
        muralPosts: cached.muralPosts,
        trainingTrack: cached.trainingTrack ?? DEFAULT_TRAINING_TRACK,
        hasPersonalBond: cached.hasPersonalBond ?? Boolean(cached.trainingTrack?.bond),
      },
      error: null,
    };
  }

  const apiResult = await fetchDashboardBundleFromApi(subgroupParam);
  const resolved =
    apiResult.data || apiResult.error?.code === "SESSION_REQUIRED"
      ? apiResult
      : await fetchDashboardBundleDirect(subgroupParam);

  if (resolved.error || !resolved.data) {
    return { data: null, error: resolved.error };
  }

  writeDashboardBundleCache(session.user.id, {
    profile: resolved.data.profile,
    profileRow: resolved.data.profileRow,
    historico: resolved.data.historico,
    muralPosts: resolved.data.muralPosts,
    musculo: resolved.data.musculo,
    trainingTrack: resolved.data.trainingTrack,
    hasPersonalBond: resolved.data.hasPersonalBond,
    fetchedAt: Date.now(),
  });

  return {
    data: {
      profile: resolved.data.profile,
      profileRow: resolved.data.profileRow,
      subgroup: resolved.data.subgroup,
      muralPosts: resolved.data.muralPosts,
      trainingTrack: resolved.data.trainingTrack,
      hasPersonalBond: resolved.data.hasPersonalBond,
    },
    error: null,
  };
}

export async function refreshSubgroupHistorico(
  subgroup: MuscleSubgroup,
): Promise<SupabaseGuardResult<MuscleSubgroup>> {
  const session = await getActiveSupabaseSession();
  const musculo = subgroupIdToMusculo(subgroup.id);

  if (session?.user.id) {
    await invalidateDashboardCaches(session.user.id, musculo);
  }

  const historicoResult = await fetchOwnHistoricoTreinos(musculo);

  if (historicoResult.error) {
    return { data: null, error: historicoResult.error };
  }

  return {
    data: applyHistoricoToSubgroup(subgroup, historicoResult.data ?? []),
    error: null,
  };
}
