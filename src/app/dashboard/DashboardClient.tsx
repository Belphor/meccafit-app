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
import { DueloConviteHost } from "@/components/comunidade/duelo-convite-host";
import { LinhagemTransmutationHost } from "@/components/evolution/LinhagemTransmutationHost";
import { EvolutionLinhagemLevelUp } from "@/components/evolution/EvolutionLinhagemLevelUp";
import type { AthletePlanConfig } from "@/components/evolution/plan-config-form";
import { PhoenixPhaseEngine } from "@/components/dashboard/PhoenixPhaseEngine";
import { PhoenixHelper } from "@/components/dashboard/PhoenixHelper";
import { FenixEcossistemaTourHost } from "@/components/dashboard/FenixEcossistemaTourHost";
import VideoModal from "@/components/VideoModal";
import {
  FENIX_QA_ANIMATION_EVENT,
  type FenixQaAnimationDetail,
} from "@/lib/qa-animation-events";
import {
  DEFAULT_FORJADOR_TREINO_CONFIG,
  fetchForjadorPrescriptionsClient,
  fetchForjadorTreinoConfigClient,
  type ForjadorPrescriptionRow,
  type ForjadorTreinoConfig,
} from "@/lib/forjador-prescriptions";
import {
  composeDayTreinoSubgroup,
} from "@/lib/treino-subgroup";
import {
  DEFAULT_DASHBOARD_TAB,
  isDietaTabAllowed,
  resolveDashboardTabFromParam,
  type DashboardTabId,
} from "@/lib/dashboard-tabs";
import {
  DASHBOARD_TAB_CHANGE_EVENT,
  publishDashboardBondState,
  publishMuralRefresh,
  readDashboardTabFromLocation,
  syncDashboardTabToUrl,
  type DashboardTabChangeDetail,
} from "@/lib/dashboard-tab-navigation";
import {
  fetchCommunityMuralPosts,
  loadDashboardTrainingBundle,
  refreshDaySubgroupHistorico,
} from "@/lib/dashboard-data";
import { resolveSubgroupFromParam } from "@/lib/subgroup-routing";
import {
  buildLinhagemInactivityAckMessage,
  buildLinhagemInactivityAlertMessage,
  buildLinhagemInactivityReturnMessage,
  isLinhagemInactivityTreinoDegraded,
  LINHAGEM_INACTIVITY_RETURN_TOAST_MS,
  type LinhagemInactivitySyncResult,
  type ThermalGravitySettlementResult,
} from "@/lib/linhagem-inactivity";
import {
  buildThermalGravityMonthAtRiskMessage,
  buildThermalGravitySettlementMessage,
  evaluateThermalGravity,
  parseThermalGravityState,
  resolveMonthlyLevelUpProgressPercent,
} from "@/lib/thermal-gravity";
import {
  LINHAGEM_INACTIVITY_QA_EVENT,
  type LinhagemInactivityQaDetail,
} from "@/lib/linhagem-inactivity-qa";
import {
  readThermalGravityQaOverride,
  THERMAL_GRAVITY_QA_UPDATED_EVENT,
} from "@/lib/thermal-gravity-qa";
import { isFenixQaLabEnabled } from "@/components/qa/FenixAnimationTestPanel";
import { rekindleLinhagemAfterInactivity } from "@/lib/linhagem-inactivity-server";
import { syncLinhagemTierAfterDemotion } from "@/lib/linhagem-tier-tracker";
import { syncPhaseTierAfterActivity } from "@/lib/phase-tier-sync";
import {
  EVOLUTION_CALOR_REFRESH_EVENT,
  type EvolutionCalorRefreshDetail,
} from "@/lib/evolution-events";
import { supabase } from "@/lib/supabase";
import { PortalToast, type PortalToastVariant } from "@/components/portal/PortalToast";
import {
  BIOLOGICAL_BALANCE_MIN_AGE,
  DASHBOARD_HERO_TITLE,
  DASHBOARD_PORTAL_PADDING,
  DASHBOARD_SHELL,
  dashboardTabPanelClass,
  PLASMA_HERO_TITLE,
  type PhaseTier,
} from "@/lib/dashboard-config";
import {
  readAltarDailyCardioPercent,
  STORAGE_VTC_UPDATE_EVENT,
  type StorageVtcUpdateDetail,
} from "@/lib/cardio-altar-daily";
import {
  FORJA_TREINO_UPDATE_EVENT,
  type ForjaTreinoUpdateDetail,
} from "@/lib/forja-treino-events";
import {
  bumpAnimaPortalEntryCount,
  markSecondEntryTreinoRedirectDone,
  readAnimaOnboardingComplete,
  readSecondEntryTreinoRedirectDone,
} from "@/lib/phoenix-lore";
import { computeAltarEnergy, resolveProfileIncubating } from "@/lib/mock-data";
import type { ClientProfile, MuscleSubgroup, MuralPost } from "@/lib/mock-data";
import { PORTAL_COPY } from "@/lib/portal-copy";
import { parseProfileSexo, markEcossistemaTourComplete } from "@/lib/profile-identity";
import {
  ECOSSISTEMA_TOUR_STEPS,
  isTabEnabledDuringTour,
  markEcossistemaTourPending,
  readEcossistemaTourComplete,
  readEcossistemaTourPending,
  readEcossistemaTourStepIndex,
  resolveDisabledTabsDuringTour,
  skipEcossistemaTourForReturningAccount,
  writeEcossistemaTourComplete,
  writeEcossistemaTourStepIndex,
} from "@/lib/fenix-ecossistema-tour";
import { clearThermicSessionCache } from "@/lib/session-cache-cleanup";
import { invalidateComunidadeCache } from "@/lib/comunidade-cache";
import {
  useLocalProfileAvatar,
  useResolvedProfileName,
} from "@/hooks/useLocalProfileMedia";
import type { MuscleCalorRow } from "@/components/evolution/human-body-constants";
import {
  DEFAULT_TRAINING_TRACK,
  resolvePrescriptionsForSubgroup,
  type TrainingTrackState,
} from "@/lib/training-track";
import type { PlanilhaDayRow, WeekdayIndex } from "@/lib/training-week";
import {
  buildForjadorScheduleMap,
  buildScheduleMap,
  fetchPlanilhaScheduleClient,
  hasPlanilhaRows,
  resolveCalendarWeekdayIndex,
} from "@/lib/training-week";

const EvolutionAbaPanel = dynamic(
  () =>
    import("@/components/evolution/evolution-aba-view").then((module) => ({
      default: module.EvolutionAbaView,
    })),
  { loading: () => <DashboardLoading message="Carregando evolução..." /> },
);

const ProfileEvolutionKnowledge = dynamic(
  () =>
    import("@/components/profile/ProfileEvolutionKnowledge").then((module) => ({
      default: module.ProfileEvolutionKnowledge,
    })),
  { loading: () => <DashboardLoading message="Carregando referência..." /> },
);

const PersonalTreinoWorkspace = dynamic(
  () =>
    import("@/components/dashboard/PersonalTreinoWorkspace").then((module) => ({
      default: module.PersonalTreinoWorkspace,
    })),
  { loading: () => <DashboardLoading message="Abrindo via Forjador..." /> },
);

const DietaPanel = dynamic(
  () =>
    import("@/components/dashboard/DietaPanel").then((module) => ({
      default: module.DietaPanel,
    })),
  { loading: () => <DashboardLoading message="Carregando nutrição..." /> },
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

  const [weekSchedule, setWeekSchedule] = useState<PlanilhaDayRow[]>(initialWeekSchedule ?? []);
  const [hasPersonalBond, setHasPersonalBond] = useState(false);

  const scheduleMap = useMemo(() => {
    if (hasPersonalBond || hasPlanilhaRows(weekSchedule)) {
      return buildForjadorScheduleMap(weekSchedule);
    }
    return buildScheduleMap(weekSchedule);
  }, [hasPersonalBond, weekSchedule]);

  const [dataReady, setDataReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [profileRow, setProfileRow] = useState<Record<string, unknown> | null>(null);
  const localProfilePhotoUrl = useLocalProfileAvatar(userId);
  const resolvedProfileName = useResolvedProfileName(userId, profile?.name ?? null);
  const [subgroup, setSubgroup] = useState<MuscleSubgroup>(catalogSubgroup);
  const [activeTrainingDay, setActiveTrainingDay] = useState<WeekdayIndex>(() =>
    resolveCalendarWeekdayIndex(),
  );
  const [isTreinoSwitching, setIsTreinoSwitching] = useState(false);
  const [forjadorConfig, setForjadorConfig] = useState<ForjadorTreinoConfig>(initialForjadorConfig);
  const [forjadorPrescriptions, setForjadorPrescriptions] = useState<ForjadorPrescriptionRow[]>(
    initialForjadorPrescriptions,
  );
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
  const [portalToast, setPortalToast] = useState<{
    message: string;
    variant: PortalToastVariant;
  } | null>(null);
  const [inactivityAlert, setInactivityAlert] = useState<string | null>(null);
  const [linhagemInactivityPending, setLinhagemInactivityPending] =
    useState<LinhagemInactivitySyncResult | null>(null);
  const [tourStepIndex, setTourStepIndex] = useState<number | null>(null);
  const tourBootstrappedRef = useRef(false);
  const secondEntryTreinoBootRef = useRef(false);
  const [linhagemDaysAbsent, setLinhagemDaysAbsent] = useState<number | null>(null);
  const [thermalSettlement, setThermalSettlement] =
    useState<ThermalGravitySettlementResult | null>(null);
  const inactivityPendingRef = useRef<LinhagemInactivitySyncResult | null>(null);
  const inactivityPendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const monthRiskToastShownRef = useRef(false);
  const [portalToastDismissMs, setPortalToastDismissMs] = useState(12_000);

  const showPortalToast = useCallback(
    (message: string, variant: PortalToastVariant = "info", autoDismissMs = 12_000) => {
      if (!message.trim()) return;
      setPortalToastDismissMs(autoDismissMs);
      setPortalToast({ message, variant });
    },
    [],
  );

  const showInactivityAlert = useCallback((inactivity: LinhagemInactivitySyncResult) => {
    const message = buildLinhagemInactivityAlertMessage(inactivity);
    if (message) {
      setInactivityAlert(message);
    }
  }, []);

  const syncLinhagemInactivityPendingState = useCallback(
    (inactivity: LinhagemInactivitySyncResult | null) => {
      if (inactivity && isLinhagemInactivityTreinoDegraded(inactivity)) {
        setLinhagemInactivityPending(inactivity);
        return;
      }
      setLinhagemInactivityPending(null);
    },
    [],
  );

  const handleLinhagemInactivitySync = useCallback(
    (inactivity: LinhagemInactivitySyncResult) => {
      if (inactivityPendingTimerRef.current) {
        clearTimeout(inactivityPendingTimerRef.current);
        inactivityPendingTimerRef.current = null;
      }

      if (inactivity.phase_tier) {
        setProfileRow((row) => (row ? { ...row, phase_tier: inactivity.phase_tier } : row));
      }

      if (inactivity.degraded || inactivity.pending_rekindle) {
        syncLinhagemTierAfterDemotion(userId, inactivity.phase_tier);
      }

      if (inactivity.degraded && inactivity.pending_rekindle) {
        inactivityPendingRef.current = inactivity;
        syncLinhagemInactivityPendingState(inactivity);
        setInactivityAlert(null);

        const returnMessage = buildLinhagemInactivityReturnMessage(inactivity);
        if (returnMessage) {
          showPortalToast(returnMessage, "info", LINHAGEM_INACTIVITY_RETURN_TOAST_MS);
        }

        inactivityPendingTimerRef.current = setTimeout(() => {
          setPortalToast(null);
          showInactivityAlert({
            ...inactivity,
            degraded: false,
          });
          inactivityPendingTimerRef.current = null;
        }, LINHAGEM_INACTIVITY_RETURN_TOAST_MS);
        return;
      }

      if (inactivity.pending_rekindle) {
        inactivityPendingRef.current = inactivity;
        syncLinhagemInactivityPendingState(inactivity);
        showInactivityAlert(inactivity);
        return;
      }

      inactivityPendingRef.current = null;
      syncLinhagemInactivityPendingState(null);
      setInactivityAlert(null);
    },
    [showInactivityAlert, showPortalToast, syncLinhagemInactivityPendingState, userId],
  );

  const resolveDashboardAlerts = useCallback(
    (
      settlement: ThermalGravitySettlementResult | null,
      inactivity: LinhagemInactivitySyncResult | null,
      profileRowData: Record<string, unknown> | null,
    ) => {
      if (settlement) {
        const settlementMessage = buildThermalGravitySettlementMessage(settlement);
        if (settlementMessage) {
          if (settlement.degraded) {
            syncLinhagemTierAfterDemotion(userId, settlement.phase_tier);
          }
          showPortalToast(settlementMessage, "info");
          return;
        }
      }

      if (inactivity?.pending_rekindle || inactivity?.degraded) {
        handleLinhagemInactivitySync(inactivity);
        return;
      }

      if (monthRiskToastShownRef.current) return;

      const phaseTier = Number(profileRowData?.phase_tier ?? 1);
      const thermalRaw = profileRowData?.thermal_gravity;
      const metrics = parseThermalGravityState(thermalRaw);
      if (!metrics || phaseTier < 2) return;

      const thermalState = evaluateThermalGravity(phaseTier, {
        vtc_month: metrics.vtc_month,
        vtc_30d: metrics.vtc_30d,
        session_vtc_today: metrics.session_vtc_today,
      });
      const progressPct = resolveMonthlyLevelUpProgressPercent(thermalState) ?? 0;
      const riskMessage = buildThermalGravityMonthAtRiskMessage(thermalState, progressPct);
      if (riskMessage) {
        monthRiskToastShownRef.current = true;
        showPortalToast(riskMessage, "info");
      }
    },
    [handleLinhagemInactivitySync, showPortalToast, userId],
  );

  const resolveQaThermalAlert = useCallback(() => {
    if (!isFenixQaLabEnabled()) return;
    const override = readThermalGravityQaOverride();
    if (!override) return;

    if (override.simulate_month_boundary_degraded) {
      const degradedTier = Math.max(1, override.phase_tier - 1) as PhaseTier;
      const settlement: ThermalGravitySettlementResult = {
        degraded: true,
        phase_tier: degradedTier,
        previous_tier: override.phase_tier,
        settled_month: null,
        settled_month_label: override.settled_month_label ?? "o mês anterior",
        first_settlement: false,
      };
      setProfileRow((row) => (row ? { ...row, phase_tier: degradedTier } : row));
      syncLinhagemTierAfterDemotion(userId, degradedTier);
      const message = buildThermalGravitySettlementMessage(settlement);
      if (message) showPortalToast(message, "info");
      return;
    }

    if (override.simulate_month_at_risk) {
      const thermalState = evaluateThermalGravity(override.phase_tier, {
        vtc_month: override.vtc_month,
        vtc_30d: override.vtc_30d ?? override.vtc_month,
        session_vtc_today: override.session_vtc_today,
      });
      const nextState =
        override.days_remaining !== undefined
          ? { ...thermalState, days_remaining: override.days_remaining }
          : thermalState;
      const progressPct = resolveMonthlyLevelUpProgressPercent(nextState) ?? 0;
      const message = buildThermalGravityMonthAtRiskMessage(nextState, progressPct);
      if (message) showPortalToast(message, "info");
    }
  }, [showPortalToast, userId]);
  const [trainingTrack, setTrainingTrack] = useState<TrainingTrackState>(DEFAULT_TRAINING_TRACK);
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
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<FenixQaAnimationDetail>).detail;
      if (detail?.kind !== "superacao") return;
      setShowSuperacaoFlash(true);
      window.setTimeout(() => setShowSuperacaoFlash(false), 8000);
    };

    window.addEventListener(FENIX_QA_ANIMATION_EVENT, handler);
    return () => window.removeEventListener(FENIX_QA_ANIMATION_EVENT, handler);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<LinhagemInactivityQaDetail>).detail;
      if (!detail?.result) return;
      handleLinhagemInactivitySync(detail.result);
    };

    window.addEventListener(LINHAGEM_INACTIVITY_QA_EVENT, handler);
    return () => window.removeEventListener(LINHAGEM_INACTIVITY_QA_EVENT, handler);
  }, [handleLinhagemInactivitySync]);

  useEffect(() => {
    return () => {
      if (inactivityPendingTimerRef.current) {
        clearTimeout(inactivityPendingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handler = () => resolveQaThermalAlert();
    window.addEventListener(THERMAL_GRAVITY_QA_UPDATED_EVENT, handler);
    return () => window.removeEventListener(THERMAL_GRAVITY_QA_UPDATED_EVENT, handler);
  }, [resolveQaThermalAlert]);

  const refreshTreinoData = useCallback(async () => {
    const [rows, schedule, config] = await Promise.all([
      fetchForjadorPrescriptionsClient(userId),
      fetchPlanilhaScheduleClient(userId),
      fetchForjadorTreinoConfigClient(userId),
    ]);

    setForjadorPrescriptions(rows);
    setWeekSchedule(schedule);
    setForjadorConfig(config);

    const day = activeTrainingDayRef.current;
    const scheduleMapNext =
      hasPersonalBond || hasPlanilhaRows(schedule)
        ? buildForjadorScheduleMap(schedule)
        : buildScheduleMap(schedule);
    const composed = composeDayTreinoSubgroup(
      scheduleMapNext[day],
      trainingTrack,
      rows,
      day,
    );
    setSubgroup(composed);

    const historicoResult = await refreshDaySubgroupHistorico(composed, { skipInvalidate: true });
    if (historicoResult.data) {
      setSubgroup(historicoResult.data);
    }
  }, [hasPersonalBond, trainingTrack, userId]);

  const refreshTreinoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleTreinoRefresh = useCallback(() => {
    if (refreshTreinoTimerRef.current) {
      clearTimeout(refreshTreinoTimerRef.current);
    }
    refreshTreinoTimerRef.current = setTimeout(() => {
      void refreshTreinoData();
    }, 280);
  }, [refreshTreinoData]);

  useEffect(() => {
    return () => {
      if (refreshTreinoTimerRef.current) {
        clearTimeout(refreshTreinoTimerRef.current);
      }
    };
  }, []);

  const treinoBootstrappedRef = useRef(false);

  useEffect(() => {
    if (!dataReady || !userId) return;
    if (treinoBootstrappedRef.current) return;
    treinoBootstrappedRef.current = true;

    if (hasPersonalBond || hasPlanilhaRows(weekSchedule) || forjadorPrescriptions.length > 0) {
      scheduleTreinoRefresh();
    }
  }, [
    dataReady,
    forjadorPrescriptions.length,
    hasPersonalBond,
    scheduleTreinoRefresh,
    userId,
    weekSchedule,
  ]);

  useEffect(() => {
    if (!dataReady || activeTab !== "treino") return;
    scheduleTreinoRefresh();
  }, [activeTab, dataReady, scheduleTreinoRefresh]);

  useEffect(() => {
    if (!dataReady || !userId) return;

    const refreshTreinoFromForja = (event: Event) => {
      const detail = (event as CustomEvent<ForjaTreinoUpdateDetail>).detail;
      if (detail?.clientId && detail.clientId !== userId) return;
      scheduleTreinoRefresh();
    };

    window.addEventListener(FORJA_TREINO_UPDATE_EVENT, refreshTreinoFromForja);
    return () => window.removeEventListener(FORJA_TREINO_UPDATE_EVENT, refreshTreinoFromForja);
  }, [dataReady, scheduleTreinoRefresh, userId]);

  useEffect(() => {
    if (!dataReady || !userId) return;

    const channel = supabase
      .channel(`treino-sync-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "prescricoes_treino_forjador",
          filter: `atleta_id=eq.${userId}`,
        },
        () => {
          scheduleTreinoRefresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "planilhas_forjador",
          filter: `atleta_id=eq.${userId}`,
        },
        () => {
          scheduleTreinoRefresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "config_treino_atleta",
          filter: `atleta_id=eq.${userId}`,
        },
        () => {
          scheduleTreinoRefresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [dataReady, scheduleTreinoRefresh, userId]);

  useEffect(() => {
    if (!dataReady) return;

    let cancelled = false;
    const composed = composeDayTreinoSubgroup(
      scheduleMap[activeTrainingDay],
      trainingTrack,
      forjadorPrescriptions,
      activeTrainingDay,
    );

    void refreshDaySubgroupHistorico(composed, { skipInvalidate: true }).then((result) => {
      if (cancelled) return;
      setSubgroup(result.data ?? composed);
    });

    return () => {
      cancelled = true;
    };
  }, [activeTrainingDay, dataReady, forjadorPrescriptions, scheduleMap, trainingTrack]);

  const initialDashboardLoadRef = useRef(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      monthRiskToastShownRef.current = false;
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
      const composeDay = initialDashboardLoadRef.current ? bootDay : activeTrainingDayRef.current;
      const bootSubgroup = composeDayTreinoSubgroup(
        scheduleMap[composeDay],
        bundle.data.trainingTrack,
        forjadorPrescriptions,
        composeDay,
      );
      if (initialDashboardLoadRef.current) {
        setActiveTrainingDay(bootDay);
        initialDashboardLoadRef.current = false;
      }
      setSubgroup(bootSubgroup);

      const historicoResult = await refreshDaySubgroupHistorico(bootSubgroup, { skipInvalidate: true });
      if (!isMounted) return;
      if (historicoResult.data) {
        setSubgroup(historicoResult.data);
      }

      setMuralPosts(bundle.data.muralPosts);
      setTrainingTrack(bundle.data.trainingTrack);
      setHasPersonalBond(bundle.data.hasPersonalBond);
      setThermalSettlement(bundle.data.thermalSettlement ?? null);

      const inactivity = bundle.data.linhagemInactivity;
      setLinhagemDaysAbsent(inactivity?.days_absent ?? null);
      inactivityPendingRef.current =
        inactivity?.pending_rekindle ? inactivity : null;
      syncLinhagemInactivityPendingState(inactivity ?? null);

      resolveDashboardAlerts(
        bundle.data.thermalSettlement ?? null,
        inactivity ?? null,
        bundle.data.profileRow,
      );

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
  }, [
    forjadorPrescriptions,
    loadKey,
    resolveDashboardAlerts,
    scheduleMap,
    subgroupParam,
    syncLinhagemInactivityPendingState,
  ]);

  const perfilIdentidadeConfirmada = Boolean(profileRow?.perfil_identidade_confirmada);
  const animaPortalVisto = Boolean(profileRow?.anima_portal_visto);
  const ecossistemaTourConcluido =
    Boolean(profileRow?.ecossistema_tour_concluido) || readEcossistemaTourComplete(userId);
  const tourPendingFirstRun = readEcossistemaTourPending(userId);
  const profileSexo = parseProfileSexo(profileRow?.sexo);
  const tabsLockedForIdentity =
    profile?.role === "cliente" && !perfilIdentidadeConfirmada && !profile?.is_punished;
  const tabsLocked = Boolean(profile?.is_punished) || tabsLockedForIdentity;
  const tourActive =
    profile?.role === "cliente" &&
    perfilIdentidadeConfirmada &&
    !ecossistemaTourConcluido &&
    tourPendingFirstRun &&
    tourStepIndex !== null &&
    !profile?.is_punished;

  const disabledTourTabIds = useMemo(() => {
    if (!tourActive || tourStepIndex === null) return undefined;
    return resolveDisabledTabsDuringTour(tourStepIndex, hasPersonalBond);
  }, [hasPersonalBond, tourActive, tourStepIndex]);

  const applyDashboardTab = useCallback(
    (tab: DashboardTabId) => {
      if (profile?.is_punished && tab !== activeTab) {
        return;
      }

      if (tabsLockedForIdentity && tab !== "perfil") {
        return;
      }

      if (
        profile?.role === "cliente" &&
        perfilIdentidadeConfirmada &&
        !ecossistemaTourConcluido &&
        tourPendingFirstRun &&
        tourStepIndex !== null &&
        !profile?.is_punished &&
        !isTabEnabledDuringTour(tab, tourStepIndex)
      ) {
        return;
      }

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
    [
      activeTab,
      ecossistemaTourConcluido,
      hasPersonalBond,
      perfilIdentidadeConfirmada,
      profile?.is_punished,
      profile?.role,
      tabsLockedForIdentity,
      tourPendingFirstRun,
      tourStepIndex,
    ],
  );

  const handleOnboardingComplete = useCallback(() => {
    setProfileRow((row) => (row ? { ...row, anima_portal_visto: true } : row));
    applyDashboardTab("perfil");
    syncDashboardTabToUrl("perfil", { subgrupo: subgroupParam, dispatch: false });
    setVisitedTabs((current) => {
      const next = new Set(current);
      next.add("perfil");
      return next;
    });
  }, [applyDashboardTab, subgroupParam]);

  const finalizeEcossistemaTourSkip = useCallback(() => {
    skipEcossistemaTourForReturningAccount(userId);
    setTourStepIndex(null);
    setProfileRow((row) => (row ? { ...row, ecossistema_tour_concluido: true } : row));
    void markEcossistemaTourComplete().catch(() => {
      // localStorage já marca conclusão
    });
  }, [userId]);

  const handleIdentityConfirmed = useCallback(() => {
    setProfileRow((row) =>
      row
        ? {
            ...row,
            perfil_identidade_confirmada: true,
            anima_portal_visto: true,
          }
        : row,
    );
    tourBootstrappedRef.current = true;
    markEcossistemaTourPending(userId);
    setTourStepIndex(0);
    writeEcossistemaTourStepIndex(userId, 0);
    applyDashboardTab("perfil");
    syncDashboardTabToUrl("perfil", { subgrupo: subgroupParam, dispatch: false });
    setVisitedTabs((current) => {
      const next = new Set(current);
      next.add("perfil");
      return next;
    });
  }, [applyDashboardTab, subgroupParam, userId]);

  const handleTourContinue = useCallback(() => {
    const currentStep = tourStepIndex ?? 0;
    const nextStep = currentStep + 1;

    if (nextStep >= ECOSSISTEMA_TOUR_STEPS.length) {
      setTourStepIndex(null);
      writeEcossistemaTourComplete(userId);
      setProfileRow((row) => (row ? { ...row, ecossistema_tour_concluido: true } : row));
      void markEcossistemaTourComplete().catch(() => {
        // localStorage já marca conclusão; servidor sincroniza na próxima sessão
      });
      showPortalToast("Ecossistema FENYXIA revelado. Suas chamas estão livres.", "success", 7000);
      return;
    }

    const nextTab = ECOSSISTEMA_TOUR_STEPS[nextStep].tab;
    setTourStepIndex(nextStep);
    writeEcossistemaTourStepIndex(userId, nextStep);
    applyDashboardTab(nextTab);
    syncDashboardTabToUrl(nextTab, { subgrupo: subgroupParam, dispatch: false });
    setVisitedTabs((current) => {
      const next = new Set(current);
      next.add(nextTab);
      return next;
    });
  }, [applyDashboardTab, showPortalToast, subgroupParam, tourStepIndex, userId]);

  useEffect(() => {
    if (!dataReady || tabBootstrappedRef.current) return;

    tabBootstrappedRef.current = true;
    let resolved = resolveDashboardTabFromParam(tabParam, hasPersonalBond);

    if (
      profile?.role === "cliente" &&
      !profile?.is_punished &&
      perfilIdentidadeConfirmada
    ) {
      const entryCount = bumpAnimaPortalEntryCount(userId);
      const portalVisto = animaPortalVisto || readAnimaOnboardingComplete(userId);

      if (
        entryCount === 2 &&
        portalVisto &&
        !readSecondEntryTreinoRedirectDone(userId)
      ) {
        markSecondEntryTreinoRedirectDone(userId);
        secondEntryTreinoBootRef.current = true;
        resolved = "treino";
      }

      if (entryCount >= 2 && !readEcossistemaTourComplete(userId)) {
        finalizeEcossistemaTourSkip();
      }
    }

    applyDashboardTab(resolved);
    syncDashboardTabToUrl(resolved, { subgrupo: subgroupParam, dispatch: false });
    setVisitedTabs((current) => {
      const next = new Set(current);
      next.add(DEFAULT_DASHBOARD_TAB);
      next.add(resolved);
      return next;
    });
  }, [
    animaPortalVisto,
    applyDashboardTab,
    dataReady,
    hasPersonalBond,
    perfilIdentidadeConfirmada,
    profile?.is_punished,
    profile?.role,
    subgroupParam,
    tabParam,
    userId,
    finalizeEcossistemaTourSkip,
  ]);

  useEffect(() => {
    if (!dataReady || !tabsLockedForIdentity) return;
    applyDashboardTab("perfil");
    setVisitedTabs((current) => {
      const next = new Set(current);
      next.add("perfil");
      return next;
    });
  }, [applyDashboardTab, dataReady, tabsLockedForIdentity]);

  useEffect(() => {
    if (
      !dataReady ||
      !perfilIdentidadeConfirmada ||
      ecossistemaTourConcluido ||
      profile?.role !== "cliente" ||
      profile?.is_punished
    ) {
      return;
    }

    if (!readEcossistemaTourPending(userId)) {
      if (!ecossistemaTourConcluido && !readEcossistemaTourComplete(userId)) {
        finalizeEcossistemaTourSkip();
      }
      return;
    }

    if (tourBootstrappedRef.current) return;

    tourBootstrappedRef.current = true;
    const savedStep = readEcossistemaTourStepIndex(userId);
    const step = savedStep ?? 0;
    setTourStepIndex(step);

    if (secondEntryTreinoBootRef.current) {
      return;
    }

    const tab = ECOSSISTEMA_TOUR_STEPS[step]?.tab ?? "perfil";
    applyDashboardTab(tab);
    syncDashboardTabToUrl(tab, { subgrupo: subgroupParam, dispatch: false });
    setVisitedTabs((current) => {
      const next = new Set(current);
      next.add(tab);
      return next;
    });
  }, [
    applyDashboardTab,
    dataReady,
    ecossistemaTourConcluido,
    finalizeEcossistemaTourSkip,
    perfilIdentidadeConfirmada,
    profile?.is_punished,
    profile?.role,
    subgroupParam,
    userId,
  ]);

  useEffect(() => {
    if (!dataReady) return;
    publishDashboardBondState(hasPersonalBond);
  }, [dataReady, hasPersonalBond]);

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
      if (tab === "comunidade") {
        publishMuralRefresh();
      }
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

      void refreshDaySubgroupHistorico(instant, { skipInvalidate: true }).then((result) => {
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

  const handleRekindleInactivity = useCallback(async () => {
    if (!inactivityPendingRef.current?.pending_rekindle) return;

    const pending = inactivityPendingRef.current;

    if (isFenixQaLabEnabled()) {
      inactivityPendingRef.current = null;
      syncLinhagemInactivityPendingState(null);
      setInactivityAlert(null);
      showPortalToast(
        buildLinhagemInactivityAckMessage({
          phase_tier: pending.phase_tier,
          previous_tier: pending.restore_tier ?? pending.previous_tier,
          phases_lost: pending.phases_lost,
        }),
        "success",
      );
      return;
    }

    const result = await rekindleLinhagemAfterInactivity(supabase);
    if (!result?.rekindled) return;

    inactivityPendingRef.current = null;
    syncLinhagemInactivityPendingState(null);
    setInactivityAlert(null);
    showPortalToast(
      buildLinhagemInactivityAckMessage({
        phase_tier: result.phase_tier as PhaseTier,
        previous_tier: pending.restore_tier ?? pending.previous_tier,
        phases_lost: pending.phases_lost,
      }),
      "success",
    );
  }, [showPortalToast, syncLinhagemInactivityPendingState]);

  const linhagemInactivityDegradationMessage = useMemo(() => {
    if (!linhagemInactivityPending) return null;
    return buildLinhagemInactivityAlertMessage(linhagemInactivityPending) || null;
  }, [linhagemInactivityPending]);

  const handleSetComplete = useCallback(
    () => {
      void handleRekindleInactivity();
    },
    [handleRekindleInactivity],
  );

  const handleTrainingPersisted = useCallback(
    async (exerciseId: number, detail?: { vtcGenerated: number }) => {
      void exerciseId;
      const liveIncrement = detail?.vtcGenerated ?? 0;
      if (liveIncrement > 0) {
        setLiveSessionVtcKg((current) =>
          Math.round((current + liveIncrement) * 100) / 100,
        );
      }

      const nextTier = await syncPhaseTierAfterActivity(userId);
      if (nextTier !== null) {
        setProfileRow((row) => (row ? { ...row, phase_tier: nextTier } : row));
      }
    },
    [userId],
  );

  useEffect(() => {
    if (!dataReady) return;

    const onEvolutionRefresh = (event: Event) => {
      const detail = (event as CustomEvent<EvolutionCalorRefreshDetail>).detail;
      if (!detail || detail.userId !== userId) return;

      void syncPhaseTierAfterActivity(userId).then((nextTier) => {
        if (nextTier === null) return;
        setProfileRow((row) => (row ? { ...row, phase_tier: nextTier } : row));
      });
    };

    window.addEventListener(EVOLUTION_CALOR_REFRESH_EVENT, onEvolutionRefresh);
    return () => window.removeEventListener(EVOLUTION_CALOR_REFRESH_EVENT, onEvolutionRefresh);
  }, [dataReady, userId]);

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

    publishMuralRefresh();

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
    initialWeekSchedule: weekSchedule,
    useForjadorSchedule:
      hasPersonalBond ||
      hasPlanilhaRows(weekSchedule) ||
      forjadorPrescriptions.length > 0,
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
    onSetComplete: handleSetComplete,
    linhagemInactivityDegradationMessage,
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
          <PortalToast
            message={inactivityAlert ?? portalToast?.message ?? ""}
            variant={inactivityAlert ? "info" : portalToast?.variant ?? "info"}
            visible={Boolean(inactivityAlert || portalToast)}
            persistent={Boolean(inactivityAlert)}
            onDismiss={() => {
              if (!inactivityAlert) setPortalToast(null);
            }}
            autoDismissMs={portalToastDismissMs}
          />
          <main className={DASHBOARD_SHELL}>
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "var(--meccafit-ambient-gradient)" }}
              aria-hidden="true"
            />
            <SuperacaoOverlay visible={showSuperacaoFlash} />
            <LinhagemTransmutationHost userId={userId} profileName={resolvedProfileName} />
            <EvolutionLinhagemLevelUp
              userId={userId}
              phaseTier={phase.phaseTier}
              dataReady={dataReady}
            />
            <DueloConviteHost userId={userId} />
            {profile.role === "cliente" ? (
              <PhoenixHelper
                userId={userId}
                profileName={resolvedProfileName}
                phaseContext={phase}
                daysAbsent={linhagemDaysAbsent}
                isPunished={Boolean(profile.is_punished)}
                animaPortalVisto={animaPortalVisto}
                onTabChange={handleTabChange}
                onOnboardingComplete={handleOnboardingComplete}
              />
            ) : null}

            {tourActive && tourStepIndex !== null ? (
              <FenixEcossistemaTourHost
                step={ECOSSISTEMA_TOUR_STEPS[tourStepIndex]}
                activeTab={activeTab}
                profileName={resolvedProfileName}
                phaseTier={phase.phaseTier}
                onContinue={handleTourContinue}
              />
            ) : null}

            {profile.is_punished ? (
              <div
                className="pointer-events-none fixed inset-0 z-[45] bg-[radial-gradient(circle_at_50%_40%,rgba(40,40,40,0.22),rgba(0,0,0,0.72)_55%)]"
                aria-hidden="true"
              />
            ) : null}

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
                  {profile.is_punished ? (
                    <div className="mt-6 rounded-2xl border border-neutral-800/80 bg-neutral-950/70 px-5 py-6 text-center backdrop-blur-md">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-neutral-500">
                        Penalidade Suprema · Exílio das Chamas
                      </p>
                      <p className="mt-4 text-sm leading-relaxed text-neutral-400">
                        Suas abas do altar estão seladas. Fale com um Forjador Escolhido para
                        restabelecer sua linhagem.
                      </p>
                    </div>
                  ) : (
                    <>
                  <DashboardTabNav
                    activeTab={activeTab}
                    muralCount={muralPosts.length}
                    hasPersonalBond={hasPersonalBond}
                    tabsLocked={tabsLocked}
                    disabledTabIds={disabledTourTabIds}
                    onTabChange={handleTabChange}
                  />

                  {tabsLockedForIdentity ? (
                    <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-950/15 px-4 py-3 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/90">
                        Selo da Linhagem pendente
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-amber-50/85">
                        Confirme seu <strong className="font-semibold text-amber-50">nome único</strong> e{" "}
                        <strong className="font-semibold text-amber-50">gênero</strong> na aba Perfil para
                        selar sua identidade.
                      </p>
                    </div>
                  ) : tourActive && tourStepIndex !== null ? (
                    <div className="mt-4 rounded-2xl border border-orange-500/20 bg-orange-950/10 px-4 py-3 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/90">
                        Revelação do ecossistema · passo {(tourStepIndex ?? 0) + 1} de{" "}
                        {ECOSSISTEMA_TOUR_STEPS.length}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-amber-50/85">
                        A Anima Fênix apresenta cada altar. Ouça, leia e avance quando estiver pronto.
                      </p>
                    </div>
                  ) : null}

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
                      <DietaPanel userId={userId} />
                    </div>
                  ) : null}

                  {visitedTabs.has("evolucao") ? (
                    <div className={dashboardTabPanelClass(activeTab === "evolucao")}>
                      <EvolutionAbaPanel
                        userId={userId}
                        initialCalorRows={initialEvolutionCalor}
                        initialIgnicao={initialEvolutionIgnicao}
                        initialAthletePlan={initialAthletePlan}
                        profileName={resolvedProfileName}
                        variant="dashboard"
                        hasPersonalBond={hasPersonalBond}
                        profilePhotoUrl={localProfilePhotoUrl}
                        conqueredPhaseTier={phase.phaseTier}
                        thermalSettlement={thermalSettlement}
                        phaseSetupAt={
                          typeof profileRow?.phase_setup_at === "string"
                            ? profileRow.phase_setup_at
                            : null
                        }
                      />
                    </div>
                  ) : null}

                  {visitedTabs.has("comunidade") ? (
                    <div className={dashboardTabPanelClass(activeTab === "comunidade")}>
                      <ComunidadePageClient
                        userId={userId}
                        profileName={resolvedProfileName}
                        profilePhotoUrl={localProfilePhotoUrl}
                        profileSexo={profileSexo}
                        phase={phase}
                        muralFocusToken={muralFocusToken}
                        muralFocusExerciseName={muralFocusExerciseName}
                      />
                    </div>
                  ) : null}

                  {visitedTabs.has("perfil") ? (
                    <div className={dashboardTabPanelClass(activeTab === "perfil")}>
                      <ProfileEvolutionKnowledge
                        userId={userId}
                        profileName={resolvedProfileName}
                        profilePhotoUrl={localProfilePhotoUrl}
                        profileSexo={profileSexo}
                        identidadeConfirmada={perfilIdentidadeConfirmada}
                        onIdentityConfirmed={handleIdentityConfirmed}
                        initialCalorRows={initialEvolutionCalor}
                        initialIgnicao={initialEvolutionIgnicao}
                      />
                    </div>
                  ) : null}
                    </>
                  )}
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
