export type ExerciseMetricKind = "load_kg" | "rep_max" | "duration_sec";

export interface Exercise {
  id: number;
  name: string;
  metricKind: ExerciseMetricKind;
  targetSets: number;
  targetReps: number;
  /** Prescrição em segundos (isométricos). */
  targetDurationSec?: number;
  /** PR da sessão — kg, rep ou seg conforme `metricKind`. */
  currentWeight: number;
  /** PR persistido no Supabase — prioridade sobre mock local. */
  historicalPrWeight?: number;
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
}

export type MuralPost = {
  id: string;
  exerciseName: string;
  weight: number;
  series: number;
  createdAt: string;
  athleteName?: string;
  lineageName?: string;
  shareImageUrl?: string;
};

/** Personal Record (PR) — métrica máxima histórica por exercício (kg · rep · seg). */
export type ExercisePersonalRecord = {
  exerciseId: number;
  topMetric: number;
  achievedAt: string;
};
