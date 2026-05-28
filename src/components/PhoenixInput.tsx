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



const INPUT_FEEDBACK_MS = 2400;



export interface PhoenixInputProps {

  userId: string | null | undefined;

  isExerciseActive?: boolean;

  isSeriesComplete?: boolean;

  exercicioId?: number | string | null;

  exercicioNome?: string;

  initialWeight?: number;

  trainingGoalText?: string;

  prescribedSeries?: number;

  musculo?: Enums<"subgrupo_muscular">;

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

  prescribedSeries = 3,

  musculo = "peito",

  fieldIdPrefix = "",

  isExerciseActive = false,

  isSeriesComplete = false,

  onWeightSaved,

  onVolumeCommitted,

  onSuperacao,

  onPersistSuccess,

}: PhoenixInputProps) {

  const weightFieldId = `${fieldIdPrefix}phoenix-top-weight`;

  const sessionTopWeightRef = useRef(initialWeight > 0 ? initialWeight : 0);

  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);



  const [weight, setWeight] = useState(() => (initialWeight > 0 ? String(initialWeight) : ""));

  const weightSeedKey = `${exercicioId ?? ""}:${initialWeight}`;

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

        setWeight(String(initialWeight));

        sessionTopWeightRef.current = initialWeight;

      } else {

        sessionTopWeightRef.current = 0;

        setWeight("");

      }

    });

  }, [weightSeedKey, initialWeight]);



  const persistTopWeight = useCallback(

    async (topWeight: number) => {
      if (savingRef.current) return false;

      const uid = String(userId || "").trim();

      if (!uid || uid.length < 20) {

        setError("Sessão inválida. Faça login novamente.");

        return false;

      }



      setError(null);
      savingRef.current = true;
      setIsSaving(true);



      try {

        const series = Math.max(1, prescribedSeries);



        const { data, error: supabaseError } = await registrarTreinoComStatus({

          clienteId: uid,

          exercicioId,

          pesoAtual: topWeight,

          musculo,

          series,

          repeticoes: 1,

          exercicioNome: exercicioNome ?? "Treino geral",

        });



        if (supabaseError) {

          setError(supabaseError.message);

          return false;

        }



        sessionTopWeightRef.current = Math.max(sessionTopWeightRef.current, topWeight);

        onWeightSaved?.(topWeight);

        onVolumeCommitted?.(topWeight);

        onPersistSuccess?.({ vtcGenerated: Number(data.vtc_gerado ?? 0) });



        if (data?.status === "SUPERAÇÃO") {

          onSuperacao?.({

            weight: topWeight,

            series,

            vtc: data.vtc_gerado ?? topWeight,

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

      prescribedSeries,

      onPersistSuccess,

      onSuperacao,

      onVolumeCommitted,

      onWeightSaved,

    ],

  );



  const commitTopWeight = useCallback(

    async (rawWeightValue: string) => {
      if (isSeriesComplete || isSaving || savingRef.current) return;



      const parsedWeight = parseTopWeight(rawWeightValue);

      if (parsedWeight === null) {

        if (rawWeightValue.trim() !== "") {

          setError("Informe uma carga válida em kg.");

        }

        return;

      }



      if (parsedWeight <= 0 || parsedWeight < ARGOS_WEIGHT_MIN || parsedWeight > ARGOS_WEIGHT_MAX) {

        setError(`Carga entre ${ARGOS_WEIGHT_MIN} e ${ARGOS_WEIGHT_MAX} kg.`);

        return;

      }



      setError(null);



      const isNewPeak = parsedWeight > sessionTopWeightRef.current;

      if (isNewPeak) {

        pulseInput();

      }



      const saved = await persistTopWeight(parsedWeight);

      if (saved && isNewPeak) {

        setWeight(String(parsedWeight));

      }

    },

    [isSeriesComplete, isSaving, persistTopWeight, pulseInput],

  );



  const handleFieldBlur = (event: FocusEvent<HTMLInputElement>) => {

    void commitTopWeight(event.target.value);

  };



  const disabled = !userId || userId === "undefined";

  const inputLocked = disabled || isSeriesComplete;

  const useBrasaoBorder = (isExerciseActive || isFocused || inputPulse) && !isSeriesComplete;

  const fieldTone = error ? PHOENIX_INPUT_SURFACE.fieldError : "";

  const inputClass = [

    PHOENIX_INPUT_SURFACE.field,

    useBrasaoBorder ? PHOENIX_INPUT_SURFACE.fieldBrasao : "",

    fieldTone,

  ]

    .filter(Boolean)

    .join(" ");



  const registerButtonClass = isExerciseActive

    ? PHOENIX_REGISTER_CARGA_ACTIVE

    : PHOENIX_REGISTER_CARGA_IDLE;

  const metaClass = isSeriesComplete ? PHOENIX_INPUT_META_COMPLETE : PHOENIX_INPUT_SURFACE.meta;



  return (

    <div className={PHOENIX_INPUT_SURFACE.wrapper}>

      <p className={`max-w-full text-center ${metaClass}`}>{trainingGoalText}</p>



      <label className={`flex w-full flex-col items-center gap-2 text-center ${PHOENIX_INPUT_SURFACE.label}`}>

        Carga Máxima

        <div className={useBrasaoBorder ? PHOENIX_INPUT_BRASAO_SHELL : "w-full"}>

          <input

            id={weightFieldId}

            type="number"

            inputMode="decimal"

            step={ARGOS_WEIGHT_STEP}

            min={ARGOS_WEIGHT_MIN}

            max={ARGOS_WEIGHT_MAX}

            value={weight}

            onChange={(event) => setWeight(event.target.value)}

            onFocus={() => setIsFocused(true)}

            onBlur={(event) => {

              setIsFocused(false);

              handleFieldBlur(event);

            }}

            placeholder="00.0"

            disabled={inputLocked}

            readOnly={isSeriesComplete}

            className={inputClass}

            aria-describedby={`${fieldIdPrefix}phoenix-hint`}

          />

        </div>

      </label>



      <p id={`${fieldIdPrefix}phoenix-hint`} className={PHOENIX_INPUT_SURFACE.hint}>
        {isSeriesComplete ? PHOENIX_INPUT_HINT_COMPLETE : "Informe a carga máxima da sessão em kg"}
      </p>

      {!isSeriesComplete ? (
        <button
          type="button"
          onClick={() => void commitTopWeight(weight)}
          disabled={disabled || isSaving}
          className={registerButtonClass}
        >
          Registrar carga
        </button>
      ) : null}



      <div className="flex min-h-8 flex-col items-center gap-1">

        {isSaving ? (

          <span className={PHOENIX_INPUT_SURFACE.saving}>Sincronizando...</span>

        ) : null}

        {error ? <span className="max-w-xs text-center text-[11px] text-red-300">{error}</span> : null}

      </div>

    </div>

  );

}



export default memo(PhoenixInput);

