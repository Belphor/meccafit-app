import type { MuscleSubgroup } from "@/lib/mock-data";

export type TrainingTrackKind = "common" | "personal";

export type ForgerClientBond = {
  id: string;
  forger_id: string;
  client_id: string;
  created_at: string;
};

export type PersonalPrescriptionRow = {
  id: string;
  client_id: string;
  forger_id: string;
  exercicio_id: string;
  peso_prescrito: number;
  repeticoes_alvo: number;
  series_alvo: number;
  observacoes: string | null;
  criado_em: string;
};

export type TrainingTrackState = {
  track: TrainingTrackKind;
  bond: ForgerClientBond | null;
  personalPrescriptions: PersonalPrescriptionRow[];
};

export const DEFAULT_TRAINING_TRACK: TrainingTrackState = {
  track: "common",
  bond: null,
  personalPrescriptions: [],
};

export function resolveHasPersonalBond(state: TrainingTrackState): boolean {
  return state.track === "personal" && state.bond !== null;
}

export function parseHasPersonalBondFromBundle(
  payload: unknown,
  trainingTrack?: TrainingTrackState,
): boolean {
  if (typeof payload === "boolean") {
    return payload;
  }

  if (trainingTrack) {
    return resolveHasPersonalBond(trainingTrack);
  }

  return false;
}

export function parseTrainingTrackFromBundle(payload: unknown): TrainingTrackState {
  if (!payload || typeof payload !== "object") {
    return DEFAULT_TRAINING_TRACK;
  }

  const raw = payload as {
    track?: unknown;
    bond?: unknown;
    personalPrescriptions?: unknown;
  };

  const track = raw.track === "personal" ? "personal" : "common";
  const bond = parseBond(raw.bond);
  const personalPrescriptions = parsePersonalPrescriptions(raw.personalPrescriptions);

  if (track === "personal" && !bond) {
    return DEFAULT_TRAINING_TRACK;
  }

  return {
    track,
    bond,
    personalPrescriptions,
  };
}

function parseBond(value: unknown): ForgerClientBond | null {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.forger_id !== "string" ||
    typeof row.client_id !== "string" ||
    typeof row.created_at !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    forger_id: row.forger_id,
    client_id: row.client_id,
    created_at: row.created_at,
  };
}

function parsePersonalPrescriptions(value: unknown): PersonalPrescriptionRow[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const row = item as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      typeof row.exercicio_id !== "string" ||
      typeof row.criado_em !== "string"
    ) {
      return [];
    }

    const peso = Number(row.peso_prescrito);
    const reps = Number(row.repeticoes_alvo);
    const series = Number(row.series_alvo);

    if (!Number.isFinite(peso) || !Number.isFinite(reps) || !Number.isFinite(series)) {
      return [];
    }

    return [
      {
        id: row.id,
        client_id: String(row.client_id ?? ""),
        forger_id: String(row.forger_id ?? ""),
        exercicio_id: row.exercicio_id,
        peso_prescrito: peso,
        repeticoes_alvo: reps,
        series_alvo: series,
        observacoes: typeof row.observacoes === "string" ? row.observacoes : null,
        criado_em: row.criado_em,
      },
    ];
  });
}

export function applyPersonalPrescriptionsToSubgroup(
  subgroup: MuscleSubgroup,
  prescriptions: PersonalPrescriptionRow[],
): MuscleSubgroup {
  if (prescriptions.length === 0) return subgroup;

  const byExerciseId = new Map(
    prescriptions.map((item) => [item.exercicio_id.trim(), item] as const),
  );

  return {
    ...subgroup,
    exercises: subgroup.exercises.map((exercise) => {
      const prescription =
        byExerciseId.get(String(exercise.id)) ??
        byExerciseId.get(exercise.id.toString());

      if (!prescription) return exercise;

      return {
        ...exercise,
        currentWeight: prescription.peso_prescrito,
        targetReps: prescription.repeticoes_alvo,
        targetSets: prescription.series_alvo,
      };
    }),
  };
}

export function resolvePrescriptionsForSubgroup(
  subgroup: MuscleSubgroup,
  prescriptions: PersonalPrescriptionRow[],
): PersonalPrescriptionRow[] {
  const exerciseIds = new Set(subgroup.exercises.map((item) => String(item.id)));

  return prescriptions.filter((item) => exerciseIds.has(item.exercicio_id.trim()));
}
