/** HERMES/PLUTUS — telemetria client-side (sessionStorage · zero custo Supabase). */

export type PhaseLayoutTelemetryEvent = {
  type: "phase_layout_change";
  at: string;
  userId: string;
  fromLayout: string;
  toLayout: string;
  phaseTier: number;
  isDegraded: boolean;
};

export type ReactivationFlashTelemetryEvent = {
  type: "reactivation_flash";
  at: string;
  userId: string;
  durationMs: number;
  sessionVtcKg: number;
  phaseLayout: string;
};

export type ForumViewTelemetryEvent = {
  type: "forum_brasa_viva_view";
  at: string;
  userId: string;
  topicCount: number;
};

export type ClientTelemetryEvent =
  | PhaseLayoutTelemetryEvent
  | ReactivationFlashTelemetryEvent
  | ForumViewTelemetryEvent;

const TELEMETRY_BUFFER_KEY = "meccafit:telemetry:events";
const TELEMETRY_BUFFER_MAX = 48;

function readBuffer(): ClientTelemetryEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(TELEMETRY_BUFFER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ClientTelemetryEvent[]) : [];
  } catch {
    return [];
  }
}

function writeBuffer(events: ClientTelemetryEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      TELEMETRY_BUFFER_KEY,
      JSON.stringify(events.slice(-TELEMETRY_BUFFER_MAX)),
    );
  } catch {
    // quota / private mode
  }
}

export function emitClientTelemetry(event: ClientTelemetryEvent): void {
  if (typeof window === "undefined") return;
  const next = [...readBuffer(), event];
  writeBuffer(next);
  window.dispatchEvent(new CustomEvent("meccafit:telemetry", { detail: event }));
}

export function readClientTelemetry(): ClientTelemetryEvent[] {
  return readBuffer();
}
