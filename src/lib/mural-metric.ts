import { formatDuration } from "@/lib/training-metric";

const PLANK_EXERCISE_ID = 11;

export function isIsometricMuralExercise(
  exerciseName: string,
  exercicioId?: number | null,
): boolean {
  if (exercicioId === PLANK_EXERCISE_ID) return true;

  const normalized = exerciseName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  return normalized.includes("prancha") || normalized.includes("isom");
}

export function isRepMaxMuralExercise(
  exerciseName: string,
  exercicioId?: number | null,
): boolean {
  if (exercicioId === 10) return true;

  const normalized = exerciseName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  return (
    normalized.includes("abdominal") ||
    normalized.includes("crunch") ||
    normalized.includes("rep max")
  );
}

/** Texto curto para badge do mural (tempo, rep ou kg). */
export function formatMuralMetricBadge(
  exerciseName: string,
  metricValue: number,
  series: number,
  exercicioId?: number | null,
): string {
  const safeSeries = Math.max(1, series);

  if (isIsometricMuralExercise(exerciseName, exercicioId)) {
    return `${formatDuration(metricValue)} · ${safeSeries} ${safeSeries === 1 ? "série" : "séries"}`;
  }

  if (isRepMaxMuralExercise(exerciseName, exercicioId)) {
    return `${Math.round(metricValue).toLocaleString("pt-BR")} rep · ${safeSeries} ${safeSeries === 1 ? "série" : "séries"}`;
  }

  const kg = metricValue.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${kg} kg · ${safeSeries} ${safeSeries === 1 ? "série" : "séries"}`;
}

/** Frase do corpo do card de superação. */
export function formatMuralMetricSentence(
  exerciseName: string,
  metricValue: number,
  exercicioId?: number | null,
): string {
  const nome = exerciseName.trim() || "treino";

  if (isIsometricMuralExercise(exerciseName, exercicioId)) {
    return `Novo recorde no ${nome} com ${formatDuration(metricValue)}. A linhagem acompanha cada ascensão.`;
  }

  if (isRepMaxMuralExercise(exerciseName, exercicioId)) {
    return `Novo recorde no ${nome} com ${Math.round(metricValue).toLocaleString("pt-BR")} repetições. A linhagem acompanha cada ascensão.`;
  }

  const kg = metricValue.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `Novo recorde no ${nome} com ${kg} kg. A linhagem acompanha cada ascensão.`;
}
