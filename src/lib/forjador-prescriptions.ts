import type { MuscleSubgroup } from "@/lib/mock-data";
import { applyPrescriptionRowToSubgroup } from "@/lib/forja-exercise-resolve";
import { supabase } from "@/lib/supabase";
import {
  parseProgressionAlternatives,
  parseRepsPerSet,
  type PrescriptionProgressionId,
  type PrescriptionRepValue,
} from "@/lib/prescription-progression";
import type { TrainingMuscleGroup, WeekdayIndex } from "@/lib/training-week";

export type ForjadorTreinoConfig = {
  descansoPadraoSeg: number;
  cardioMetaMinutos: number;
  forjadorId: string | null;
};

export type ForjadorPrescriptionRow = {
  id: string;
  atleta_id: string;
  forjador_id: string;
  dia_semana: WeekdayIndex;
  grupo_muscular: TrainingMuscleGroup;
  exercicio_id: string;
  ordem: number;
  series_alvo: number;
  repeticoes_alvo: number;
  peso_prescrito: number | null;
  descanso_segundos: number | null;
  progressao_alternativas: PrescriptionProgressionId[];
  repeticoes_por_serie: PrescriptionRepValue[];
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
  const allowed = new Set(["PEITO", "COSTAS", "PERNAS", "OMBROS", "BRACOS", "ABDOMEN"]);

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
    const diaRaw = Number(row.dia_semana);
    const diaSemana =
      Number.isFinite(diaRaw) && diaRaw >= 1 && diaRaw <= 6
        ? (diaRaw as WeekdayIndex)
        : (1 as WeekdayIndex);

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

    const repeticoesPorSerie = parseRepsPerSet(row.repeticoes_por_serie);
    const resolvedRepsPerSet =
      repeticoesPorSerie.length > 0
        ? repeticoesPorSerie
        : Array.from({ length: series }, () => reps);

    return [
      {
        id: row.id,
        atleta_id: String(row.atleta_id ?? ""),
        forjador_id: String(row.forjador_id ?? ""),
        dia_semana: diaSemana,
        grupo_muscular: grupo as TrainingMuscleGroup,
        exercicio_id: row.exercicio_id.trim(),
        ordem: Number.isFinite(ordem) && ordem >= 1 ? ordem : 1,
        series_alvo: series,
        repeticoes_alvo: reps,
        peso_prescrito: peso,
        descanso_segundos: descanso,
        progressao_alternativas: parseProgressionAlternatives(row.progressao_alternativas),
        repeticoes_por_serie: resolvedRepsPerSet,
        observacoes: typeof row.observacoes === "string" ? row.observacoes : null,
      },
    ];
  });
}

export function resolvePrescriptionsForMuscle(
  prescriptions: ForjadorPrescriptionRow[],
  muscle: TrainingMuscleGroup,
  trainingDay?: WeekdayIndex,
): ForjadorPrescriptionRow[] {
  return prescriptions
    .filter((row) => {
      if (row.grupo_muscular !== muscle) return false;
      if (trainingDay === undefined) return true;
      return row.dia_semana === trainingDay;
    })
    .sort((a, b) => a.ordem - b.ordem || a.exercicio_id.localeCompare(b.exercicio_id));
}

export function resolveExerciseRestSeconds(
  exerciseId: number,
  prescriptions: ForjadorPrescriptionRow[],
  muscle: TrainingMuscleGroup,
  config: ForjadorTreinoConfig,
  trainingDay?: WeekdayIndex,
): number {
  const match = resolvePrescriptionsForMuscle(prescriptions, muscle, trainingDay).find(
    (row) => row.exercicio_id === String(exerciseId),
  );

  if (match?.descanso_segundos && match.descanso_segundos >= 15) {
    return match.descanso_segundos;
  }

  return config.descansoPadraoSeg;
}

export function applyForjadorPrescriptionsToSubgroup(
  subgroup: MuscleSubgroup,
  muscle: TrainingMuscleGroup,
  prescriptions: ForjadorPrescriptionRow[],
  trainingDay?: WeekdayIndex,
): MuscleSubgroup {
  const scoped = resolvePrescriptionsForMuscle(prescriptions, muscle, trainingDay);
  if (scoped.length === 0) return subgroup;

  const exercises = scoped.map((row) => applyPrescriptionRowToSubgroup(subgroup, row));
  const seen = new Set<number>();

  const merged = exercises.filter((exercise) => {
    if (seen.has(exercise.id)) return false;
    seen.add(exercise.id);
    return true;
  });

  if (merged.length === 0) return subgroup;

  return { ...subgroup, exercises: merged };
}

export async function fetchForjadorTreinoConfigClient(
  userId: string,
): Promise<ForjadorTreinoConfig> {
  const { data, error } = await supabase
    .from("config_treino_atleta")
    .select("forjador_id, descanso_padrao_seg, cardio_meta_minutos")
    .eq("atleta_id", userId)
    .maybeSingle();

  if (error || !data) return DEFAULT_FORJADOR_TREINO_CONFIG;
  return parseForjadorTreinoConfig(data as Record<string, unknown>);
}

export async function fetchForjadorPrescriptionsClient(
  userId: string,
): Promise<ForjadorPrescriptionRow[]> {
  const { data, error } = await supabase
    .from("prescricoes_treino_forjador")
    .select(
      "id, atleta_id, forjador_id, dia_semana, grupo_muscular, exercicio_id, ordem, series_alvo, repeticoes_alvo, peso_prescrito, descanso_segundos, progressao_alternativas, repeticoes_por_serie, observacoes",
    )
    .eq("atleta_id", userId)
    .order("dia_semana")
    .order("grupo_muscular")
    .order("ordem");

  if (error || !data) return [];
  return parseForjadorPrescriptionRows(data);
}

export function resolveMusclesForTrainingDay(
  prescriptions: ForjadorPrescriptionRow[],
  trainingDay: WeekdayIndex,
  scheduleMuscles: TrainingMuscleGroup[] = [],
): TrainingMuscleGroup[] {
  const fromSchedule = scheduleMuscles.filter(Boolean);
  const fromPrescriptions = prescriptions
    .filter((row) => row.dia_semana === trainingDay)
    .map((row) => row.grupo_muscular);

  const merged = new Set<TrainingMuscleGroup>([...fromSchedule, ...fromPrescriptions]);
  return [...merged];
}

export function hasForjadorPrescriptionForMuscle(
  prescriptions: ForjadorPrescriptionRow[],
  muscle: TrainingMuscleGroup,
  trainingDay?: WeekdayIndex,
): boolean {
  return resolvePrescriptionsForMuscle(prescriptions, muscle, trainingDay).length > 0;
}

export function hasForjadorPrescriptionForDay(
  prescriptions: ForjadorPrescriptionRow[],
  dayMuscles: TrainingMuscleGroup[],
  trainingDay: WeekdayIndex,
): boolean {
  return dayMuscles.some((muscle) => hasForjadorPrescriptionForMuscle(prescriptions, muscle, trainingDay));
}
