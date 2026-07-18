/** Evento disparado quando a meta de treino é sincronizada no mês civil atual. */
export const PLAN_META_SYNCED_EVENT = "meccafit:plan-meta-synced";

/** Pedido da apresentação (tour) para acionar o botão Sincronizar meta. */
export const PLAN_META_SYNC_REQUEST_EVENT = "meccafit:plan-meta-sync-request";

export function publishPlanMetaSynced(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PLAN_META_SYNCED_EVENT));
}

export function requestPlanMetaSync(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PLAN_META_SYNC_REQUEST_EVENT));
}

export function readPlanMetaSyncedFromDom(): boolean {
  if (typeof document === "undefined") return false;
  const node = document.querySelector('[data-tour-target="evolucao-meta"]');
  return node?.getAttribute("data-meta-synced") === "true";
}
