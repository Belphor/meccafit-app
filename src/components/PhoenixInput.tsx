"use client";

import { memo, useState, useRef, useCallback, useEffect, type FocusEvent } from "react";
import { registrarTreinoComStatus } from "@/lib/supabase";
import {
  ARGOS_WEIGHT_MAX,
  ARGOS_WEIGHT_MIN,
  ARGOS_WEIGHT_STEP,
  PHOENIX_INPUT_BRASAO_SHELL,
  PHOENIX_INPUT_SURFACE,
  PHOENIX_INPUT_META_COMPLETE,
  PHOENIX_INPUT_HINT_COMPLETE,
  PHOENIX_REGISTER_CARGA_ACTIVE,
  PHOENIX_REGISTER_CARGA_IDLE,
} from "@/lib/dashboard-config";
import type { Enums } from "@/types/database.types";
import type { ExerciseMetricKind } from "@/lib/mock-data-types";
import {
  ARGOS_DURATION_SEC_MAX,
  ARGOS_DURATION_SEC_MIN,
  ARGOS_REP_MAX,
  ARGOS_REP_MIN,
  isValidDurationSeconds,
  isValidRepValue,
  parseDurationParts,
  parseRepValue,
  resolveMetricKind,
  resolveTreinoPersistPayload,
  contributesToSessionVtcKg,
  splitDurationSeconds,
} from "@/lib/training-metric";
import { useTouchPrimaryDevice } from "@/hooks/useTouchPrimaryDevice";

const INPUT_FEEDBACK_MS = 2400;

export interface PhoenixInputProps {
  userId: string | null | undefined;
  isExerciseActive?: boolean;
  /** @deprecated Use isPrRegistered */
  isSeriesComplete?: boolean;
  /** PR já registrado nesta semana ou nesta sessão */
  isPrRegistered?: boolean;
  /** Todas as séries prescritas foram concluídas */
  allSetsComplete?: boolean;
  exercicioId?: number | string | null;
  exercicioNome?: string;
  initialWeight?: number;
  trainingGoalText?: string;
  hintCompleteText?: string;
  prescribedSeries?: number;
  musculo?: Enums<"subgrupo_muscular">;
  metricKind?: ExerciseMetricKind;
  fieldIdPrefix?: string;
  onWeightSaved?: (weight: number) => void;
  onVolumeCommitted?: (volume: number) => void;
  onSuperacao?: (payload: { weight: number; series: number; vtc: number }) => void;
  onPersistSuccess?: (detail: { vtcGenerated: number }) => void;
}

function parseTopWeight(weightValue: string) {
  const parsedWeight = parseFloat(weightValue);
  if (weightValue === "" || Number.isNaN(parsedWeight)) return null;
  return parsedWeight;
}

function PhoenixInput({
  userId,
  exercicioId = null,
  exercicioNome,
  initialWeight = 0,
  trainingGoalText = "Alvo do treino",
  hintCompleteText,
  prescribedSeries = 3,
  musculo = "peito",
  metricKind: metricKindProp,
  fieldIdPrefix = "",
  isExerciseActive = false,
  isSeriesComplete = false,
  isPrRegistered: isPrRegisteredProp,
  allSetsComplete = false,
  onWeightSaved,
  onVolumeCommitted,
  onSuperacao,
  onPersistSuccess,
}: PhoenixInputProps) {
  const isTouchPrimary = useTouchPrimaryDevice();
  const registerOnBlur = !isTouchPrimary;
  const isPrRegistered = isPrRegisteredProp ?? isSeriesComplete;
  const numericExerciseId =
    typeof exercicioId === "number"
      ? exercicioId
      : typeof exercicioId === "string" && /^\d+$/.test(exercicioId.trim())
        ? Number.parseInt(exercicioId.trim(), 10)
        : undefined;

  const metricKind = resolveMetricKind({
    metricKind: metricKindProp,
    musculo,
    exercicioId: numericExerciseId,
  });
  const isRepMode = metricKind === "rep_max";
  const isDurationMode = metricKind === "duration_sec";
  const weightFieldId = `${fieldIdPrefix}phoenix-top-weight`;
  const minutesFieldId = `${fieldIdPrefix}phoenix-duration-min`;
  const secondsFieldId = `${fieldIdPrefix}phoenix-duration-sec`;

  const sessionTopWeightRef = useRef(initialWeight > 0 ? initialWeight : 0);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [weight, setWeight] = useState(() => (initialWeight > 0 ? String(initialWeight) : ""));
  const initialDuration = splitDurationSeconds(initialWeight > 0 ? initialWeight : 0);
  const [durationMinutes, setDurationMinutes] = useState(
    () => (initialWeight > 0 ? String(initialDuration.minutes) : ""),
  );
  const [durationSeconds, setDurationSeconds] = useState(
    () => (initialWeight > 0 ? String(initialDuration.seconds) : ""),
  );

  const weightSeedKey = `${exercicioId ?? ""}:${initialWeight}:${metricKind}`;

  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const [inputPulse, setInputPulse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const clearPulseTimer = useCallback(() => {
    if (pulseTimerRef.current) {
      clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = null;
    }
  }, []);

  const pulseInput = useCallback(() => {
    clearPulseTimer();
    setInputPulse(true);
    pulseTimerRef.current = setTimeout(() => setInputPulse(false), INPUT_FEEDBACK_MS);
  }, [clearPulseTimer]);

  useEffect(() => () => clearPulseTimer(), [clearPulseTimer]);

  useEffect(() => {
    queueMicrotask(() => {
      if (initialWeight > 0) {
        if (isDurationMode) {
          const parts = splitDurationSeconds(initialWeight);
          setDurationMinutes(String(parts.minutes));
          setDurationSeconds(String(parts.seconds));
          setWeight("");
        } else {
          setWeight(isRepMode ? String(Math.round(initialWeight)) : String(initialWeight));
          setDurationMinutes("");
          setDurationSeconds("");
        }
        sessionTopWeightRef.current = initialWeight;
      } else {
        sessionTopWeightRef.current = 0;
        setWeight("");
        setDurationMinutes("");
        setDurationSeconds("");
      }
    });
  }, [weightSeedKey, initialWeight, isDurationMode, isRepMode]);

  const persistTopWeight = useCallback(
    async (topMetric: number) => {
      if (isPrRegistered || !allSetsComplete || savingRef.current) return false;

      const uid = String(userId || "").trim();
      if (!uid || uid.length < 20) {
        setError("Sessão inválida. Faça login novamente.");
        return false;
      }

      setError(null);
      savingRef.current = true;
      setIsSaving(true);

      try {
        const payload = resolveTreinoPersistPayload({
          metricKind,
          musculo,
          exercicioId: numericExerciseId,
          metricValue: topMetric,
          prescribedSeries,
        });

        const { data, error: supabaseError } = await registrarTreinoComStatus({
          clienteId: uid,
          exercicioId,
          pesoAtual: payload.pesoAtual,
          musculo,
          series: payload.series,
          repeticoes: payload.repeticoes,
          exercicioNome: exercicioNome ?? "Treino geral",
        });

        if (supabaseError) {
          setError(supabaseError.message);
          return false;
        }

        sessionTopWeightRef.current = Math.max(sessionTopWeightRef.current, topMetric);
        onWeightSaved?.(topMetric);
        if (contributesToSessionVtcKg(metricKind)) {
          onVolumeCommitted?.(topMetric);
        }
        onPersistSuccess?.({
          vtcGenerated: contributesToSessionVtcKg(metricKind)
            ? Number(data.vtc_gerado ?? 0)
            : 0,
        });

        if (data?.status === "SUPERAÇÃO") {
          onSuperacao?.({
            weight: topMetric,
            series: payload.series,
            vtc: data.vtc_gerado ?? topMetric,
          });
        }

        return true;
      } catch {
        setError("Erro de rede ao conectar com o servidor.");
        return false;
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    },
    [
      userId,
      exercicioId,
      exercicioNome,
      musculo,
      metricKind,
      numericExerciseId,
      prescribedSeries,
      isPrRegistered,
      allSetsComplete,
      onPersistSuccess,
      onSuperacao,
      onVolumeCommitted,
      onWeightSaved,
    ],
  );

  const commitTopWeight = useCallback(
    async (topMetric: number) => {
      if (!isExerciseActive || isPrRegistered || !allSetsComplete || isSaving || savingRef.current) return;

      if (isRepMode) {
        if (!isValidRepValue(topMetric)) {
          setError(`Repetições entre ${ARGOS_REP_MIN} e ${ARGOS_REP_MAX}.`);
          return;
        }
      } else if (isDurationMode) {
        if (!isValidDurationSeconds(topMetric)) {
          setError(`Tempo entre ${ARGOS_DURATION_SEC_MIN} s e ${Math.floor(ARGOS_DURATION_SEC_MAX / 60)} min.`);
          return;
        }
      } else if (topMetric <= 0 || topMetric < ARGOS_WEIGHT_MIN || topMetric > ARGOS_WEIGHT_MAX) {
        setError(`Carga entre ${ARGOS_WEIGHT_MIN} e ${ARGOS_WEIGHT_MAX} kg.`);
        return;
      }

      setError(null);

      if (isPrRegistered) return;

      const isNewPeak = topMetric > sessionTopWeightRef.current;
      if (isNewPeak) {
        pulseInput();
      }

      const saved = await persistTopWeight(topMetric);
      if (saved && isNewPeak && isDurationMode) {
        const parts = splitDurationSeconds(topMetric);
        setDurationMinutes(String(parts.minutes));
        setDurationSeconds(String(parts.seconds));
      } else if (saved && isNewPeak) {
        setWeight(isRepMode ? String(Math.round(topMetric)) : String(topMetric));
      }
    },
    [allSetsComplete, isDurationMode, isExerciseActive, isPrRegistered, isRepMode, isSaving, persistTopWeight, pulseInput],
  );

  const commitFromScalarField = useCallback(
    async (rawValue: string) => {
      if (!isExerciseActive) return;
      const parsed = isRepMode ? parseRepValue(rawValue) : parseTopWeight(rawValue);
      if (parsed === null) {
        if (rawValue.trim() !== "") {
          setError(isRepMode ? "Informe repetições válidas." : "Informe uma carga válida em kg.");
        }
        return;
      }
      await commitTopWeight(parsed);
    },
    [commitTopWeight, isExerciseActive, isRepMode],
  );

  const commitFromDurationFields = useCallback(async () => {
    if (!isExerciseActive) return;
    const parsed = parseDurationParts(durationMinutes, durationSeconds);
    if (parsed === null) {
      if (durationMinutes.trim() !== "" || durationSeconds.trim() !== "") {
        setError("Informe minutos (0–10) e segundos (0–59).");
      }
      return;
    }
    await commitTopWeight(parsed);
  }, [commitTopWeight, durationMinutes, durationSeconds, isExerciseActive]);

  const handleFieldBlur = (event: FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (!registerOnBlur || !isExerciseActive) return;
    void commitFromScalarField(event.target.value);
  };

  const handleDurationBlur = () => {
    setIsFocused(false);
    if (!registerOnBlur || !isExerciseActive) return;
    void commitFromDurationFields();
  };

  const disabled = !userId || userId === "undefined";
  const awaitingSets = !allSetsComplete && !isPrRegistered;
  const inputLocked = disabled || !isExerciseActive || isPrRegistered || awaitingSets;
  const useBrasaoBorder =
    (isExerciseActive || isFocused || inputPulse) && !isPrRegistered && allSetsComplete;
  const fieldTone = error ? PHOENIX_INPUT_SURFACE.fieldError : "";
  const inputClass = [PHOENIX_INPUT_SURFACE.field, useBrasaoBorder ? PHOENIX_INPUT_SURFACE.fieldBrasao : "", fieldTone]
    .filter(Boolean)
    .join(" ");
  const registerButtonClass = isExerciseActive ? PHOENIX_REGISTER_CARGA_ACTIVE : PHOENIX_REGISTER_CARGA_IDLE;
  const metaClass = isPrRegistered ? PHOENIX_INPUT_META_COMPLETE : PHOENIX_INPUT_SURFACE.meta;

  const fieldLabel = isDurationMode ? "Tempo máximo" : isRepMode ? "Repetição máxima" : "Carga máxima";
  const hintText = isPrRegistered
    ? hintCompleteText ?? PHOENIX_INPUT_HINT_COMPLETE
    : awaitingSets
      ? "Conclua todas as séries antes de registrar o recorde"
      : isTouchPrimary && isExerciseActive
        ? isDurationMode
          ? "Informe o tempo e toque em Registrar"
          : isRepMode
            ? "Informe as repetições e toque em Registrar"
            : "Informe a carga e toque em Registrar"
        : isDurationMode
          ? "Informe o tempo máximo após concluir as séries"
          : isRepMode
            ? "Informe a repetição máxima após concluir as séries"
            : "Informe a carga máxima em kg após concluir as séries";
  const registerLabel = isDurationMode ? "Registrar tempo" : isRepMode ? "Registrar repetições" : "Registrar carga";

  return (
    <div className={PHOENIX_INPUT_SURFACE.wrapper}>
      <p className={`max-w-full text-center ${metaClass}`}>{trainingGoalText}</p>

      <label className={`flex w-full flex-col items-center gap-2 text-center ${PHOENIX_INPUT_SURFACE.label}`}>
        {fieldLabel}
        <div className={useBrasaoBorder ? PHOENIX_INPUT_BRASAO_SHELL : "w-full"}>
          {isDurationMode ? (
            <div className="flex w-full items-center justify-center gap-2">
              <input
                id={minutesFieldId}
                type="number"
                inputMode="numeric"
                min={0}
                max={10}
                step={1}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={handleDurationBlur}
                placeholder="0"
                disabled={inputLocked}
                readOnly={inputLocked}
                className={`${inputClass} w-20 text-center`}
                aria-label="Minutos"
              />
              <span className="text-xs uppercase tracking-wider text-amber-200/70">min</span>
              <input
                id={secondsFieldId}
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                step={1}
                value={durationSeconds}
                onChange={(event) => setDurationSeconds(event.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={handleDurationBlur}
                placeholder="00"
                disabled={inputLocked}
                readOnly={inputLocked}
                className={`${inputClass} w-20 text-center`}
                aria-label="Segundos"
              />
              <span className="text-xs uppercase tracking-wider text-amber-200/70">s</span>
            </div>
          ) : (
            <input
              id={weightFieldId}
              type="number"
              inputMode={isRepMode ? "numeric" : "decimal"}
              step={isRepMode ? 1 : ARGOS_WEIGHT_STEP}
              min={isRepMode ? ARGOS_REP_MIN : ARGOS_WEIGHT_MIN}
              max={isRepMode ? ARGOS_REP_MAX : ARGOS_WEIGHT_MAX}
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={(event) => {
                handleFieldBlur(event);
              }}
              placeholder={isRepMode ? "00" : "00.0"}
              disabled={inputLocked}
              readOnly={inputLocked}
              className={inputClass}
              aria-describedby={`${fieldIdPrefix}phoenix-hint`}
            />
          )}
        </div>
      </label>

      <p id={`${fieldIdPrefix}phoenix-hint`} className={PHOENIX_INPUT_SURFACE.hint}>
        {hintText}
      </p>

      {!isPrRegistered && allSetsComplete && isTouchPrimary && isExerciseActive ? (
        <button
          type="button"
          data-exercise-interactive="true"
          onClick={(event) => {
            event.stopPropagation();
            if (isDurationMode) {
              void commitFromDurationFields();
            } else {
              void commitFromScalarField(weight);
            }
          }}
          disabled={disabled || isSaving}
          className={registerButtonClass}
        >
          {registerLabel}
        </button>
      ) : null}

      <div className="flex min-h-8 flex-col items-center gap-1">
        {isSaving ? <span className={PHOENIX_INPUT_SURFACE.saving}>Sincronizando...</span> : null}
        {error ? <span className="max-w-xs text-center text-[11px] text-red-300">{error}</span> : null}
      </div>
    </div>
  );
}

export default memo(PhoenixInput);
