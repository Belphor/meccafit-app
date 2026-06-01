export const ABDOMEN_ISOMETRIC_SEC_PER_REP_EQUIV = 4;

export const ARGOS_DURATION_SEC_MIN = 5;
export const ARGOS_DURATION_SEC_MAX = 600;

export function resolveMetricKind({ metricKind, musculo, exercicioId }) {
  if (metricKind) return metricKind;
  if (musculo === "abdomen") {
    if (exercicioId === 11) return "duration_sec";
    return "rep_max";
  }
  return "load_kg";
}

export function resolveTreinoPersistPayload({
  metricKind,
  musculo,
  exercicioId,
  metricValue,
  prescribedSeries,
}) {
  const series = Math.max(1, prescribedSeries);
  const kind = resolveMetricKind({ metricKind, musculo, exercicioId });

  if (kind === "load_kg") {
    return { pesoAtual: metricValue, repeticoes: 1, series };
  }

  const pr = Math.round(metricValue);
  return { pesoAtual: pr, repeticoes: 1, series };
}

export function formatSeedMetricLabel(exercise) {
  const kind = resolveMetricKind({
    metricKind: exercise.metricKind,
    musculo: exercise.musculo,
    exercicioId: exercise.id,
  });
  const value = exercise.seedMetric;
  if (kind === "duration_sec") {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    if (minutes <= 0) return `${seconds} s`;
    if (seconds <= 0) return `${minutes} min`;
    return `${minutes} min ${seconds} s`;
  }
  if (kind === "rep_max") return `${value} rep`;
  return `${value} kg`;
}
