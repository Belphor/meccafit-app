/** Textos do mural — substitui copy legada gerada pela RPC antiga. */

import {
  formatMuralMetricSentence,
} from "@/lib/mural-metric";

const LEGACY_MURAL_BODY =
  "Superação registrada no Fórum Brasa-Viva — volume validado por ARGOS.";

export function muralBodyForExercise(
  exerciseName: string,
  weightKg?: number,
  exercicioId?: number | null,
): string {
  if (weightKg && weightKg > 0) {
    return formatMuralMetricSentence(exerciseName, weightKg, exercicioId);
  }
  const nome = exerciseName.trim() || "treino";
  return `Bateu o recorde pessoal no ${nome} — cada vitória aquece a chama da comunidade.`;
}

export function resolveMuralTopicBody(
  body: string | undefined,
  exerciseTitle: string,
  weightKg?: number,
  exercicioId?: number | null,
): string {
  const trimmed = body?.trim() ?? "";
  if (!trimmed || trimmed === LEGACY_MURAL_BODY || trimmed.toLowerCase().includes("validado por argos")) {
    return muralBodyForExercise(exerciseTitle, weightKg, exercicioId);
  }
  return trimmed;
}
