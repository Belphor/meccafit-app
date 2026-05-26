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
import {
  BIOLOGICAL_BALANCE_MULTIPLIER,
  DASHBOARD_TAB_CONTENT,
  SUPERACAO_FLAME_MS,
  SUPERACAO_MURAL_MS,
  SUPERACAO_OVERLAY_MS,
} from "@/lib/dashboard-config";

export type SuperacaoPayload = {
  weight: number;
  series: number;
  vtc: number;
};

export type DashboardTreinoWorkspaceProps = {
  subgroup: MuscleSubgroup;
  profile: ClientProfile;
  authUserId: string;
  isIncubating: boolean;
  hasBiologicalBalance: boolean;
  onAltarMetricsChange: (baseVtcTotal: number, lastSavedWeight: number) => void;
  onSuperacaoFlashChange: (visible: boolean) => void;
  onOpenVideo: (exerciseId: number) => void;
  onSuperacaoMural: (exerciseName: string, payload: SuperacaoPayload) => void;
  onTrainingPersisted: (exerciseId: number, detail?: { vtcGenerated: number }) => void;
};

function resolveDefaultActiveExerciseId(subgroup: MuscleSubgroup) {
  const pending = subgroup.exercises.find((item) => item.completedSets < item.targetSets);
  return pending?.id ?? subgroup.exercises[0]?.id ?? 1;
}

export function DashboardTreinoWorkspace({
  subgroup,
  profile,
  authUserId,
  isIncubating,
  hasBiologicalBalance,
  onAltarMetricsChange,
  onSuperacaoFlashChange,
  onOpenVideo,
  onSuperacaoMural,
  onTrainingPersisted,
}: DashboardTreinoWorkspaceProps) {
  const sessionScope = useMemo(
    () => ({ userId: authUserId, subgroupId: subgroup.id }),
    [authUserId, subgroup.id],
  );

  const [activeExerciseId, setActiveExerciseId] = useState(() =>
    resolveDefaultActiveExerciseId(subgroup),
  );
  const [superacaoExerciseId, setSuperacaoExerciseId] = useState<number | null>(null);
  const [baseVtcTotal, setBaseVtcTotal] = useState(0);
  const [completedSetsByExerciseId, setCompletedSetsByExerciseId] = useState<Record<number, number>>(
    {},
  );
  const maxLoadsRef = useRef<Record<number, number>>({});
  const completedSetsRef = useRef<Record<number, number>>({});
  const lastSavedWeightRef = useRef(0);
  const sessionHydratedRef = useRef(false);
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
    sessionHydratedRef.current = false;

    const snapshot = readAltarVtcSession(sessionScope);
    if (snapshot) {
      const reconciledCompleted = reconcileSessionCompletedSets(
        subgroup,
        snapshot.completedSetsByExerciseId,
      );
      const reconciledMaxLoads = reconcileSessionMaxLoads(subgroup, snapshot.maxLoadsByExerciseId);
      const reconciledVtc = Object.values(reconciledMaxLoads).reduce((sum, value) => sum + value, 0);
      const hasStaleSession =
        Object.keys(reconciledCompleted).length !==
          Object.keys(snapshot.completedSetsByExerciseId).length ||
        Object.keys(reconciledMaxLoads).length !== Object.keys(snapshot.maxLoadsByExerciseId).length;

      maxLoadsRef.current = reconciledMaxLoads;
      completedSetsRef.current = reconciledCompleted;
      lastSavedWeightRef.current = snapshot.lastSavedWeight;
      setBaseVtcTotal(reconciledVtc);
      setCompletedSetsByExerciseId(reconciledCompleted);
      onAltarMetricsChange(reconciledVtc, snapshot.lastSavedWeight);

      if (hasStaleSession) {
        writeAltarVtcSession(sessionScope, {
          baseVtcTotal: reconciledVtc,
          lastSavedWeight: snapshot.lastSavedWeight,
          maxLoadsByExerciseId: reconciledMaxLoads,
          completedSetsByExerciseId: reconciledCompleted,
        });
      }
    } else {
      maxLoadsRef.current = {};
      completedSetsRef.current = {};
      lastSavedWeightRef.current = 0;
      setBaseVtcTotal(0);
      setCompletedSetsByExerciseId({});
      onAltarMetricsChange(0, 0);
    }

    sessionHydratedRef.current = true;
  }, [sessionScope, subgroup, onAltarMetricsChange]);

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
      maxLoadsRef.current[exerciseId] = maxLoadKg;
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

  return (
    <div className={DASHBOARD_TAB_CONTENT}>
      <div className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="order-1 min-w-0 lg:order-1">
          <TreinoTab
            profile={profile}
            subgroup={mergedSubgroup}
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
