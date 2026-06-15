import type { Exercise, MuscleSubgroup } from "@/lib/mock-data";
import type { ClientTrainingMuscleGroup } from "@/lib/training-week";

export type ForjadorTreinoConfig = {
  descansoPadraoSeg: number;
  cardioMetaMinutos: number;
  forjadorId: string | null;
};

export type ForjadorPrescriptionRow = {
  id: string;
  atleta_id: string;
  forjador_id: string;
  grupo_muscular: ClientTrainingMuscleGroup;
  exercicio_id: string;
  ordem: number;
  series_alvo: number;
  repeticoes_alvo: number;
  peso_prescrito: number | null;
  descanso_segundos: number | null;
  observacoes: string | null;
};

export const DEFAULT_FORJADOR_TREINO_CONFIG: ForjadorTreinoConfig = {
  descansoPadraoSeg: 90,
  cardioMetaMinutos: 30,
  forjadorId: null,
};

export function parseForjadorTreinoConfig(row: Record<string, unknown> | null): ForjadorTreinoConfig {
  if (!row) return DEFAULT_FORJADOR_TREINO_CONFIG;

  const descanso = Number(row.descanso_padrao_seg);
  const cardio = Number(row.cardio_meta_minutos);

  return {
    descansoPadraoSeg:
      Number.isFinite(descanso) && descanso >= 15 && descanso <= 600 ? descanso : 90,
    cardioMetaMinutos:
      Number.isFinite(cardio) && cardio >= 5 && cardio <= 180 ? cardio : 30,
    forjadorId: typeof row.forjador_id === "string" ? row.forjador_id : null,
  };
}

export function parseForjadorPrescriptionRows(rows: unknown[]): ForjadorPrescriptionRow[] {
  const allowed = new Set(["PEITO", "COSTAS", "PERNAS", "OMBROS", "BRACOS"]);

  return rows.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const row = item as Record<string, unknown>;
    const grupo = String(row.grupo_muscular ?? "")
      .trim()
      .toUpperCase();

    if (!allowed.has(grupo)) return [];

    const series = Number(row.series_alvo);
    const reps = Number(row.repeticoes_alvo);
    const ordem = Number(row.ordem);

    if (
      typeof row.id !== "string" ||
      typeof row.exercicio_id !== "string" ||
      !Number.isFinite(series) ||
      !Number.isFinite(reps)
    ) {
      return [];
    }

    const pesoRaw = row.peso_prescrito;
    const peso =
      pesoRaw === null || pesoRaw === undefined
        ? null
        : Number.isFinite(Number(pesoRaw))
          ? Number(pesoRaw)
          : null;

    const descansoRaw = row.descanso_segundos;
    const descanso =
      descansoRaw === null || descansoRaw === undefined
        ? null
        : Number.isFinite(Number(descansoRaw))
          ? Number(descansoRaw)
          : null;

    return [
      {
        id: row.id,
        atleta_id: String(row.atleta_id ?? ""),
        forjador_id: String(row.forjador_id ?? ""),
        grupo_muscular: grupo as ClientTrainingMuscleGroup,
        exercicio_id: row.exercicio_id.trim(),
        ordem: Number.isFinite(ordem) && ordem >= 1 ? ordem : 1,
        series_alvo: series,
        repeticoes_alvo: reps,
        peso_prescrito: peso,
        descanso_segundos: descanso,
        observacoes: typeof row.observacoes === "string" ? row.observacoes : null,
      },
    ];
  });
}

export function resolvePrescriptionsForMuscle(
  prescriptions: ForjadorPrescriptionRow[],
  muscle: ClientTrainingMuscleGroup,
): ForjadorPrescriptionRow[] {
  return prescriptions
    .filter((row) => row.grupo_muscular === muscle)
    .sort((a, b) => a.ordem - b.ordem || a.exercicio_id.localeCompare(b.exercicio_id));
}

export function resolveExerciseRestSeconds(
  exerciseId: number,
  prescriptions: ForjadorPrescriptionRow[],
  muscle: ClientTrainingMuscleGroup,
  config: ForjadorTreinoConfig,
): number {
  const match = resolvePrescriptionsForMuscle(prescriptions, muscle).find(
    (row) => row.exercicio_id === String(exerciseId),
  );

  if (match?.descanso_segundos && match.descanso_segundos >= 15) {
    return match.descanso_segundos;
  }

  return config.descansoPadraoSeg;
}

export function applyForjadorPrescriptionsToSubgroup(
  subgroup: MuscleSubgroup,
  muscle: ClientTrainingMuscleGroup,
  prescriptions: ForjadorPrescriptionRow[],
): MuscleSubgroup {
  const scoped = resolvePrescriptionsForMuscle(prescriptions, muscle);
  if (scoped.length === 0) return subgroup;

  const byCatalogId = new Map(
    subgroup.exercises.map((exercise) => [String(exercise.id), exercise] as const),
  );

  const exercises: Exercise[] = [];

  for (const row of scoped) {
    const base = byCatalogId.get(row.exercicio_id);
    if (!base) continue;

    exercises.push({
      ...base,
      targetSets: row.series_alvo,
      targetReps: row.repeticoes_alvo,
      ...(row.peso_prescrito && row.peso_prescrito > 0
        ? { currentWeight: row.peso_prescrito, historicalPrWeight: row.peso_prescrito }
        : null),
    });
  }

  if (exercises.length === 0) return subgroup;

  return { ...subgroup, exercises };
}

export function hasForjadorPrescriptionForMuscle(
  prescriptions: ForjadorPrescriptionRow[],
  muscle: ClientTrainingMuscleGroup,
): boolean {
  return resolvePrescriptionsForMuscle(prescriptions, muscle).length > 0;
}
