"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BraseiroPanel } from "@/components/dashboard/BraseiroPanel";
import { TreinoTab } from "@/components/dashboard/TreinoTab";
import { readAltarVtcSession, writeAltarVtcSession } from "@/lib/altar-vtc-session";
import {
  mergeSessionCompletedSets,
  reconcileSessionCompletedSets,
  reconcileSessionMaxLoads,
} from "@/lib/dashboard-data";
import type { ClientProfile, MuscleSubgroup } from "@/lib/mock-data";
import { resolveCatalogMetricKind } from "@/lib/exercise-catalog";
import { resolveAltarContribution } from "@/lib/training-metric";
import {
  BIOLOGICAL_BALANCE_MULTIPLIER,
  DASHBOARD_TAB_CONTENT,
  SUPERACAO_FLAME_MS,
  SUPERACAO_MURAL_MS,
  SUPERACAO_OVERLAY_MS,
} from "@/lib/dashboard-config";
import type { PlanilhaDayRow, WeekdayIndex } from "@/lib/training-week";
import { resolveCalendarWeekdayIndex } from "@/lib/training-week";

export type SuperacaoPayload = {
  weight: number;
  series: number;
  vtc: number;
};

export type DashboardTreinoWorkspaceProps = {
  subgroup: MuscleSubgroup;
  profile: ClientProfile;
  authUserId: string;
  initialWeekSchedule?: PlanilhaDayRow[];
  isIncubating: boolean;
  hasBiologicalBalance: boolean;
  onAltarMetricsChange: (baseVtcTotal: number, lastSavedWeight: number) => void;
  onSuperacaoFlashChange: (visible: boolean) => void;
  onOpenVideo: (exerciseId: number) => void;
  onSuperacaoMural: (exerciseName: string, payload: SuperacaoPayload) => void;
  onTrainingPersisted: (exerciseId: number, detail?: { vtcGenerated: number }) => void;
  onSubgroupNavigate: (subgroupSlug: string) => void;
};

function resolveDefaultActiveExerciseId(subgroup: MuscleSubgroup) {
  const pending = subgroup.exercises.find((item) => item.completedSets < item.targetSets);
  return pending?.id ?? subgroup.exercises[0]?.id ?? 1;
}

function resolveTreinoSessionHydration(
  sessionScope: { userId: string; subgroupId: string },
  subgroup: MuscleSubgroup,
) {
  const snapshot = readAltarVtcSession(sessionScope);
  if (!snapshot) {
    return {
      baseVtcTotal: 0,
      completedSetsByExerciseId: {} as Record<number, number>,
      lastSavedWeight: 0,
      maxLoadsByExerciseId: {} as Record<number, number>,
      shouldPersistStale: false,
    };
  }

  const reconciledCompleted = reconcileSessionCompletedSets(
    subgroup,
    snapshot.completedSetsByExerciseId,
  );
  const reconciledMaxLoads = reconcileSessionMaxLoads(
    subgroup,
    reconciledCompleted,
    snapshot.maxLoadsByExerciseId,
  );
  const reconciledVtc = Object.values(reconciledMaxLoads).reduce((sum, value) => sum + value, 0);
  const hasStaleSession =
    Object.keys(reconciledCompleted).length !==
      Object.keys(snapshot.completedSetsByExerciseId).length ||
    Object.keys(reconciledMaxLoads).length !== Object.keys(snapshot.maxLoadsByExerciseId).length;

  return {
    baseVtcTotal: reconciledVtc,
    completedSetsByExerciseId: reconciledCompleted,
    lastSavedWeight: snapshot.lastSavedWeight,
    maxLoadsByExerciseId: reconciledMaxLoads,
    shouldPersistStale: hasStaleSession,
  };
}

export function DashboardTreinoWorkspace({
  subgroup,
  profile,
  authUserId,
  initialWeekSchedule,
  isIncubating,
  hasBiologicalBalance,
  onAltarMetricsChange,
  onSuperacaoFlashChange,
  onOpenVideo,
  onSuperacaoMural,
  onTrainingPersisted,
  onSubgroupNavigate,
}: DashboardTreinoWorkspaceProps) {
  const [activeWeekDay, setActiveWeekDay] = useState<WeekdayIndex>(() =>
    resolveCalendarWeekdayIndex(),
  );
  const sessionScope = useMemo(
    () => ({ userId: authUserId, subgroupId: subgroup.id }),
    [authUserId, subgroup.id],
  );
  const sessionHydrationKey = `${sessionScope.userId}:${sessionScope.subgroupId}`;
  const sessionHydration = useMemo(
    () => resolveTreinoSessionHydration(sessionScope, subgroup),
    [sessionScope, subgroup],
  );

  const [activeExerciseId, setActiveExerciseId] = useState(() =>
    resolveDefaultActiveExerciseId(subgroup),
  );
  const [superacaoExerciseId, setSuperacaoExerciseId] = useState<number | null>(null);
  const [baseVtcTotal, setBaseVtcTotal] = useState(sessionHydration.baseVtcTotal);
  const [completedSetsByExerciseId, setCompletedSetsByExerciseId] = useState<
    Record<number, number>
  >(sessionHydration.completedSetsByExerciseId);
  const maxLoadsRef = useRef<Record<number, number>>(sessionHydration.maxLoadsByExerciseId);
  const completedSetsRef = useRef<Record<number, number>>(
    sessionHydration.completedSetsByExerciseId,
  );
  const lastSavedWeightRef = useRef(sessionHydration.lastSavedWeight);
  const sessionHydratedRef = useRef(true);
  const flameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const muralTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistAltarSession = useCallback(
    (nextBaseVtcTotal: number, nextLastSavedWeight: number) => {
      writeAltarVtcSession(sessionScope, {
        baseVtcTotal: nextBaseVtcTotal,
        lastSavedWeight: nextLastSavedWeight,
        maxLoadsByExerciseId: maxLoadsRef.current,
        completedSetsByExerciseId: completedSetsRef.current,
      });
    },
    [sessionScope],
  );

  const mergedSubgroup = useMemo(
    () => mergeSessionCompletedSets(subgroup, completedSetsByExerciseId),
    [subgroup, completedSetsByExerciseId],
  );

  useEffect(() => {
    queueMicrotask(() => {
      maxLoadsRef.current = sessionHydration.maxLoadsByExerciseId;
      completedSetsRef.current = sessionHydration.completedSetsByExerciseId;
      lastSavedWeightRef.current = sessionHydration.lastSavedWeight;
      setBaseVtcTotal(sessionHydration.baseVtcTotal);
      setCompletedSetsByExerciseId(sessionHydration.completedSetsByExerciseId);
      setActiveExerciseId(resolveDefaultActiveExerciseId(subgroup));
      sessionHydratedRef.current = true;
      onAltarMetricsChange(sessionHydration.baseVtcTotal, sessionHydration.lastSavedWeight);

      if (sessionHydration.shouldPersistStale) {
        writeAltarVtcSession(sessionScope, {
          baseVtcTotal: sessionHydration.baseVtcTotal,
          lastSavedWeight: sessionHydration.lastSavedWeight,
          maxLoadsByExerciseId: sessionHydration.maxLoadsByExerciseId,
          completedSetsByExerciseId: sessionHydration.completedSetsByExerciseId,
        });
      }
    });
  }, [
    sessionHydrationKey,
    sessionHydration,
    sessionScope,
    subgroup,
    onAltarMetricsChange,
  ]);

  useEffect(() => {
    return () => {
      if (flameTimerRef.current) clearTimeout(flameTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (muralTimerRef.current) clearTimeout(muralTimerRef.current);
    };
  }, []);

  const finalVtcTotal = hasBiologicalBalance
    ? baseVtcTotal * BIOLOGICAL_BALANCE_MULTIPLIER
    : baseVtcTotal;

  const formattedVtcTotal = useMemo(
    () => finalVtcTotal.toLocaleString("pt-BR", { maximumFractionDigits: 1 }),
    [finalVtcTotal],
  );

  const handleWeightSaved = useCallback(
    (_exerciseId: number, weight: number) => {
      lastSavedWeightRef.current = weight;
      onAltarMetricsChange(baseVtcTotal, weight);
      if (sessionHydratedRef.current) {
        persistAltarSession(baseVtcTotal, weight);
      }
    },
    [baseVtcTotal, onAltarMetricsChange, persistAltarSession],
  );

  const handleExerciseMaxLoad = useCallback(
    (exerciseId: number, maxLoadKg: number) => {
      const metricKind = resolveCatalogMetricKind(exerciseId);
      const contribution = resolveAltarContribution(metricKind, maxLoadKg);
      maxLoadsRef.current[exerciseId] = contribution;
      const total = Object.values(maxLoadsRef.current).reduce((sum, value) => sum + value, 0);
      setBaseVtcTotal(total);
      onAltarMetricsChange(total, lastSavedWeightRef.current);
      if (sessionHydratedRef.current) {
        persistAltarSession(total, lastSavedWeightRef.current);
      }
    },
    [onAltarMetricsChange, persistAltarSession],
  );

  const triggerSuperacaoFeedback = useCallback(
    (exerciseId: number) => {
      if (flameTimerRef.current) clearTimeout(flameTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);

      setSuperacaoExerciseId(exerciseId);
      onSuperacaoFlashChange(true);

      flashTimerRef.current = setTimeout(() => {
        onSuperacaoFlashChange(false);
        flashTimerRef.current = null;
      }, SUPERACAO_OVERLAY_MS);

      flameTimerRef.current = setTimeout(() => {
        setSuperacaoExerciseId(null);
        flameTimerRef.current = null;
      }, SUPERACAO_FLAME_MS);
    },
    [onSuperacaoFlashChange],
  );

  const handleSuperacao = useCallback(
    (exerciseId: number, payload: SuperacaoPayload) => {
      const exercise = mergedSubgroup.exercises.find((item) => item.id === exerciseId);
      if (!exercise) return;

      triggerSuperacaoFeedback(exerciseId);

      if (muralTimerRef.current) clearTimeout(muralTimerRef.current);
      muralTimerRef.current = setTimeout(() => {
        onSuperacaoMural(exercise.name, payload);
        muralTimerRef.current = null;
      }, SUPERACAO_MURAL_MS);
    },
    [onSuperacaoMural, mergedSubgroup.exercises, triggerSuperacaoFeedback],
  );

  const isChamaReativa = baseVtcTotal > 0 || superacaoExerciseId !== null;

  const handleExercisePersisted = useCallback(
    (exerciseId: number, detail?: { vtcGenerated: number }) => {
      const exercise = mergedSubgroup.exercises.find((item) => item.id === exerciseId);
      if (!exercise) {
        onTrainingPersisted(exerciseId, detail);
        return;
      }

      completedSetsRef.current = {
        ...completedSetsRef.current,
        [exerciseId]: exercise.targetSets,
      };
      setCompletedSetsByExerciseId({ ...completedSetsRef.current });

      if (sessionHydratedRef.current) {
        persistAltarSession(baseVtcTotal, lastSavedWeightRef.current);
      }

      onTrainingPersisted(exerciseId, detail);
    },
    [baseVtcTotal, mergedSubgroup.exercises, onTrainingPersisted, persistAltarSession],
  );

  const handleDayTrainingChange = useCallback(
    ({ subgroupId, activeDay }: { subgroupId: string; activeDay: WeekdayIndex }) => {
      setActiveWeekDay(activeDay);
      if (subgroupId !== subgroup.id) {
        onSubgroupNavigate(subgroupId);
      }
    },
    [onSubgroupNavigate, subgroup.id],
  );

  return (
    <div className={DASHBOARD_TAB_CONTENT}>
      <div className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="order-1 min-w-0 lg:order-1">
          <TreinoTab
            profile={profile}
            subgroup={mergedSubgroup}
            initialWeekSchedule={initialWeekSchedule}
            activeWeekDay={activeWeekDay}
            onActiveWeekDayChange={setActiveWeekDay}
            onDayTrainingChange={handleDayTrainingChange}
            activeExerciseId={activeExerciseId}
            superacaoExerciseId={superacaoExerciseId}
            isIncubating={isIncubating}
            hasBiologicalBalance={hasBiologicalBalance}
            userId={authUserId}
            onActivate={setActiveExerciseId}
            onVolumeCommitted={handleExerciseMaxLoad}
            onWeightSaved={handleWeightSaved}
            onWatchVideo={onOpenVideo}
            onSuperacao={handleSuperacao}
            onPersistSuccess={handleExercisePersisted}
          />
        </div>

        <BraseiroPanel
          className="order-2 lg:order-2"
          profile={profile}
          isIncubating={isIncubating}
          formattedVtcTotal={formattedVtcTotal}
          hasBiologicalBalance={hasBiologicalBalance}
          biologicalMultiplier={BIOLOGICAL_BALANCE_MULTIPLIER}
          isChamaReativa={isChamaReativa}
        />
      </div>
    </div>
  );
}
