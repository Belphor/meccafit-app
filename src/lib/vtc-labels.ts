/**
 * Rótulos oficiais do Volume de Carga Máxima (VTC) · textos ao cliente
 */

export const VTC_DISPLAY_NAME = "Volume de Carga Máxima(VTC)";

export const VTC_DEFINITION =
  "Volume de Carga Máxima(VTC) é a carga máxima validada em quilogramas por exercício. Registramos apenas o pico de cada movimento, sem multiplicar repetições ou séries.";

export const EVOLUTION_AVATAR_NOTE =
  "O anel reflete a fase da sua linhagem conforme a Chama Acumulada dos últimos 30 dias de treino.";

export const THERMAL_LEVEL_NAMES = [
  "Cinzas",
  "Faísca",
  "Brasa",
  "Labareda",
  "Fogo Cósmico",
] as const;

/** Ex.: "160 kg de Volume de Carga Máxima (VTC)" */
export function formatVtcKg(value: number): string {
  return `${Math.round(value).toLocaleString("pt-BR")} kg de ${VTC_DISPLAY_NAME}`;
}
