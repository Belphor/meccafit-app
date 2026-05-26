"use client";

import { memo, useCallback, useState, type KeyboardEvent, type MouseEvent } from "react";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import PhoenixInput from "@/components/PhoenixInput";
import { EmChamasBadge } from "@/components/dashboard/EmChamasBadge";
import { SuperacaoEmChamasBadge } from "@/components/dashboard/SuperacaoEmChamasBadge";
import { ExerciseCardContourTrace } from "@/components/dashboard/ExerciseCardContourTrace";
import { ExerciseForjadoBadge } from "@/components/dashboard/ExerciseForjadoBadge";
import { CameraGlyph } from "@/components/dashboard/DashboardBrandAssets";
import type { Enums } from "@/types/database.types";
import type { Exercise } from "@/lib/mock-data";
import { formatExerciseReferenceWeight } from "@/lib/mock-data";
import {
  BIOLOGICAL_BALANCE_MULTIPLIER,
  BRASAO_LIGHT_CAPSULE,
  EXERCISE_CARD_COMPLETE,
  EXERCISE_CARD_COMPLETE_FRAME,
  EXERCISE_CARD_SELECTED_FRAME,
  EXERCISE_CARD_SUPERACAO_FRAME,
  EXERCISE_CARD_ACTIVE,
  EXERCISE_CARD_IDLE,
  EXERCISE_CARD_SELECTABLE,
  EXERCISE_CAPSULE_COMPLETE,
  EXERCISE_CAPSULE_IDLE,
  EXERCISE_DIVIDER_ACTIVE,
  EXERCISE_DIVIDER_COMPLETE,
  EXERCISE_DIVIDER_IDLE,
  EXERCISE_NAME_ACTIVE,
  EXERCISE_NAME_COMPLETE,
  EXERCISE_NAME_IDLE,
  EXERCISE_PHASE_IDLE,
  EXERCISE_RECORD_META,
  EXERCISE_RECORD_TERM,
  EXERCISE_SESSION_REGISTERED_LABEL,
  EXERCISE_SERIES_PROGRESS,
  EXERCISE_SERIES_SUPERACAO,
  PHOENIX_INPUT_GOAL_COMPLETE,
  EXERCISE_VIDEO_BUTTON,
  EXERCISE_VIDEO_BUTTON_IDLE,
} from "@/lib/dashboard-config";

const INCUBATION_MESSAGE = "Aguarde o despertar. Suas chamas estão em incubação...";

export type MonumentalExerciseCardProps = {
  exercise: Exercise;
  isActive: boolean;
  isSuperacaoFlame: boolean;
  musculo: Enums<"subgrupo_muscular">;
  isIncubating: boolean;
  hasBiologicalBalance: boolean;
  userId: string | null | undefined;
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

function formatVolume(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function stopCardActivation(event: MouseEvent) {
  event.stopPropagation();
}

export const MonumentalExerciseCard = memo(function MonumentalExerciseCard({
  exercise,
  isActive,
  isSuperacaoFlame,
  musculo,
  isIncubating,
  hasBiologicalBalance,
  userId,
  onActivate,
  onVolumeCommitted,
  onWeightSaved,
  onWatchVideo,
  onSuperacao,
  onPersistSuccess,
}: MonumentalExerciseCardProps) {
  const [baseVtc, setBaseVtc] = useState(0);
  const finalVtc = hasBiologicalBalance ? baseVtc * BIOLOGICAL_BALANCE_MULTIPLIER : baseVtc;
  const isSeriesComplete = exercise.completedSets >= exercise.targetSets;
  const historicalPrLabel = formatExerciseReferenceWeight(exercise);

  const handleVolumeCommitted = useCallback(
    (volume: number) => {
      setBaseVtc(volume);
      onVolumeCommitted(exercise.id, volume);
    },
    [exercise.id, onVolumeCommitted],
  );

  const handleWeightSaved = useCallback(
    (weight: number) => {
      onWeightSaved(exercise.id, weight);
    },
    [exercise.id, onWeightSaved],
  );

  const handleCardActivate = useCallback(() => {
    onActivate(exercise.id);
  }, [exercise.id, onActivate]);

  const handleCardKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onActivate(exercise.id);
      }
    },
    [exercise.id, onActivate],
  );

  const handleWatchVideo = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (isSeriesComplete) return;
      onWatchVideo(exercise.id);
    },
    [exercise.id, isSeriesComplete, onWatchVideo],
  );

  const flameActive = isActive && isSuperacaoFlame;
  const showBrasaoBorder = isSeriesComplete || isActive || flameActive;
  const videoInteractive = !isSeriesComplete;
  const seriesClass = isSeriesComplete
    ? EXERCISE_CAPSULE_COMPLETE
    : isSuperacaoFlame
      ? EXERCISE_SERIES_SUPERACAO
      : isActive
        ? EXERCISE_SERIES_PROGRESS
        : EXERCISE_CAPSULE_IDLE;
  const capsuleClass = isSeriesComplete
    ? EXERCISE_CAPSULE_COMPLETE
    : showBrasaoBorder
      ? BRASAO_LIGHT_CAPSULE
      : EXERCISE_CAPSULE_IDLE;
  const videoButtonClass = videoInteractive ? EXERCISE_VIDEO_BUTTON : EXERCISE_VIDEO_BUTTON_IDLE;

  const seriesPrescriptionText = isSeriesComplete
    ? EXERCISE_SESSION_REGISTERED_LABEL
    : `${exercise.targetSets} séries prescritas`;

  const cardSurface = isSeriesComplete
    ? EXERCISE_CARD_COMPLETE
    : isActive
      ? EXERCISE_CARD_ACTIVE
      : EXERCISE_CARD_IDLE;
  const nameClass = isSeriesComplete
    ? EXERCISE_NAME_COMPLETE
    : isActive
      ? EXERCISE_NAME_ACTIVE
      : EXERCISE_NAME_IDLE;
  const cardFrameClass = [
    isSeriesComplete ? `exercise-card-complete ${EXERCISE_CARD_COMPLETE_FRAME}` : "",
    flameActive ? EXERCISE_CARD_SUPERACAO_FRAME : "",
    isActive && !isSeriesComplete && !flameActive ? EXERCISE_CARD_SELECTED_FRAME : "",
  ]
    .filter(Boolean)
    .join(" ");
  const dividerClass = isSeriesComplete
    ? EXERCISE_DIVIDER_COMPLETE
    : showBrasaoBorder
      ? EXERCISE_DIVIDER_ACTIVE
      : EXERCISE_DIVIDER_IDLE;

  return (
    <BrasaVivaCard
      as="article"
      tabIndex={0}
      aria-label={`Exercício ${exercise.name}${isSeriesComplete ? ", concluído" : isActive ? ", selecionado" : ""}`}
      aria-current={isActive ? "true" : undefined}
      onClick={handleCardActivate}
      onKeyDown={handleCardKeyDown}
      className={`${EXERCISE_CARD_SELECTABLE} p-4 sm:p-6 ${cardSurface} ${cardFrameClass}`}
      variant={showBrasaoBorder ? "brasao" : "selectable-idle"}
      overlay={isActive && !isSeriesComplete ? <ExerciseCardContourTrace /> : null}
    >
      <div className="relative grid min-w-0 grid-cols-1 gap-3">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {flameActive ? (
                <SuperacaoEmChamasBadge />
              ) : isSeriesComplete ? (
                <ExerciseForjadoBadge />
              ) : isActive && !flameActive ? (
                <EmChamasBadge />
              ) : (
                <span className={EXERCISE_PHASE_IDLE} role="status">
                  Na fila
                </span>
              )}
              <span className={`${seriesClass} pointer-events-none`} role="status">
                {seriesPrescriptionText}
              </span>
            </div>

            <h3 className={`${nameClass} mt-2.5`}>
              {exercise.name}
            </h3>
          </div>

          <button
            type="button"
            aria-label={`Assistir execução de ${exercise.name}`}
            aria-disabled={!videoInteractive}
            disabled={!videoInteractive}
            onClick={handleWatchVideo}
            className={`${videoButtonClass} relative z-[2] w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-55`}
          >
            <CameraGlyph className="text-amber-300" />
            <span>Vídeo</span>
          </button>
        </div>

        <div className={dividerClass} aria-hidden="true" />

        {isIncubating ? (
          <p className="font-serif text-base leading-relaxed text-amber-100/90 sm:text-lg">{INCUBATION_MESSAGE}</p>
        ) : (
          <div className="relative min-w-0">
            <div
              className="pointer-events-none flex min-w-0 gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Métricas do exercício"
            >
              <span className={capsuleClass}>Séries {exercise.targetSets}</span>
              <span className={`${capsuleClass} ${showBrasaoBorder ? "text-amber-100" : ""}`}>
                VTC {formatVolume(finalVtc)}
              </span>
            </div>
            <p className={`${EXERCISE_RECORD_META} pointer-events-none`}>
              <span className={EXERCISE_RECORD_TERM}>Recorde histórico</span>
              {" · "}
              {historicalPrLabel}
            </p>
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-neutral-950/80 to-transparent sm:hidden"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      <div
        className="relative z-[2] mt-5 flex w-full justify-center"
        onClick={stopCardActivation}
        role="presentation"
      >
        <PhoenixInput
          userId={userId}
          isExerciseActive={isActive && !isSeriesComplete}
          isSeriesComplete={isSeriesComplete}
          exercicioId={exercise.id}
          exercicioNome={exercise.name}
          fieldIdPrefix={`exercise-${exercise.id}-`}
          initialWeight={exercise.currentWeight}
          trainingGoalText={
            isSeriesComplete
              ? PHOENIX_INPUT_GOAL_COMPLETE
              : `Registrar carga máxima · ${exercise.targetSets} séries`
          }
          prescribedSeries={exercise.targetSets}
          musculo={musculo}
          onWeightSaved={handleWeightSaved}
          onVolumeCommitted={handleVolumeCommitted}
          onSuperacao={(payload) => onSuperacao(exercise.id, payload)}
          onPersistSuccess={(detail) => onPersistSuccess?.(exercise.id, detail)}
        />
      </div>
    </BrasaVivaCard>
  );
});
