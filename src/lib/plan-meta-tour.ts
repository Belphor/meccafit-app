/** Evento disparado quando a meta de treino é sincronizada no mês civil atual. */
export const PLAN_META_SYNCED_EVENT = "meccafit:plan-meta-synced";

export function publishPlanMetaSynced(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PLAN_META_SYNCED_EVENT));
}

export function readPlanMetaSyncedFromDom(): boolean {
  if (typeof document === "undefined") return false;
  const node = document.querySelector('[data-tour-target="evolucao-meta"]');
  return node?.getAttribute("data-meta-synced") === "true";
}
