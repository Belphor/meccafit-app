/** Abre a leitura em tela cheia do Manifesto Primordial. */

export const ALQUIMIA_MANIFESTO_OPEN_EVENT = "meccafit:alquimia-manifesto-open";

export type AlquimiaManifestoOpenDetail = {
  /** Dispara a narração completa da ANYMA ao abrir. Padrão: true. */
  narrate?: boolean;
};

export function openAlquimiaManifesto(detail?: AlquimiaManifestoOpenDetail): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<AlquimiaManifestoOpenDetail>(ALQUIMIA_MANIFESTO_OPEN_EVENT, {
      detail: { narrate: detail?.narrate ?? true },
    }),
  );
}
