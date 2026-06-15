"use client";

import { useCallback, useMemo } from "react";
import type { ClientProfile, MuscleSubgroup } from "@/lib/mock-data";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { CardioVooCinzasPanel } from "@/components/dashboard/CardioVooCinzasPanel";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import { MonumentalExerciseCard } from "@/components/dashboard/MonumentalExerciseCard";
import { MonumentalSubgroupTitle } from "@/components/dashboard/MonumentalSubgroupTitle";
import { TreinoWeekControls } from "@/components/training/treino-week-controls";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SCROLL_LIST,
} from "@/lib/dashboard-config";
import { subgroupIdToMusculo } from "@/lib/subgroup-musculo";
import type { PlanilhaDayRow } from "@/lib/training-week";

type TreinoTabProps = {
  profile: ClientProfile;
  subgroup: MuscleSubgroup;
  activeExerciseId: number;
  superacaoExerciseId: number | null;
  isIncubating: boolean;
  hasBiologicalBalance: boolean;
  userId: string | null;
  initialWeekSchedule?: PlanilhaDayRow[];
  onSubgroupNavigate: (subgroupSlug: string) => void;
  onActivate: (exerciseId: number) => void;
  onVolumeCommitted: (exerciseId: number, baseVolume: number) => void;
  onWeightSaved: (exerciseId: number, weight: number) => void;
  onWatchVideo: (exerciseId: number) => void;
  onSuperacao: (
    exerciseId: number,
    payload: { weight: number; series: number; vtc: number },
  ) => void;
  onPersistSuccess?: (exerciseId: number, detail: { vtcGenerated: number }) => void;
};

export function TreinoTab({
  profile,
  subgroup,
  activeExerciseId,
  superacaoExerciseId,
  isIncubating,
  hasBiologicalBalance,
  userId,
  initialWeekSchedule,
  onSubgroupNavigate,
  onActivate,
  onVolumeCommitted,
  onWeightSaved,
  onWatchVideo,
  onSuperacao,
  onPersistSuccess,
}: TreinoTabProps) {
  const musculo = subgroupIdToMusculo(subgroup.id);

  const handleDayTrainingChange = useCallback(
    ({ subgroupId }: { subgroupId: string }) => {
      if (subgroupId !== subgroup.id) {
        onSubgroupNavigate(subgroupId);
      }
    },
    [onSubgroupNavigate, subgroup.id],
  );

  const weekControls = useMemo(() => {
    if (!userId) return null;

    return (
      <TreinoWeekControls
        userId={userId}
        initialSchedule={initialWeekSchedule}
        onDayTrainingChange={handleDayTrainingChange}
      />
    );
  }, [handleDayTrainingChange, initialWeekSchedule, userId]);

  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      className={DASHBOARD_PANEL_FRAME}
      aria-labelledby="subgrupo-monumental-title"
    >
      <DashboardPanelHeader chip="Treino" meta="Execução diária" metaVariant="chip" />

      <CardioVooCinzasPanel userId={userId} />

      <div className={`mt-4 space-y-4 ${DASHBOARD_INNER_FRAME} p-4`}>
        {weekControls}
        <MonumentalSubgroupTitle subgroup={subgroup} />
      </div>

      <ul className={`mt-4 ${DASHBOARD_SCROLL_LIST}`} aria-label="Lista de exercícios do dia">
        {subgroup.exercises.map((exercise) => (
          <li key={exercise.id} className="min-w-0">
            <MonumentalExerciseCard
              exercise={exercise}
              isActive={exercise.id === activeExerciseId}
              isSuperacaoFlame={exercise.id === superacaoExerciseId}
              musculo={musculo}
              isIncubating={isIncubating}
              hasBiologicalBalance={hasBiologicalBalance}
              userId={userId}
              onActivate={onActivate}
              onVolumeCommitted={onVolumeCommitted}
              onWeightSaved={onWeightSaved}
              onWatchVideo={onWatchVideo}
              onSuperacao={onSuperacao}
              onPersistSuccess={onPersistSuccess}
            />
          </li>
        ))}
      </ul>
    </BrasaVivaCard>
  );
}
