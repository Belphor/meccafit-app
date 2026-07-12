import { ANYMA_VTC_PHRASE, ANYMA_VTC_SPOKEN } from "@/lib/anyma-copy";
import { injectName } from "@/lib/profile-display-name";

/**
 * Fonética em inglês da marca FENYXIA para TTS pt-BR.
 * A UI continua exibindo FENYXIA. Só a voz usa esta forma.
 */
export const FENYXIA_TTS_PHONETIC = "Fenicksia";

/**
 * Fonética em inglês de RANKINGS para TTS pt-BR.
 * A UI pode exibir Rankings ou RANKINGS. A voz sempre soa em inglês.
 */
export const RANKINGS_TTS_PHONETIC = "Rénquings";

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
 * Normaliza copy da ANYMA FÊNIX para leitura na UI.
 * Travessões (—, –) e hífens duplos viram vírgula ou ponto.
 * Dois-pontos e ponto-e-vírgula viram pausa com frase bem formada.
 * Sigla VTC isolada vira Volume Total De Carga (VTC) no texto escrito.
 */
export function formatAnymaSpeech(text: string): string {
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

/**
 * Prepara texto já normalizado para síntese de voz.
 * Mantém FENYXIA e (VTC) na UI, mas a fala usa fonética em inglês e
 * pronuncia só "Volume Total De Carga", sem a sigla VTC.
 */
export function prepareAnymaSpeechForTts(text: string): string {
  return text
    .replace(/\bFENYXIA\b/gi, FENYXIA_TTS_PHONETIC)
    .replace(/\bRANKINGS\b/gi, RANKINGS_TTS_PHONETIC)
    .replace(/\bVolume Total De Carga\s*\(\s*VTC\s*\)/gi, ANYMA_VTC_SPOKEN)
    .replace(/\bVolume de Carga Máxima\s*\(\s*VTC\s*\)/gi, "Volume de Carga Máxima")
    .replace(/\(\s*VTC\s*\)/gi, "")
    .replace(/\bVTC\b/g, ANYMA_VTC_SPOKEN)
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}

/**
 * Texto canônico para card e voz: injeta o nome (ou Nova Chama) e normaliza a fala.
 */
export function resolveAnymaSpeechText(speech: string, profileName: string): string {
  return formatAnymaSpeech(injectName(speech, profileName));
}

/** @deprecated Use formatAnymaSpeech — marca canônica é ANYMA. */
export const formatAnimaSpeech = formatAnymaSpeech;
