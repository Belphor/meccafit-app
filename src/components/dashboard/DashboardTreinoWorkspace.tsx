"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BraseiroPanel } from "@/components/dashboard/BraseiroPanel";
import { TreinoTab } from "@/components/dashboard/TreinoTab";
import { readAltarVtcSession, writeAltarVtcSession } from "@/lib/altar-vtc-session";
import {
  getWeekLockedMaxLoadsForDay,
  isExerciseWeekLocked,
  markExerciseWeekLocked,
} from "@/lib/treino-week-lock";
import {
  mergeSessionCompletedSets,
  reconcileSessionCompletedSets,
  reconcileSessionMaxLoads,
  sumSessionAltarVtc,
} from "@/lib/dashboard-data";
import type { ClientProfile, MuscleSubgroup } from "@/lib/mock-data";
import { resolveCatalogMetricKind } from "@/lib/exercise-catalog";
import { contributesToSessionVtcKg, resolveSessionVtcContribution } from "@/lib/training-metric";
import {
  BIOLOGICAL_BALANCE_MULTIPLIER,
  DASHBOARD_TAB_CONTENT,
  SUPERACAO_FLAME_MS,
  SUPERACAO_MURAL_MS,
  SUPERACAO_OVERLAY_MS,
} from "@/lib/dashboard-config";
import type { PlanilhaDayRow, WeekdayIndex } from "@/lib/training-week";
import type { TrainingTrackState } from "@/lib/training-track";
import type { ForjadorPrescriptionRow, ForjadorTreinoConfig } from "@/lib/forjador-prescriptions";
import { TreinoLinhagemInactivityDegradation } from "@/components/dashboard/TreinoLinhagemInactivityDegradation";

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
  useForjadorSchedule?: boolean;
  activeTrainingDay: WeekdayIndex;
  forjadorConfig: ForjadorTreinoConfig;
  forjadorPrescriptions: ForjadorPrescriptionRow[];
  isTreinoSwitching: boolean;
  trainingTrack: TrainingTrackState;
  isIncubating: boolean;
  hasBiologicalBalance: boolean;
  onAltarMetricsChange: (baseVtcTotal: number, lastSavedWeight: number) => void;
  onSuperacaoFlashChange: (visible: boolean) => void;
  onOpenVideo: (exerciseId: number) => void;
  onSuperacaoMural: (exerciseName: string, payload: SuperacaoPayload) => void;
  onTrainingPersisted: (exerciseId: number, detail?: { vtcGenerated: number }) => void;
  onTrainingDayPick: (day: WeekdayIndex) => void;
  onSetComplete?: (exerciseId: number) => void;
  linhagemInactivityDegradationMessage?: string | null;
};

function resolveDefaultActiveExerciseId(subgroup: MuscleSubgroup) {
  const pending = subgroup.exercises.find((item) => item.completedSets < item.targetSets);
  return pending?.id ?? subgroup.exercises[0]?.id ?? 1;
}

function resolveTreinoSessionHydration(
  sessionScope: { userId: string; trainingDay: WeekdayIndex; legacyMuscle?: string; legacySubgroupId?: string },
  subgroup: MuscleSubgroup,
) {
  const snapshot = readAltarVtcSession(sessionScope);
  const weekLockedLoads = getWeekLockedMaxLoadsForDay(
    sessionScope.userId,
    sessionScope.trainingDay,
  );

  if (!snapshot) {
    const maxLoadsByExerciseId: Record<number, number> = {};
    const registeredPrByExerciseId: Record<number, number> = {};
    for (const exercise of subgroup.exercises) {
      const lockedContribution = weekLockedLoads[exercise.id];
      if (lockedContribution) {
        maxLoadsByExerciseId[exercise.id] = lockedContribution;
        registeredPrByExerciseId[exercise.id] = lockedContribution;
      }
    }

    return {
      baseVtcTotal: sumSessionAltarVtc(subgroup, maxLoadsByExerciseId),
      completedSetsByExerciseId: {} as Record<number, number>,
      lastSavedWeight: 0,
      maxLoadsByExerciseId,
      registeredPrByExerciseId,
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
  const mergedMaxLoads = { ...reconciledMaxLoads };
  const registeredPrByExerciseId = { ...(snapshot.registeredPrByExerciseId ?? {}) };
  for (const exercise of subgroup.exercises) {
    const lockedContribution = weekLockedLoads[exercise.id];
    if (lockedContribution) {
      mergedMaxLoads[exercise.id] = lockedContribution;
      registeredPrByExerciseId[exercise.id] = lockedContribution;
    }
  }
  const reconciledVtc = sumSessionAltarVtc(subgroup, mergedMaxLoads);
  const hasStaleSession =
    Object.keys(reconciledCompleted).length !==
      Object.keys(snapshot.completedSetsByExerciseId).length ||
    Object.keys(mergedMaxLoads).length !== Object.keys(snapshot.maxLoadsByExerciseId).length ||
    Object.keys(registeredPrByExerciseId).length !==
      Object.keys(snapshot.registeredPrByExerciseId ?? {}).length;

  return {
    baseVtcTotal: reconciledVtc,
    completedSetsByExerciseId: reconciledCompleted,
    lastSavedWeight: snapshot.lastSavedWeight,
    maxLoadsByExerciseId: mergedMaxLoads,
    registeredPrByExerciseId,
    shouldPersistStale: hasStaleSession,
  };
}

export function DashboardTreinoWorkspace({
  subgroup,
  profile,
  authUserId,
  initialWeekSchedule,
  useForjadorSchedule = false,
  activeTrainingDay,
  forjadorConfig,
  forjadorPrescriptions,
  isTreinoSwitching,
  trainingTrack,
  isIncubating,
  hasBiologicalBalance,
  onAltarMetricsChange,
  onSuperacaoFlashChange,
  onOpenVideo,
  onSuperacaoMural,
  onTrainingPersisted,
  onTrainingDayPick,
  onSetComplete,
  linhagemInactivityDegradationMessage = null,
}: DashboardTreinoWorkspaceProps) {
  const linhagemInactivityDegraded = Boolean(linhagemInactivityDegradationMessage?.trim());
  const sessionScope = useMemo(
    () => ({
      userId: authUserId,
      trainingDay: activeTrainingDay,
      legacySubgroupId: subgroup.id.startsWith("planilha-dia-") ? undefined : subgroup.id,
    }),
    [authUserId, activeTrainingDay, subgroup.id],
  );
  const sessionHydrationKey = `${sessionScope.userId}:${sessionScope.trainingDay}`;
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
  const [maxLoadsByExerciseId, setMaxLoadsByExerciseId] = useState<Record<number, number>>(
    sessionHydration.maxLoadsByExerciseId,
  );
  const [registeredPrByExerciseId, setRegisteredPrByExerciseId] = useState<Record<number, number>>(
    sessionHydration.registeredPrByExerciseId,
  );
  const maxLoadsRef = useRef<Record<number, number>>(sessionHydration.maxLoadsByExerciseId);
  const registeredPrRef = useRef<Record<number, number>>(sessionHydration.registeredPrByExerciseId);
  const completedSetsRef = useRef<Record<number, number>>(
    sessionHydration.completedSetsByExerciseId,
  );
  const lastSavedWeightRef = useRef(sessionHydration.lastSavedWeight);
  const sessionHydratedRef = useRef(true);
  const prevSubgroupIdRef = useRef(subgroup.id);
  const lastSessionHydrationKeyRef = useRef(sessionHydrationKey);
  const flameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const muralTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistAltarSession = useCallback(
    (nextBaseVtcTotal: number, nextLastSavedWeight: number) => {
      writeAltarVtcSession(sessionScope, {
        baseVtcTotal: nextBaseVtcTotal,
        lastSavedWeight: nextLastSavedWeight,
        maxLoadsByExerciseId: maxLoadsRef.current,
        registeredPrByExerciseId: registeredPrRef.current,
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
    const hydrationKeyChanged = lastSessionHydrationKeyRef.current !== sessionHydrationKey;
    const subgroupChanged = prevSubgroupIdRef.current !== subgroup.id;
    const hasActiveSession =
      Object.values(completedSetsRef.current).some((value) => value > 0) ||
      Object.values(maxLoadsRef.current).some((value) => value > 0);

    if (!hydrationKeyChanged && !subgroupChanged) return;
    if (!hydrationKeyChanged && subgroupChanged && hasActiveSession) {
      prevSubgroupIdRef.current = subgroup.id;
      if (subgroupChanged) {
        setActiveExerciseId(resolveDefaultActiveExerciseId(subgroup));
      }
      return;
    }

    lastSessionHydrationKeyRef.current = sessionHydrationKey;
    prevSubgroupIdRef.current = subgroup.id;

    queueMicrotask(() => {
      maxLoadsRef.current = sessionHydration.maxLoadsByExerciseId;
      registeredPrRef.current = sessionHydration.registeredPrByExerciseId;
      completedSetsRef.current = sessionHydration.completedSetsByExerciseId;
      lastSavedWeightRef.current = sessionHydration.lastSavedWeight;
      setBaseVtcTotal(sessionHydration.baseVtcTotal);
      setCompletedSetsByExerciseId(sessionHydration.completedSetsByExerciseId);
      setMaxLoadsByExerciseId(sessionHydration.maxLoadsByExerciseId);
      setRegisteredPrByExerciseId(sessionHydration.registeredPrByExerciseId);

      if (subgroupChanged) {
        setActiveExerciseId(resolveDefaultActiveExerciseId(subgroup));
      }

      sessionHydratedRef.current = true;
      onAltarMetricsChange(sessionHydration.baseVtcTotal, sessionHydration.lastSavedWeight);

      if (sessionHydration.shouldPersistStale) {
        writeAltarVtcSession(sessionScope, {
          baseVtcTotal: sessionHydration.baseVtcTotal,
          lastSavedWeight: sessionHydration.lastSavedWeight,
          maxLoadsByExerciseId: sessionHydration.maxLoadsByExerciseId,
          registeredPrByExerciseId: sessionHydration.registeredPrByExerciseId,
          completedSetsByExerciseId: sessionHydration.completedSetsByExerciseId,
        });
      }
    });
  }, [
    sessionHydrationKey,
    sessionHydration,
    sessionScope,
    subgroup.id,
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
    (exerciseId: number, value: number) => {
      if (isExerciseWeekLocked(authUserId, activeTrainingDay, exerciseId)) return;
      if (registeredPrRef.current[exerciseId]) return;

      lastSavedWeightRef.current = value;
      registeredPrRef.current = { ...registeredPrRef.current, [exerciseId]: value };
      setRegisteredPrByExerciseId({ ...registeredPrRef.current });
      markExerciseWeekLocked(authUserId, activeTrainingDay, exerciseId, value);

      const exercise = mergedSubgroup.exercises.find((item) => item.id === exerciseId);
      const metricKind = exercise?.metricKind ?? resolveCatalogMetricKind(exerciseId);

      if (contributesToSessionVtcKg(metricKind)) {
        const vtcContribution = resolveSessionVtcContribution(metricKind, value);
        const validIds = new Set(mergedSubgroup.exercises.map((item) => item.id));
        maxLoadsRef.current = {
          ...maxLoadsRef.current,
          [exerciseId]: vtcContribution > 0 ? vtcContribution : value,
        };
        for (const key of Object.keys(maxLoadsRef.current)) {
          const id = Number.parseInt(key, 10);
          if (!validIds.has(id)) {
            delete maxLoadsRef.current[id];
          }
        }
        setMaxLoadsByExerciseId({ ...maxLoadsRef.current });
      }

      const total = sumSessionAltarVtc(mergedSubgroup, maxLoadsRef.current);
      setBaseVtcTotal(total);
      onAltarMetricsChange(total, value);

      if (sessionHydratedRef.current) {
        persistAltarSession(total, value);
      }
    },
    [
      activeTrainingDay,
      authUserId,
      mergedSubgroup,
      onAltarMetricsChange,
      persistAltarSession,
    ],
  );

  const handleExerciseMaxLoad = useCallback(
    (exerciseId: number, maxLoadKg: number) => {
      if (isExerciseWeekLocked(authUserId, activeTrainingDay, exerciseId)) return;

      const exercise = mergedSubgroup.exercises.find((item) => item.id === exerciseId);
      const metricKind = exercise?.metricKind ?? resolveCatalogMetricKind(exerciseId);
      const vtcContribution = resolveSessionVtcContribution(metricKind, maxLoadKg);
      const validIds = new Set(mergedSubgroup.exercises.map((item) => item.id));

      maxLoadsRef.current = {
        ...maxLoadsRef.current,
        [exerciseId]: vtcContribution > 0 ? vtcContribution : maxLoadKg,
      };

      for (const key of Object.keys(maxLoadsRef.current)) {
        const id = Number.parseInt(key, 10);
        if (!validIds.has(id)) {
          delete maxLoadsRef.current[id];
        }
      }

      const total = sumSessionAltarVtc(mergedSubgroup, maxLoadsRef.current);
      setBaseVtcTotal(total);
      setMaxLoadsByExerciseId({ ...maxLoadsRef.current });
      onAltarMetricsChange(total, lastSavedWeightRef.current);
      markExerciseWeekLocked(authUserId, activeTrainingDay, exerciseId, maxLoadKg);
      if (sessionHydratedRef.current) {
        persistAltarSession(total, lastSavedWeightRef.current);
      }
    },
    [activeTrainingDay, authUserId, mergedSubgroup, onAltarMetricsChange, persistAltarSession],
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
    [mergedSubgroup.exercises, onSuperacaoMural, triggerSuperacaoFeedback],
  );

  const isChamaReativa = baseVtcTotal > 0 || superacaoExerciseId !== null;

  const handleSetComplete = useCallback(
    (exerciseId: number) => {
      const exercise = mergedSubgroup.exercises.find((item) => item.id === exerciseId);
      if (!exercise) return;

      const current = Math.trunc(
        completedSetsRef.current[exerciseId] ?? exercise.completedSets,
      );
      if (current >= exercise.targetSets) return;

      completedSetsRef.current = {
        ...completedSetsRef.current,
        [exerciseId]: current + 1,
      };
      setCompletedSetsByExerciseId({ ...completedSetsRef.current });

      const total = sumSessionAltarVtc(mergedSubgroup, maxLoadsRef.current);
      setBaseVtcTotal(total);
      onAltarMetricsChange(total, lastSavedWeightRef.current);

      if (sessionHydratedRef.current) {
        persistAltarSession(total, lastSavedWeightRef.current);
      }

      onSetComplete?.(exerciseId);
    },
    [mergedSubgroup, onAltarMetricsChange, onSetComplete, persistAltarSession],
  );

  const handleExercisePersisted = useCallback(
    (exerciseId: number, detail?: { vtcGenerated: number }) => {
      onTrainingPersisted(exerciseId, detail);
    },
    [onTrainingPersisted],
  );

  const handleTrainingDayPick = useCallback(
    (day: WeekdayIndex) => {
      onTrainingDayPick(day);
    },
    [onTrainingDayPick],
  );

  return (
    <div className={DASHBOARD_TAB_CONTENT}>
      <TreinoLinhagemInactivityDegradation
        active={linhagemInactivityDegraded}
        message={linhagemInactivityDegradationMessage ?? ""}
      >
        <div className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="order-1 min-w-0 lg:order-1">
            <TreinoTab
            subgroup={mergedSubgroup}
            initialWeekSchedule={initialWeekSchedule}
            useForjadorSchedule={useForjadorSchedule}
            activeTrainingDay={activeTrainingDay}
            isTreinoSwitching={isTreinoSwitching}
            forjadorConfig={forjadorConfig}
            forjadorPrescriptions={forjadorPrescriptions}
            trainingTrack={trainingTrack}
            onTrainingDayPick={handleTrainingDayPick}
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
            onSetComplete={handleSetComplete}
            maxLoadsByExerciseId={maxLoadsByExerciseId}
            registeredPrByExerciseId={registeredPrByExerciseId}
          />
        </div>

          <BraseiroPanel
            className="order-2 lg:order-2"
            profile={profile}
            isIncubating={isIncubating}
            formattedVtcTotal={formattedVtcTotal}
            vtcTotal={finalVtcTotal}
            hasBiologicalBalance={hasBiologicalBalance}
            biologicalMultiplier={BIOLOGICAL_BALANCE_MULTIPLIER}
            isChamaReativa={isChamaReativa}
          />
        </div>
      </TreinoLinhagemInactivityDegradation>
    </div>
  );
}
