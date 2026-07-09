import { ANYMA_VTC_PHRASE } from "@/lib/anyma-copy";

function capitalizeFirstLetter(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeSentenceCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const capitalized = trimmed.replace(
    /([.!?])\s+([a-záàâãéêíóôõúç])/gi,
    (_, punct: string, letter: string) => `${punct} ${letter.toUpperCase()}`,
  );

  return capitalizeFirstLetter(capitalized);
}

/**
 * Normaliza copy da ANYMA FÊNIX para leitura na UI e TTS.
 * Travessões (—, –) e hífens duplos viram vírgula ou ponto.
 * Dois-pontos e ponto-e-vírgula viram pausa com frase bem formada.
 * Sigla VTC isolada vira Volume Total De Carga (VTC).
 */
export function formatAnimaSpeech(text: string): string {
  const withVtc = text.includes(ANYMA_VTC_PHRASE)
    ? text
    : text.replace(/\bVTC\b/g, ANYMA_VTC_PHRASE);

  const normalized = withVtc
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s+-\s+-/g, ", ")
    .replace(/\s*--+\s*/g, ", ")
    .replace(/:\s*/g, ". ")
    .replace(/;\s*/g, ". ")
    .replace(/\.\.\./g, ". ")
    .replace(/([.!?])\s*,\s*/g, "$1 ")
    .replace(/,\s*,+/g, ", ")
    .replace(/\.\s*\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();

  return normalizeSentenceCase(normalized);
}
