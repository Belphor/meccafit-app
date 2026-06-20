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
  DEFAULT_FORJADOR_TREINO_CONFIG,
  type ForjadorPrescriptionRow,
  type ForjadorTreinoConfig,
} from "@/lib/forjador-prescriptions";
import {
  composeDayTreinoSubgroup,
  collectUniqueMusclesFromSubgroup,
} from "@/lib/treino-subgroup";
import {
  DEFAULT_DASHBOARD_TAB,
  isDietaTabAllowed,
  resolveDashboardTabFromParam,
  type DashboardTabId,
} from "@/lib/dashboard-tabs";
import {
  DASHBOARD_TAB_CHANGE_EVENT,
  readDashboardTabFromLocation,
  syncDashboardTabToUrl,
  type DashboardTabChangeDetail,
} from "@/lib/dashboard-tab-navigation";
import {
  fetchCommunityMuralPosts,
  invalidateDashboardCaches,
  loadDashboardTrainingBundle,
  refreshDaySubgroupHistorico,
} from "@/lib/dashboard-data";
import { resolveSubgroupFromParam } from "@/lib/subgroup-routing";
import { parseThermalGravityState } from "@/lib/thermal-gravity";
import {
  BIOLOGICAL_BALANCE_MIN_AGE,
  DASHBOARD_HERO_TITLE,
  DASHBOARD_PORTAL_PADDING,
  DASHBOARD_SHELL,
  dashboardTabPanelClass,
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
import { invalidateComunidadeCache } from "@/lib/comunidade-cache";
import { supabase } from "@/lib/supabase";
import type { MuscleCalorRow } from "@/components/evolution/human-body-constants";
import {
  DEFAULT_TRAINING_TRACK,
  resolvePrescriptionsForSubgroup,
  type TrainingTrackState,
} from "@/lib/training-track";
import type { PlanilhaDayRow, WeekdayIndex } from "@/lib/training-week";
import {
  buildScheduleMap,
  resolveCalendarWeekdayIndex,
} from "@/lib/training-week";

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
  initialForjadorConfig?: ForjadorTreinoConfig;
  initialForjadorPrescriptions?: ForjadorPrescriptionRow[];
};

export function DashboardClient({
  userId,
  subgroupParam,
  tabParam,
  initialEvolutionCalor,
  initialEvolutionIgnicao,
  initialWeekSchedule,
  initialAthletePlan,
  initialForjadorConfig = DEFAULT_FORJADOR_TREINO_CONFIG,
  initialForjadorPrescriptions = [],
}: DashboardClientProps) {
  const router = useRouter();
  const catalogSubgroup = useMemo(
    () => resolveSubgroupFromParam(subgroupParam),
    [subgroupParam],
  );

  const scheduleMap = useMemo(
    () => buildScheduleMap(initialWeekSchedule ?? []),
    [initialWeekSchedule],
  );

  const [dataReady, setDataReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [profileRow, setProfileRow] = useState<Record<string, unknown> | null>(null);
  const [subgroup, setSubgroup] = useState<MuscleSubgroup>(catalogSubgroup);
  const [activeTrainingDay, setActiveTrainingDay] = useState<WeekdayIndex>(() =>
    resolveCalendarWeekdayIndex(),
  );
  const [isTreinoSwitching, setIsTreinoSwitching] = useState(false);
  const [forjadorConfig] = useState<ForjadorTreinoConfig>(initialForjadorConfig);
  const [forjadorPrescriptions] = useState<ForjadorPrescriptionRow[]>(initialForjadorPrescriptions);
  const treinoSwitchTokenRef = useRef(0);
  const activeTrainingDayRef = useRef(activeTrainingDay);
  const [baseVtcTotal, setBaseVtcTotal] = useState(0);
  const [lastSavedWeight, setLastSavedWeight] = useState(0);
  const [showSuperacaoFlash, setShowSuperacaoFlash] = useState(false);
  const [muralFocusToken, setMuralFocusToken] = useState(0);
  const [muralFocusExerciseName, setMuralFocusExerciseName] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<DashboardTabId>(DEFAULT_DASHBOARD_TAB);
  const [visitedTabs, setVisitedTabs] = useState<Set<DashboardTabId>>(
    () => new Set([DEFAULT_DASHBOARD_TAB]),
  );
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
  const tabBootstrappedRef = useRef(false);
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
    activeTrainingDayRef.current = activeTrainingDay;
  }, [activeTrainingDay]);

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
      const bootDay = resolveCalendarWeekdayIndex();
      const bootSubgroup = composeDayTreinoSubgroup(
        scheduleMap[bootDay],
        bundle.data.trainingTrack,
        forjadorPrescriptions,
        bootDay,
      );
      setActiveTrainingDay(bootDay);
      setSubgroup(bootSubgroup);

      const historicoResult = await refreshDaySubgroupHistorico(bootSubgroup);
      if (!isMounted) return;
      if (historicoResult.data) {
        setSubgroup(historicoResult.data);
      }

      setMuralPosts(bundle.data.muralPosts);
      setTrainingTrack(bundle.data.trainingTrack);
      setHasPersonalBond(bundle.data.hasPersonalBond);
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
  }, [forjadorPrescriptions, loadKey, scheduleMap, subgroupParam]);

  const applyDashboardTab = useCallback(
    (tab: DashboardTabId) => {
      if (!isDietaTabAllowed(hasPersonalBond, tab)) {
        setActiveTab(DEFAULT_DASHBOARD_TAB);
        return;
      }

      setActiveTab(tab);
      setVisitedTabs((current) => {
        if (current.has(tab)) return current;
        const next = new Set(current);
        next.add(tab);
        return next;
      });
    },
    [hasPersonalBond],
  );

  useEffect(() => {
    if (!dataReady || tabBootstrappedRef.current) return;

    tabBootstrappedRef.current = true;
    const resolved = resolveDashboardTabFromParam(tabParam, hasPersonalBond);
    applyDashboardTab(resolved);
    setVisitedTabs((current) => {
      const next = new Set(current);
      next.add(DEFAULT_DASHBOARD_TAB);
      next.add(resolved);
      return next;
    });
  }, [applyDashboardTab, dataReady, hasPersonalBond, tabParam]);

  useEffect(() => {
    if (!dataReady) return;

    const onTabChange = (event: Event) => {
      const detail = (event as CustomEvent<DashboardTabChangeDetail>).detail;
      if (detail?.tab) applyDashboardTab(detail.tab);
    };

    const onPopState = () => {
      const tab = readDashboardTabFromLocation();
      if (tab) applyDashboardTab(tab);
    };

    window.addEventListener(DASHBOARD_TAB_CHANGE_EVENT, onTabChange);
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener(DASHBOARD_TAB_CHANGE_EVENT, onTabChange);
      window.removeEventListener("popstate", onPopState);
    };
  }, [applyDashboardTab, dataReady]);

  const handleTabChange = useCallback(
    (tab: DashboardTabId) => {
      applyDashboardTab(tab);
      syncDashboardTabToUrl(tab, { subgrupo: subgroupParam, dispatch: false });
      window.dispatchEvent(
        new CustomEvent<DashboardTabChangeDetail>(DASHBOARD_TAB_CHANGE_EVENT, {
          detail: { tab: isDietaTabAllowed(hasPersonalBond, tab) ? tab : DEFAULT_DASHBOARD_TAB },
        }),
      );
    },
    [applyDashboardTab, hasPersonalBond, subgroupParam],
  );

  const handleSignOut = useCallback(async () => {
    invalidateComunidadeCache();
    clearThermicSessionCache();
    await supabase.auth.signOut();
    router.replace("/");
  }, [router]);

  const handleRetryLoad = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const handleTrainingDayPick = useCallback(
    (day: WeekdayIndex) => {
      if (day === activeTrainingDayRef.current) return;

      const switchToken = ++treinoSwitchTokenRef.current;
      setActiveTrainingDay(day);
      setIsTreinoSwitching(true);

      const instant = composeDayTreinoSubgroup(
        scheduleMap[day],
        trainingTrack,
        forjadorPrescriptions,
        day,
      );
      setSubgroup(instant);

      void refreshDaySubgroupHistorico(instant).then((result) => {
        if (switchToken !== treinoSwitchTokenRef.current) return;

        if (result.data) {
          setSubgroup(result.data);
        }

        setIsTreinoSwitching(false);
      });
    },
    [forjadorPrescriptions, scheduleMap, trainingTrack],
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

      const musculos = collectUniqueMusclesFromSubgroup(subgroupRef.current);
      await Promise.all(musculos.map((musculo) => invalidateDashboardCaches(userId, musculo)));

      const subgroupResult = await refreshDaySubgroupHistorico(subgroupRef.current);
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
    [forjadorPrescriptions, subgroupParam, trainingTrack, userId],
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
  >((exerciseName) => {
    if (profile?.role === "forjador_soberano") {
      return;
    }

    void fetchCommunityMuralPosts().then((result) => {
      if (result.data) setMuralPosts(result.data);
    });

    setMuralFocusExerciseName(exerciseName);
    setMuralFocusToken((token) => token + 1);
    handleTabChange("comunidade");
  }, [handleTabChange, profile?.role]);

  const closeVideoModal = useCallback(() => setVideoModal(CLOSED_VIDEO), []);

  const treinoSubgroup = subgroup;

  const subgroupPrescriptions = useMemo(
    () => resolvePrescriptionsForSubgroup(subgroup, trainingTrack.personalPrescriptions),
    [subgroup, trainingTrack.personalPrescriptions],
  );

  const treinoWorkspaceProps = {
    subgroup: treinoSubgroup,
    authUserId: userId,
    initialWeekSchedule,
    activeTrainingDay,
    forjadorConfig,
    forjadorPrescriptions,
    isTreinoSwitching,
    isIncubating,
    hasBiologicalBalance: (profile?.age ?? 0) >= BIOLOGICAL_BALANCE_MIN_AGE,
    onAltarMetricsChange: handleAltarMetricsChange,
    onSuperacaoFlashChange: setShowSuperacaoFlash,
    onOpenVideo: handleWatchVideo,
    onSuperacaoMural: publishMuralAscensao,
    onTrainingDayPick: handleTrainingDayPick,
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

            <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col">
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
                <div className="flex flex-col items-center overflow-x-clip text-center">
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

                  <div className={dashboardTabPanelClass(activeTab === "treino")}>
                    {trainingTrack.track === "personal" ? (
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
                        trainingTrack={trainingTrack}
                        {...treinoWorkspaceProps}
                      />
                    )}
                  </div>

                  {hasPersonalBond && visitedTabs.has("dieta") ? (
                    <div className={dashboardTabPanelClass(activeTab === "dieta")}>
                      <DietaPanel />
                    </div>
                  ) : null}

                  {visitedTabs.has("evolucao") ? (
                    <div className={dashboardTabPanelClass(activeTab === "evolucao")}>
                      <EvolutionAbaPanel
                        userId={userId}
                        initialCalorRows={initialEvolutionCalor}
                        initialIgnicao={initialEvolutionIgnicao}
                        profileName={profile.name}
                        variant="dashboard"
                      />
                    </div>
                  ) : null}

                  {visitedTabs.has("comunidade") ? (
                    <div className={dashboardTabPanelClass(activeTab === "comunidade")}>
                      <ComunidadePageClient
                        userId={userId}
                        profileName={profile.name}
                        phase={phase}
                        muralFocusToken={muralFocusToken}
                        muralFocusExerciseName={muralFocusExerciseName}
                      />
                    </div>
                  ) : null}

                  {visitedTabs.has("perfil") ? (
                    <div className={dashboardTabPanelClass(activeTab === "perfil")}>
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
