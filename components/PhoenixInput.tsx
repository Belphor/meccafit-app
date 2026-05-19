"use client";

import { memo, useState, useRef, useCallback, useEffect, type FocusEvent } from "react";
import { registrarTreinoComStatus } from "@/lib/supabase";

const EXERCICIO_ID_GERAL = "geral";
const WEIGHT_LIMITS = { MIN: 20, MAX: 500, STEP: 0.1 } as const;
const FIRE_MS = 4000;

export interface PhoenixInputProps {
  userId: string | null | undefined;
  initialWeight?: number;
  initialSeries?: number;
  onWeightSaved?: (weight: number) => void;
  onVolumeCommitted?: (volume: number) => void;
}

function parseTrainingValues(weightValue: string, seriesValue: string) {
  const parsedWeight = parseFloat(weightValue);
  const parsedSeries = Number.parseInt(seriesValue, 10);

  if (weightValue === "" || seriesValue === "" || Number.isNaN(parsedWeight) || Number.isNaN(parsedSeries)) {
    return null;
  }

  return { parsedWeight, parsedSeries };
}

function PhoenixInput({
  userId,
  initialWeight = 0,
  initialSeries = 3,
  onWeightSaved,
  onVolumeCommitted,
}: PhoenixInputProps) {
  const [weight, setWeight] = useState("");
  const [series, setSeries] = useState(String(initialSeries));
  const [isSaving, setIsSaving] = useState(false);
  const [showFire, setShowFire] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bestWeightRef = useRef(initialWeight);
  const fireHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const weightRef = useRef(weight);
  const seriesRef = useRef(series);

  weightRef.current = weight;
  seriesRef.current = series;

  useEffect(() => {
    if (initialWeight > 0) {
      setWeight(String(initialWeight));
      bestWeightRef.current = initialWeight;
    }
  }, [initialWeight]);

  useEffect(() => {
    if (initialSeries > 0) {
      setSeries(String(initialSeries));
    }
  }, [initialSeries]);

  const clearFireTimer = useCallback(() => {
    if (fireHideTimerRef.current) {
      clearTimeout(fireHideTimerRef.current);
      fireHideTimerRef.current = null;
    }
  }, []);

  const showSuperacao = useCallback(() => {
    clearFireTimer();
    setShowFire(true);
    fireHideTimerRef.current = setTimeout(() => setShowFire(false), FIRE_MS);
  }, [clearFireTimer]);

  useEffect(() => () => clearFireTimer(), [clearFireTimer]);

  const persistTraining = useCallback(
    async (parsedWeight: number, parsedSeries: number) => {
      const uid = String(userId || "").trim();
      if (!uid || uid === "undefined" || uid === "null" || uid.length < 20) {
        setError("Sessão inválida. Faça login novamente.");
        return;
      }

      setError(null);
      setIsSaving(true);

      try {
        const { data, error: supabaseError } = await registrarTreinoComStatus({
          clienteId: uid,
          exercicioId: EXERCICIO_ID_GERAL,
          pesoAtual: parsedWeight,
          series: parsedSeries,
          repeticoes: 1,
        });

        if (supabaseError) {
          setError(supabaseError.message);
          return;
        }

        const maxAtual = Number(data.max_peso_atual ?? data.peso_atual ?? parsedWeight);
        bestWeightRef.current = Math.max(bestWeightRef.current, maxAtual);

        if (data.status === "SUPERAÇÃO") {
          showSuperacao();
        }

        onWeightSaved?.(parsedWeight);
      } catch {
        setError("Erro de rede ao conectar com o servidor.");
      } finally {
        setIsSaving(false);
      }
    },
    [userId, onWeightSaved, showSuperacao],
  );

  const commitVolumeOnBlur = useCallback(async () => {
    const parsed = parseTrainingValues(weightRef.current, seriesRef.current);
    if (!parsed) return;

    const { parsedWeight, parsedSeries } = parsed;

    if (parsedSeries < 1 || parsedSeries > 20) {
      setError("Séries válidas entre 1 e 20.");
      return;
    }

    if (parsedWeight < WEIGHT_LIMITS.MIN || parsedWeight > WEIGHT_LIMITS.MAX) {
      setError(`Carga válida entre ${WEIGHT_LIMITS.MIN} e ${WEIGHT_LIMITS.MAX}kg.`);
      return;
    }

    setError(null);
    onVolumeCommitted?.(parsedWeight * parsedSeries);
    await persistTraining(parsedWeight, parsedSeries);
  }, [onVolumeCommitted, persistTraining]);

  const handleFieldBlur = (_event: FocusEvent<HTMLInputElement>) => {
    window.setTimeout(() => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement) {
        const fieldIds = ["phoenix-weight", "phoenix-series"];
        if (fieldIds.includes(active.id)) return;
      }
      void commitVolumeOnBlur();
    }, 0);
  };

  const disabled = !userId || userId === "undefined";
  const borderTone = error ? "border-red-500/60" : showFire ? "border-[#ffbf00]" : "border-[#ffbf00]/25";
  const inputClass = `w-full rounded-2xl border bg-[#0a0a0a]/80 px-4 py-4 text-center text-lg text-[#fff5a0] outline-none transition duration-300 placeholder:text-amber-900/60 focus:border-[#ffbf00]/55 focus:shadow-[0_0_24px_rgba(255,191,0,0.18)] disabled:cursor-not-allowed disabled:opacity-50 will-change-[box-shadow,border-color] ${borderTone}`;

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#ffbf00]">Phoenix Protocol</p>
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#e25822]/80">
        Carga {WEIGHT_LIMITS.MIN}kg – {WEIGHT_LIMITS.MAX}kg · VTC no blur
      </p>

      <div className="relative grid w-full grid-cols-2 gap-3">
        {showFire ? (
          <p className="absolute -top-10 left-1/2 -translate-x-1/2 text-xs font-black uppercase tracking-[0.35em] text-[#ff8c00] drop-shadow-[0_0_12px_rgba(255,191,0,0.55)]">
            Superação
          </p>
        ) : null}

        <label className="flex flex-col gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[#ffd700]/80">
          Carga
          <input
            id="phoenix-weight"
            type="number"
            step={WEIGHT_LIMITS.STEP}
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            onBlur={handleFieldBlur}
            placeholder="00.0"
            disabled={disabled}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[#ffd700]/80">
          Séries
          <input
            id="phoenix-series"
            type="number"
            min={1}
            max={20}
            step={1}
            value={series}
            onChange={(event) => setSeries(event.target.value)}
            onBlur={handleFieldBlur}
            disabled={disabled}
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex min-h-8 flex-col items-center gap-1">
        {isSaving ? (
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ffbf00]/70">Sincronizando...</span>
        ) : null}
        {error ? <span className="max-w-xs text-center text-[11px] text-red-300">{error}</span> : null}
        {showFire ? (
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#ff8c00]">Novo recorde</span>
        ) : null}
      </div>
    </div>
  );
}

export default memo(PhoenixInput);
