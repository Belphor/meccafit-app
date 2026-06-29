export const DUelo_ARENA_REFRESH_EVENT = "meccafit:duelo-arena-refresh";

export function notifyDueloArenaRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DUelo_ARENA_REFRESH_EVENT));
}
