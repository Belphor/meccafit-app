/** Textos do mural — substitui copy legada gerada pela RPC antiga. */

const LEGACY_MURAL_BODY =
  "Superação registrada no Fórum Brasa-Viva — volume validado por ARGOS.";

export function muralBodyForExercise(exerciseName: string, weightKg?: number): string {
  const nome = exerciseName.trim() || "treino";
  if (weightKg && weightKg > 0) {
    const kg = weightKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    return `Novo recorde no ${nome} com ${kg} kg — a linhagem acompanha cada ascensão.`;
  }
  return `Bateu o recorde pessoal no ${nome} — cada vitória aquece a chama da comunidade.`;
}

export function resolveMuralTopicBody(
  body: string | undefined,
  exerciseTitle: string,
  weightKg?: number,
): string {
  const trimmed = body?.trim() ?? "";
  if (!trimmed || trimmed === LEGACY_MURAL_BODY || trimmed.toLowerCase().includes("validado por argos")) {
    return muralBodyForExercise(exerciseTitle, weightKg);
  }
  return trimmed;
}
