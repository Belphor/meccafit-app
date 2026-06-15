"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { SacredPhoenixSigil } from "@/components/dashboard/DashboardBrandAssets";
import { DashboardLoading } from "@/components/dashboard/DashboardLoading";
import { DashboardBrandHeader } from "@/components/dashboard/DashboardBrandHeader";
import { DashboardSignOutButton } from "@/components/dashboard/DashboardSignOutButton";
import { DashboardTabNav } from "@/components/dashboard/DashboardTabNav";
import { DashboardTreinoWorkspace } from "@/components/dashboard/DashboardTreinoWorkspace";
import { ComunidadePageClient } from "@/components/comunidade/comunidade-page-client";
import { AppShell } from "@/components/navigation/app-shell";
import { FenyxiaBrandFooter } from "@/components/FenyxiaBrandFooter";
import { PhoenixDisplayTitle } from "@/components/PhoenixDisplayTitle";
import { SuperacaoOverlay } from "@/components/SuperacaoOverlay";
import { PhoenixPhaseEngine } from "@/components/dashboard/PhoenixPhaseEngine";
import VideoModal from "@/components/VideoModal";
import type { AthletePlanConfig } from "@/components/evolution/plan-config-form";
import {
  buildDashboardHref,
  DEFAULT_DASHBOARD_TAB,
  isDietaTabAllowed,
  resolveDashboardTabFromParam,
  type DashboardTabId,
} from "@/lib/dashboard-tabs";
import {
  fetchCommunityMuralPosts,
  invalidateDashboardCaches,
  loadDashboardTrainingBundle,
  refreshSubgroupHistorico,
} from "@/lib/dashboard-data";
import { subgroupIdToMusculo } from "@/lib/subgroup-musculo";
import { resolveSubgroupFromParam } from "@/lib/subgroup-routing";
import { parseThermalGravityState } from "@/lib/thermal-gravity";
import {
  BIOLOGICAL_BALANCE_MIN_AGE,
  DASHBOARD_HERO_TITLE,
  DASHBOARD_PORTAL_PADDING,
  DASHBOARD_SHELL,
  DASHBOARD_TAB_CONTENT,
  PLASMA_HERO_TITLE,
} from "@/lib/dashboard-config";
import {
  readAltarDailyCardioPercent,
  STORAGE_VTC_UPDATE_EVENT,
  type StorageVtcUpdateDetail,
} from "@/lib/cardio-altar-daily";
import { computeAltarEnergy, resolveProfileIncubating } from "@/lib/mock-data";
import type { ClientProfile, MuscleSubgroup, MuralPost } from "@/lib/mock-data";
import { PORTAL_COPY } from "@/lib/portal-copy";
import { clearThermicSessionCache } from "@/lib/session-cache-cleanup";
import { supabase } from "@/lib/supabase";
import type { MuscleCalorRow } from "@/components/evolution/human-body-constants";
import {
  DEFAULT_TRAINING_TRACK,
  applyPersonalPrescriptionsToSubgroup,
  resolvePrescriptionsForSubgroup,
  type TrainingTrackState,
} from "@/lib/training-track";
import type { PlanilhaDayRow } from "@/lib/training-week";

const EvolutionAbaPanel = dynamic(
  () =>
    import("@/components/evolution/evolution-aba-view").then((module) => ({
      default: module.EvolutionAbaView,
    })),
  { loading: () => <DashboardLoading message="Carregando evolução..." /> },
);

const PlanConfigForm = dynamic(
  () =>
    import("@/components/evolution/plan-config-form").then((module) => ({
      default: module.PlanConfigForm,
    })),
  { loading: () => <DashboardLoading message="Carregando perfil..." /> },
);

const PersonalTreinoWorkspace = dynamic(
  () =>
    import("@/components/dashboard/PersonalTreinoWorkspace").then((module) => ({
      default: module.PersonalTreinoWorkspace,
    })),
  { loading: () => <DashboardLoading message="Abrindo via Personal..." /> },
);

const DietaPanel = dynamic(
  () =>
    import("@/components/dashboard/DietaPanel").then((module) => ({
      default: module.DietaPanel,
    })),
  { loading: () => <DashboardLoading message="Carregando dieta..." /> },
);

type VideoModalState = {
  isOpen: boolean;
  exerciseName: string;
  videoUrl: string;
};

const CLOSED_VIDEO: VideoModalState = { isOpen: false, exerciseName: "", videoUrl: "" };

type DashboardClientProps = {
  userId: string;
  subgroupParam: string | null;
  tabParam: string | null;
  initialEvolutionCalor?: MuscleCalorRow[];
  initialEvolutionIgnicao?: number;
  initialWeekSchedule?: PlanilhaDayRow[];
  initialAthletePlan?: AthletePlanConfig;
};

export function DashboardClient({
  userId,
  subgroupParam,
  tabParam,
  initialEvolutionCalor,
  initialEvolutionIgnicao,
  initialWeekSchedule,
  initialAthletePlan,
}: DashboardClientProps) {
  const router = useRouter();
  const catalogSubgroup = useMemo(
    () => resolveSubgroupFromParam(subgroupParam),
    [subgroupParam],
  );

  const [dataReady, setDataReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [profileRow, setProfileRow] = useState<Record<string, unknown> | null>(null);
  const [subgroup, setSubgroup] = useState<MuscleSubgroup>(catalogSubgroup);
  const [baseVtcTotal, setBaseVtcTotal] = useState(0);
  const [lastSavedWeight, setLastSavedWeight] = useState(0);
  const [showSuperacaoFlash, setShowSuperacaoFlash] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTabId>(DEFAULT_DASHBOARD_TAB);
  const [muralPosts, setMuralPosts] = useState<MuralPost[]>([]);
  const [videoModal, setVideoModal] = useState<VideoModalState>(CLOSED_VIDEO);
  const [reloadToken, setReloadToken] = useState(0);
  const [cardioAltarPercent, setCardioAltarPercent] = useState(() =>
    readAltarDailyCardioPercent(userId),
  );
  const [liveSessionVtcKg, setLiveSessionVtcKg] = useState(0);
  const [trainingTrack, setTrainingTrack] = useState<TrainingTrackState>(DEFAULT_TRAINING_TRACK);
  const [hasPersonalBond, setHasPersonalBond] = useState(false);
  const subgroupRef = useRef(subgroup);
  const loadKey = `${reloadToken}`;
  const [trackedLoadKey, setTrackedLoadKey] = useState(loadKey);
  const [trackedUserId, setTrackedUserId] = useState(userId);

  if (trackedLoadKey !== loadKey) {
    setTrackedLoadKey(loadKey);
    setDataReady(false);
    setLoadError(null);
  }

  if (trackedUserId !== userId) {
    setTrackedUserId(userId);
    setCardioAltarPercent(readAltarDailyCardioPercent(userId));
  }

  useEffect(() => {
    subgroupRef.current = subgroup;
  }, [subgroup]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      const bundle = await loadDashboardTrainingBundle(subgroupParam);
      if (!isMounted) return;

      if (bundle.error || !bundle.data) {
        setLoadError(bundle.error?.message ?? PORTAL_COPY.loadError);
        setDataReady(true);
        return;
      }

      setProfile(bundle.data.profile);
      setProfileRow(bundle.data.profileRow);
      setSubgroup(bundle.data.subgroup);
      setMuralPosts(bundle.data.muralPosts);
      setTrainingTrack(bundle.data.trainingTrack);
      setHasPersonalBond(bundle.data.hasPersonalBond);
      setActiveTab(resolveDashboardTabFromParam(tabParam, bundle.data.hasPersonalBond));
      const thermal = parseThermalGravityState(bundle.data.profileRow?.thermal_gravity);
      if (thermal) {
        setLiveSessionVtcKg(thermal.session_vtc_today);
      }
      setDataReady(true);
    }

    void loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [loadKey, subgroupParam, tabParam]);

  useEffect(() => {
    if (!dataReady) return;

    const nextSubgroup = resolveSubgroupFromParam(subgroupParam);
    if (nextSubgroup.id === subgroup.id) return;

    let cancelled = false;
    void refreshSubgroupHistorico(nextSubgroup).then((result) => {
      if (!cancelled && result.data) {
        setSubgroup(result.data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [dataReady, subgroup.id, subgroupParam]);

  useEffect(() => {
    if (!dataReady) return;

    if (tabParam === "dieta" && !hasPersonalBond) {
      setActiveTab(DEFAULT_DASHBOARD_TAB);
      router.replace(
        buildDashboardHref({
          subgrupo: subgroupParam,
          tab: DEFAULT_DASHBOARD_TAB,
        }),
      );
      return;
    }

    const resolvedTab = resolveDashboardTabFromParam(tabParam, hasPersonalBond);
    setActiveTab((current) => (current === resolvedTab ? current : resolvedTab));
  }, [dataReady, hasPersonalBond, router, subgroupParam, tabParam]);

  const handleTabChange = useCallback(
    (tab: DashboardTabId) => {
      if (!isDietaTabAllowed(hasPersonalBond, tab)) {
        setActiveTab(DEFAULT_DASHBOARD_TAB);
        router.replace(
          buildDashboardHref({
            subgrupo: subgroupParam,
            tab: DEFAULT_DASHBOARD_TAB,
          }),
        );
        return;
      }

      setActiveTab(tab);
      router.replace(
        buildDashboardHref({
          subgrupo: subgroupParam,
          tab,
        }),
      );
    },
    [hasPersonalBond, router, subgroupParam],
  );

  const handleSignOut = useCallback(async () => {
    clearThermicSessionCache();
    await supabase.auth.signOut();
    router.replace("/");
  }, [router]);

  const handleRetryLoad = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const handleTreinoSubgroupNavigate = useCallback(
    (subgroupSlug: string) => {
      const nextSubgroup = resolveSubgroupFromParam(subgroupSlug);
      if (nextSubgroup.id === subgroup.id) return;

      const href = buildDashboardHref({
        subgrupo: subgroupSlug,
        tab: activeTab === DEFAULT_DASHBOARD_TAB ? null : activeTab,
      });
      window.history.replaceState(window.history.state, "", href);

      void refreshSubgroupHistorico(nextSubgroup).then((result) => {
        if (result.data) {
          setSubgroup(result.data);
        }
      });
    },
    [activeTab, subgroup.id],
  );

  useEffect(() => {
    const onStorageVtcUpdate = (event: Event) => {
      const detail = (event as CustomEvent<StorageVtcUpdateDetail>).detail;
      if (!detail || detail.userId !== userId) return;
      setCardioAltarPercent(detail.cardioCompletionPercent);
    };

    window.addEventListener(STORAGE_VTC_UPDATE_EVENT, onStorageVtcUpdate);
    return () => window.removeEventListener(STORAGE_VTC_UPDATE_EVENT, onStorageVtcUpdate);
  }, [userId]);

  const isIncubating = resolveProfileIncubating(profile?.status ?? "");
  const altarEnergy = useMemo(
    () => computeAltarEnergy(baseVtcTotal, lastSavedWeight),
    [baseVtcTotal, lastSavedWeight],
  );
  const altarEnergyPercent = Math.min(
    100,
    Math.max(Math.round(altarEnergy * 100), cardioAltarPercent),
  );

  const handleAltarMetricsChange = useCallback((nextBaseVtc: number, nextWeight: number) => {
    setBaseVtcTotal(nextBaseVtc);
    if (nextWeight > 0) {
      setLastSavedWeight(nextWeight);
    }
  }, []);

  const handleTrainingPersisted = useCallback(
    async (_exerciseId: number, detail?: { vtcGenerated: number }) => {
      const liveIncrement = detail?.vtcGenerated ?? 0;
      if (liveIncrement > 0) {
        setLiveSessionVtcKg((current) =>
          Math.round((current + liveIncrement) * 100) / 100,
        );
      }

      const musculo = subgroupIdToMusculo(subgroupRef.current.id);
      await invalidateDashboardCaches(userId, musculo);

      const subgroupResult = await refreshSubgroupHistorico(subgroupRef.current);
      const muralResult = await fetchCommunityMuralPosts();
      const bundleResult = await loadDashboardTrainingBundle(subgroupParam);

      if (subgroupResult.data) {
        setSubgroup(subgroupResult.data);
      }

      if (muralResult.data) {
        setMuralPosts(muralResult.data);
      }

      if (bundleResult.data?.profileRow) {
        setProfileRow(bundleResult.data.profileRow);
        const thermal = parseThermalGravityState(bundleResult.data.profileRow.thermal_gravity);
        if (thermal) {
          setLiveSessionVtcKg((current) =>
            Math.max(current, thermal.session_vtc_today),
          );
        }
      }

      if (bundleResult.data) {
        setTrainingTrack(bundleResult.data.trainingTrack);
        setHasPersonalBond(bundleResult.data.hasPersonalBond);
      }
    },
    [subgroupParam, userId],
  );

  const handleWatchVideo = useCallback(
    (exerciseId: number) => {
      const exercise = subgroup.exercises.find((item) => item.id === exerciseId);
      if (!exercise) return;
      setVideoModal({
        isOpen: true,
        exerciseName: exercise.name,
        videoUrl: exercise.video_url,
      });
    },
    [subgroup.exercises],
  );

  const publishMuralAscensao = useCallback<
    (exerciseName: string, payload: { weight: number; series: number; vtc: number }) => void
  >(() => {
    if (profile?.role === "forjador_soberano") {
      return;
    }
    void fetchCommunityMuralPosts().then((result) => {
      if (result.data) setMuralPosts(result.data);
    });
    handleTabChange("comunidade");
  }, [handleTabChange, profile?.role]);

  const closeVideoModal = useCallback(() => setVideoModal(CLOSED_VIDEO), []);

  const treinoSubgroup = useMemo(() => {
    if (trainingTrack.track !== "personal") {
      return subgroup;
    }
    return applyPersonalPrescriptionsToSubgroup(
      subgroup,
      trainingTrack.personalPrescriptions,
    );
  }, [subgroup, trainingTrack]);

  const subgroupPrescriptions = useMemo(
    () => resolvePrescriptionsForSubgroup(subgroup, trainingTrack.personalPrescriptions),
    [subgroup, trainingTrack.personalPrescriptions],
  );

  const treinoWorkspaceProps = {
    subgroup: treinoSubgroup,
    authUserId: userId,
    initialWeekSchedule,
    isIncubating,
    hasBiologicalBalance: (profile?.age ?? 0) >= BIOLOGICAL_BALANCE_MIN_AGE,
    onAltarMetricsChange: handleAltarMetricsChange,
    onSuperacaoFlashChange: setShowSuperacaoFlash,
    onOpenVideo: handleWatchVideo,
    onSuperacaoMural: publishMuralAscensao,
    onSubgroupNavigate: handleTreinoSubgroupNavigate,
    onTrainingPersisted: (exerciseId: number, detail?: { vtcGenerated: number }) =>
      void handleTrainingPersisted(exerciseId, detail),
  } as const;

  if (!dataReady) {
    return <DashboardLoading message="Sincronizando dados do altar..." />;
  }

  if (loadError || !profile) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-black px-5 text-center">
        <div className="max-w-md">
          <p className="text-sm text-red-300">{loadError ?? PORTAL_COPY.profileUnavailable}</p>
          <button
            type="button"
            onClick={handleRetryLoad}
            className="mt-4 text-xs uppercase tracking-[0.2em] text-amber-400 underline-offset-4 hover:underline"
          >
            Tentar novamente
          </button>
          <DashboardSignOutButton onClick={() => void handleSignOut()} className="mt-4" />
        </div>
      </main>
    );
  }

  return (
    <PhoenixPhaseEngine userId={userId} profileRow={profileRow} liveSessionVtcKg={liveSessionVtcKg}>
      {(phase) => (
        <AppShell>
          <main className={DASHBOARD_SHELL}>
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "var(--meccafit-ambient-gradient)" }}
              aria-hidden="true"
            />
            <SuperacaoOverlay visible={showSuperacaoFlash} />

            <section className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col">
              <DashboardBrandHeader
                altarEnergyPercent={altarEnergyPercent}
                signOutButton={
                  <DashboardSignOutButton
                    onClick={() => void handleSignOut()}
                    className="relative z-10 shrink-0"
                  />
                }
              />

              <BrasaVivaCard
                as="article"
                variant="portal"
                className={DASHBOARD_PORTAL_PADDING}
                aria-label={PORTAL_COPY.portalBrasaAria}
              >
                <div className="flex flex-col items-center overflow-visible text-center">
                  <SacredPhoenixSigil altarEnergy={altarEnergy} />
                  <PhoenixDisplayTitle className={DASHBOARD_HERO_TITLE}>
                    {PORTAL_COPY.leaveYesterday}
                  </PhoenixDisplayTitle>
                  <p className={`${PLASMA_HERO_TITLE} mt-3`} aria-label={PORTAL_COPY.rebirthTodayAria}>
                    {PORTAL_COPY.rebirthToday}
                  </p>
                </div>

                <div className="z-[1]">
                  <DashboardTabNav
                    activeTab={activeTab}
                    muralCount={muralPosts.length}
                    hasPersonalBond={hasPersonalBond}
                    onTabChange={handleTabChange}
                  />

                  {activeTab === "treino" ? (
                    trainingTrack.track === "personal" ? (
                      <PersonalTreinoWorkspace
                        key="personal-treino"
                        trainingTrack={trainingTrack}
                        subgroupPrescriptions={subgroupPrescriptions}
                        profile={profile}
                        {...treinoWorkspaceProps}
                      />
                    ) : (
                      <DashboardTreinoWorkspace
                        key="common-treino"
                        profile={profile}
                        {...treinoWorkspaceProps}
                      />
                    )
                  ) : null}

                  {activeTab === "dieta" && hasPersonalBond ? (
                    <div className={DASHBOARD_TAB_CONTENT}>
                      <DietaPanel />
                    </div>
                  ) : null}

                  {activeTab === "evolucao" ? (
                    <div className={DASHBOARD_TAB_CONTENT}>
                      <EvolutionAbaPanel
                        userId={userId}
                        initialCalorRows={initialEvolutionCalor}
                        initialIgnicao={initialEvolutionIgnicao}
                        profileName={profile.name}
                        variant="dashboard"
                      />
                    </div>
                  ) : null}

                  {activeTab === "comunidade" ? (
                    <div className={DASHBOARD_TAB_CONTENT}>
                      <ComunidadePageClient userId={userId} phase={phase} />
                    </div>
                  ) : null}

                  {activeTab === "perfil" ? (
                    <div className={DASHBOARD_TAB_CONTENT}>
                      <PlanConfigForm userId={userId} initialPlan={initialAthletePlan} />
                    </div>
                  ) : null}
                </div>
              </BrasaVivaCard>

              <FenyxiaBrandFooter className="mt-8" />
            </section>

            <VideoModal
              isOpen={videoModal.isOpen}
              exerciseName={videoModal.exerciseName}
              videoUrl={videoModal.videoUrl}
              onClose={closeVideoModal}
            />
          </main>
        </AppShell>
      )}
    </PhoenixPhaseEngine>
  );
}
