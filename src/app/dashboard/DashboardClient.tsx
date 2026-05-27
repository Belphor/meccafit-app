"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { SacredPhoenixSigil } from "@/components/dashboard/DashboardBrandAssets";
import { DashboardLoading } from "@/components/dashboard/DashboardLoading";
import { DashboardBrandHeader } from "@/components/dashboard/DashboardBrandHeader";
import { DashboardSignOutButton } from "@/components/dashboard/DashboardSignOutButton";
import { DashboardTabNav, type DashboardTabId } from "@/components/dashboard/DashboardTabNav";
import { DashboardTreinoWorkspace } from "@/components/dashboard/DashboardTreinoWorkspace";
import { FenyxiaBrandFooter } from "@/components/FenyxiaBrandFooter";
import { PhoenixDisplayTitle } from "@/components/PhoenixDisplayTitle";
import { SuperacaoOverlay } from "@/components/SuperacaoOverlay";
import { AnimaFenixEngine } from "@/components/dashboard/AnimaFenixEngine";
import VideoModal from "@/components/VideoModal";
import {
  fetchCommunityMuralPosts,
  loadDashboardTrainingBundle,
  refreshSubgroupHistorico,
} from "@/lib/dashboard-data";
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
import { resolveSubgroupFromParam } from "@/lib/subgroup-routing";
import { PORTAL_COPY } from "@/lib/portal-copy";
import { mapMuralPostsToForumTopics } from "@/lib/forum-brasa-viva-data";
import { clearThermicSessionCache } from "@/lib/session-cache-cleanup";
import { supabase } from "@/lib/supabase";

const EvolucaoSelfiePanel = dynamic(
  () =>
    import("@/components/dashboard/EvolucaoSelfiePanel").then((module) => ({
      default: module.EvolucaoSelfiePanel,
    })),
  { loading: () => <DashboardLoading message="Abrindo evolução..." /> },
);

const ForumBrasaVivaPanel = dynamic(
  () =>
    import("@/features/forum-brasa-viva/ForumBrasaVivaView").then((module) => ({
      default: module.ForumBrasaVivaView,
    })),
  { loading: () => <DashboardLoading message="Abrindo Fórum Brasa-Viva..." /> },
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
};

export function DashboardClient({ userId, subgroupParam }: DashboardClientProps) {
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
  const [activeTab, setActiveTab] = useState<DashboardTabId>("treino");
  const [muralPosts, setMuralPosts] = useState<MuralPost[]>([]);
  const [videoModal, setVideoModal] = useState<VideoModalState>(CLOSED_VIDEO);
  const [reloadToken, setReloadToken] = useState(0);
  const [cardioAltarPercent, setCardioAltarPercent] = useState(0);
  const [liveSessionVtcKg, setLiveSessionVtcKg] = useState(0);
  const subgroupRef = useRef(subgroup);
  subgroupRef.current = subgroup;

  useEffect(() => {
    let isMounted = true;
    setDataReady(false);
    setLoadError(null);

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
  }, [subgroupParam, reloadToken]);

  const handleSignOut = useCallback(async () => {
    clearThermicSessionCache();
    await supabase.auth.signOut();
    router.replace("/");
  }, [router]);

  const handleRetryLoad = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    setCardioAltarPercent(readAltarDailyCardioPercent(userId));
  }, [userId]);

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
      if (detail?.vtcGenerated && detail.vtcGenerated > 0) {
        setLiveSessionVtcKg((current) =>
          Math.round((current + detail.vtcGenerated) * 100) / 100,
        );
      }

      const [subgroupResult, muralResult, bundleResult] = await Promise.all([
        refreshSubgroupHistorico(subgroupRef.current),
        fetchCommunityMuralPosts(),
        loadDashboardTrainingBundle(subgroupParam),
      ]);

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
          setLiveSessionVtcKg(thermal.session_vtc_today);
        }
      }
    },
    [subgroupParam],
  );

  const refreshCommunityMural = useCallback(async () => {
    const muralResult = await fetchCommunityMuralPosts();
    if (muralResult.data) {
      setMuralPosts(muralResult.data);
    }
  }, []);

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

  const publishMuralAscensao = useCallback(
    (_exerciseName: string, _payload: { weight: number; series: number; vtc: number }) => {
      if (profile?.role === "forjador_soberano") {
        return;
      }
      void refreshCommunityMural();
      setActiveTab("forum");
    },
    [profile?.role, refreshCommunityMural],
  );

  const closeVideoModal = useCallback(() => setVideoModal(CLOSED_VIDEO), []);

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
    <AnimaFenixEngine userId={userId} profileRow={profileRow} liveSessionVtcKg={liveSessionVtcKg}>
      {() => (
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
              forumCount={muralPosts.length}
              onTabChange={setActiveTab}
            />

            {activeTab === "treino" ? (
              <DashboardTreinoWorkspace
                key={subgroup.id}
                subgroup={subgroup}
                profile={profile}
                authUserId={userId}
                isIncubating={isIncubating}
                hasBiologicalBalance={(profile.age ?? 0) >= BIOLOGICAL_BALANCE_MIN_AGE}
                onAltarMetricsChange={handleAltarMetricsChange}
                onSuperacaoFlashChange={setShowSuperacaoFlash}
                onOpenVideo={handleWatchVideo}
                onSuperacaoMural={publishMuralAscensao}
                onTrainingPersisted={(exerciseId, detail) =>
                  void handleTrainingPersisted(exerciseId, detail)
                }
              />
            ) : null}

            {activeTab === "evolucao" ? (
              <div className={DASHBOARD_TAB_CONTENT}>
                <EvolucaoSelfiePanel />
              </div>
            ) : null}

            {activeTab === "forum" ? (
              <div className={DASHBOARD_TAB_CONTENT}>
                <ForumBrasaVivaPanel
                  userId={userId}
                  profileRow={profileRow}
                  liveSessionVtcKg={liveSessionVtcKg}
                  initialTopics={mapMuralPostsToForumTopics(muralPosts)}
                />
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
      )}
    </AnimaFenixEngine>
  );
}
