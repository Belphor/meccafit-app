import type { Enums } from "@/types/database.types";
import type { Exercise } from "@/lib/mock-data-types";
import { resolveExerciseReferenceWeight } from "@/lib/mock-data";

export type ExerciseMetricKind = "load_kg" | "rep_max" | "duration_sec";

export const ARGOS_REP_MIN = 1;
export const ARGOS_REP_MAX = 999;

export const ARGOS_DURATION_SEC_MIN = 5;
export const ARGOS_DURATION_SEC_MAX = 600;

/**
 * EMG / time-under-tension (rectus abdominis):
 * ~4 s de prancha isométrica ≈ 1 rep dinâmica de abdômen em carga térmica equivalente.
 * Referência: Schoenfeld (TUT); McGill (endurance isométrica em segundos).
 */
export const ABDOMEN_ISOMETRIC_SEC_PER_REP_EQUIV = 4;

/** @deprecated Preferir `metricKind` por exercício. */
export function isRepBasedMuscle(musculo: Enums<"subgrupo_muscular">): boolean {
  return musculo === "abdomen";
}

export function resolveMetricKind(input: {
  metricKind?: ExerciseMetricKind;
  musculo?: Enums<"subgrupo_muscular">;
  exercicioId?: number;
}): ExerciseMetricKind {
  if (input.metricKind) return input.metricKind;
  if (input.musculo === "abdomen") {
    if (input.exercicioId === 11) return "duration_sec";
    return "rep_max";
  }
  return "load_kg";
}

/** Apenas cargas em kg entram no VTC diário (kg treinados). Tempo e rep-max ficam fora. */
export function contributesToSessionVtcKg(metricKind: ExerciseMetricKind): boolean {
  return metricKind === "load_kg";
}

export function resolveSessionVtcContribution(
  metricKind: ExerciseMetricKind,
  metricValue: number,
): number {
  if (!contributesToSessionVtcKg(metricKind) || metricValue <= 0) return 0;
  return metricValue;
}

export function parseRepValue(raw: string): number | null {
  const parsed = Number.parseInt(raw.trim(), 10);
  if (raw.trim() === "" || Number.isNaN(parsed)) return null;
  return parsed;
}

export function isValidRepValue(value: number): boolean {
  return Number.isFinite(value) && value >= ARGOS_REP_MIN && value <= ARGOS_REP_MAX;
}

export function parseDurationParts(minutesRaw: string, secondsRaw: string): number | null {
  const minutes = minutesRaw.trim() === "" ? 0 : Number.parseInt(minutesRaw.trim(), 10);
  const seconds = secondsRaw.trim() === "" ? 0 : Number.parseInt(secondsRaw.trim(), 10);
  if (Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
  if (minutes < 0 || seconds < 0 || seconds > 59) return null;
  const total = minutes * 60 + seconds;
  if (total <= 0) return null;
  return total;
}

export function splitDurationSeconds(totalSeconds: number): { minutes: number; seconds: number } {
  const sec = Math.max(0, Math.round(totalSeconds));
  return { minutes: Math.floor(sec / 60), seconds: sec % 60 };
}

export function formatDuration(totalSeconds: number): string {
  const { minutes, seconds } = splitDurationSeconds(totalSeconds);
  if (minutes <= 0) return `${seconds} s`;
  if (seconds <= 0) return `${minutes} min`;
  return `${minutes} min ${seconds} s`;
}

export function isValidDurationSeconds(value: number): boolean {
  return Number.isFinite(value) && value >= ARGOS_DURATION_SEC_MIN && value <= ARGOS_DURATION_SEC_MAX;
}

/** Unidades térmicas (TLU) para evolução/altar — converte segundos isométricos em rep-equivalentes. */
export function resolveAbdomenThermalUnits(metricKind: ExerciseMetricKind, prValue: number): number {
  if (metricKind === "duration_sec") {
    return prValue / ABDOMEN_ISOMETRIC_SEC_PER_REP_EQUIV;
  }
  if (metricKind === "rep_max") return prValue;
  return prValue;
}

export function resolveAltarContribution(metricKind: ExerciseMetricKind, prValue: number): number {
  switch (metricKind) {
    case "load_kg":
      return prValue;
    case "rep_max":
      return prValue;
    case "duration_sec":
      return resolveAbdomenThermalUnits("duration_sec", prValue);
    default:
      return prValue;
  }
}

export function formatExerciseReferenceMetric(
  exercise: Pick<Exercise, "id" | "currentWeight" | "historicalPrWeight" | "metricKind">,
  metricKind: ExerciseMetricKind = exercise.metricKind ?? "load_kg",
): string {
  const value = resolveExerciseReferenceWeight(exercise);
  if (value <= 0) return "Sem registro";

  switch (metricKind) {
    case "rep_max":
      return `${Math.round(value).toLocaleString("pt-BR")} rep`;
    case "duration_sec":
      return formatDuration(value);
    default:
      return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
  }
}

export function formatSessionMetricLabel(metricKind: ExerciseMetricKind, value: number): string {
  const formatted = value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  switch (metricKind) {
    case "rep_max":
      return `Rep ${formatted}`;
    case "duration_sec":
      return `Tempo ${formatDuration(value)}`;
    default:
      return `VTC ${formatted}`;
  }
}

/**
 * Mapeia PR da sessão para a RPC `registrar_treino_com_status`.
 * `peso_atual` = PR bruto (kg · rep · seg); `repeticoes` = 1 evita VTC inflado.
 */
export function resolveTreinoPersistPayload(input: {
  metricKind?: ExerciseMetricKind;
  musculo?: Enums<"subgrupo_muscular">;
  exercicioId?: number;
  metricValue: number;
  prescribedSeries: number;
}): { pesoAtual: number; repeticoes: number; series: number } {
  const series = Math.max(1, input.prescribedSeries);
  const kind = resolveMetricKind(input);

  if (kind === "load_kg") {
    return {
      pesoAtual: input.metricValue,
      repeticoes: 1,
      series,
    };
  }

  const pr = Math.round(input.metricValue);
  return {
    pesoAtual: pr,
    repeticoes: 1,
    series,
  };
}
