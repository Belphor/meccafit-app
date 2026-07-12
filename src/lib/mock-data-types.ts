import type {
  PrescriptionProgressionId,
  PrescriptionRepValue,
} from "@/lib/prescription-progression";

export type ExerciseMetricKind = "load_kg" | "rep_max" | "duration_sec";

export interface Exercise {
  id: number;
  name: string;
  metricKind: ExerciseMetricKind;
  targetSets: number;
  targetReps: number;
  /** Repetições por série definidas pelo forjador (ex.: 12, 10, FALHA). */
  repsPerSet?: PrescriptionRepValue[];
  /** Alternativas de progressão sem carga. */
  progressionAlternatives?: PrescriptionProgressionId[];
  /** Prescrição em segundos (isométricos). */
  targetDurationSec?: number;
  /** PR da sessão — kg, rep ou seg conforme `metricKind`. */
  currentWeight: number;
  /** PR persistido no Supabase — prioridade sobre mock local. */
  historicalPrWeight?: number;
  /** Já registrou carga neste exercício no dia civil atual (SP). */
  registeredToday?: boolean;
  completedSets: number;
  video_url: string;
  subgroupId: string;
}

export type BodyRegionSubtitle = "Membro Superior" | "Membro Inferior" | "Core";

export type MuscleSubgroup = {
  id: string;
  slug: string;
  numericRouteId: number;
  /** Nome técnico do subgrupo (ex.: Peitoral Superior). */
  name: string;
  /** Título principal exibido no altar (ex.: Peito). */
  monumentalTitle: string;
  /** Subtítulo — região corporal: Membro Superior, Membro Inferior ou Core. */
  bodyRegionSubtitle: BodyRegionSubtitle;
  exercises: Exercise[];
};

export interface ClientProfile {
  name: string;
  lineage: string;
  status: string;
  birth: string;
  age: number;
  role?: "forjador" | "forjador_linhagem" | "forjador_soberano" | "cliente";
  /** Penalidade suprema — exílio das chamas (workspace bloqueado). */
  is_punished?: boolean;
}

export type MuralPost = {
  id: string;
  exerciseName: string;
  exercicioId?: number | null;
  weight: number;
  series: number;
  createdAt: string;
  athleteId?: string;
  athleteAvatarPath?: string | null;
  athleteName?: string;
  lineageName?: string;
  temCinturaoDuelo?: boolean;
  isReiDasChamas?: boolean;
  isPilarCooperativo?: boolean;
  shareImageUrl?: string;
};

/** Personal Record (PR) — métrica máxima histórica por exercício (kg · rep · seg). */
export type ExercisePersonalRecord = {
  exerciseId: number;
  topMetric: number;
  achievedAt: string;
};
