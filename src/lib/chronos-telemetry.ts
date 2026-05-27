/** CHRONOS — telemetria estruturada client-side (zero custo Supabase). */

export type ChronosPhaseLayoutEvent = {
  type: "phase_layout_change";
  at: string;
  userId: string;
  fromLayout: string;
  toLayout: string;
  phaseTier: number;
  isDegraded: boolean;
};

export type ChronosReactivationFlashEvent = {
  type: "reactivation_flash";
  at: string;
  userId: string;
  durationMs: number;
  sessionVtcKg: number;
  phaseLayout: string;
};

export type ChronosForumViewEvent = {
  type: "forum_brasa_viva_view";
  at: string;
  userId: string;
  topicCount: number;
};

export type ChronosEvent =
  | ChronosPhaseLayoutEvent
  | ChronosReactivationFlashEvent
  | ChronosForumViewEvent;

const CHRONOS_BUFFER_KEY = "meccafit:chronos:events";
const CHRONOS_BUFFER_MAX = 48;

function readBuffer(): ChronosEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(CHRONOS_BUFFER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ChronosEvent[]) : [];
  } catch {
    return [];
  }
}

function writeBuffer(events: ChronosEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      CHRONOS_BUFFER_KEY,
      JSON.stringify(events.slice(-CHRONOS_BUFFER_MAX)),
    );
  } catch {
    // quota / private mode
  }
}

export function emitChronosEvent(event: ChronosEvent): void {
  if (typeof window === "undefined") return;
  const next = [...readBuffer(), event];
  writeBuffer(next);
  window.dispatchEvent(new CustomEvent("meccafit:chronos", { detail: event }));
}

export function readChronosEvents(): ChronosEvent[] {
  return readBuffer();
}
