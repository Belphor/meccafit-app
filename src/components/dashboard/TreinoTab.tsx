"use client";

import type { ClientProfile, MuscleSubgroup } from "@/lib/mock-data";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { CardioVooCinzasPanel } from "@/components/dashboard/CardioVooCinzasPanel";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import { MonumentalExerciseCard } from "@/components/dashboard/MonumentalExerciseCard";
import { MonumentalSubgroupTitle } from "@/components/dashboard/MonumentalSubgroupTitle";
import { TreinoSubgroupNav } from "@/components/dashboard/TreinoSubgroupNav";
import { DASHBOARD_PANEL_FRAME, DASHBOARD_SCROLL_LIST } from "@/lib/dashboard-config";
import { subgroupIdToMusculo } from "@/lib/subgroup-musculo";
import type { DashboardTabId } from "@/lib/dashboard-tabs";

type TreinoTabProps = {
  profile: ClientProfile;
  subgroup: MuscleSubgroup;
  tabParam?: DashboardTabId | null;
  activeExerciseId: number;
  superacaoExerciseId: number | null;
  isIncubating: boolean;
  hasBiologicalBalance: boolean;
  userId: string | null;
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
  tabParam,
  activeExerciseId,
  superacaoExerciseId,
  isIncubating,
  hasBiologicalBalance,
  userId,
  onActivate,
  onVolumeCommitted,
  onWeightSaved,
  onWatchVideo,
  onSuperacao,
  onPersistSuccess,
}: TreinoTabProps) {
  const musculo = subgroupIdToMusculo(subgroup.id);

  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      className={DASHBOARD_PANEL_FRAME}
      aria-labelledby="subgrupo-monumental-title"
    >
      <DashboardPanelHeader chip="Aba 1 · Treino" meta={profile.birth} metaVariant="chip" />

      <CardioVooCinzasPanel userId={userId} />

      <TreinoSubgroupNav activeSubgroupId={subgroup.id} tabParam={tabParam} />

      <MonumentalSubgroupTitle subgroup={subgroup} />

      <ul className={`mt-2 ${DASHBOARD_SCROLL_LIST}`} aria-label="Lista de exercícios do dia">
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
