/** Voo de Cinzas — metas e janelas (HERMES + ARGOS). */
export const CARDIO_CHECK_IN_WINDOW_MS = 10 * 60 * 1000;
export const CARDIO_BACKGROUND_STASIS_MS = 10 * 60 * 1000;
export const CARDIO_DEFAULT_GOAL_MS = 30 * 60 * 1000;
export const CARDIO_STORAGE_PREFIX = "meccafit:cardio-voo-cinzas";
export const CARDIO_SNAPSHOT_VERSION = 1 as const;

export type CardioSessionStatus = "idle" | "running" | "check_in" | "stasis" | "completed";

export type CardioSessionSnapshot = {
  v: typeof CARDIO_SNAPSHOT_VERSION;
  userId: string;
  goalMs: number;
  validatedMs: number;
  windowAnchorMs: number;
  status: CardioSessionStatus;
  sessionStartedAtMs: number | null;
  lastHeartbeatMs: number;
  checkInPromptAtMs: number | null;
  hiddenAtMs: number | null;
  completedAt: string | null;
  updatedAt: string;
};

export type CardioThermalBand = "latent" | "active" | "elite";

export function computeCardioPercent(validatedMs: number, goalMs: number): number {
  if (goalMs <= 0) return 0;
  return Math.min(100, Math.round((validatedMs / goalMs) * 100));
}

export function resolveThermalBand(percent: number, status: CardioSessionStatus): CardioThermalBand {
  if (status === "completed" || percent >= 100) return "elite";
  if (percent >= 50) return "active";
  return "latent";
}

export function formatCardioDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function capWindowValidated(validatedMs: number, windowAnchorMs: number): number {
  return Math.min(validatedMs, windowAnchorMs + CARDIO_CHECK_IN_WINDOW_MS);
}

export function createInitialCardioSession(
  userId: string,
  goalMs: number = CARDIO_DEFAULT_GOAL_MS,
): CardioSessionSnapshot {
  const now = Date.now();
  return {
    v: CARDIO_SNAPSHOT_VERSION,
    userId,
    goalMs,
    validatedMs: 0,
    windowAnchorMs: 0,
    status: "idle",
    sessionStartedAtMs: null,
    lastHeartbeatMs: now,
    checkInPromptAtMs: null,
    hiddenAtMs: null,
    completedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

export function startCardioSession(snapshot: CardioSessionSnapshot): CardioSessionSnapshot {
  const now = Date.now();
  return {
    ...createInitialCardioSession(snapshot.userId, snapshot.goalMs),
    status: "running",
    sessionStartedAtMs: now,
    lastHeartbeatMs: now,
    updatedAt: new Date().toISOString(),
  };
}

function completeIfGoalReached(snapshot: CardioSessionSnapshot): CardioSessionSnapshot {
  if (snapshot.validatedMs < snapshot.goalMs) return snapshot;
  return {
    ...snapshot,
    status: "completed",
    validatedMs: snapshot.goalMs,
    completedAt: new Date().toISOString(),
    checkInPromptAtMs: null,
    hiddenAtMs: null,
    updatedAt: new Date().toISOString(),
  };
}

function enterCheckIn(snapshot: CardioSessionSnapshot, now: number): CardioSessionSnapshot {
  const capped = capWindowValidated(snapshot.validatedMs, snapshot.windowAnchorMs);
  return {
    ...snapshot,
    validatedMs: capped,
    status: "check_in",
    checkInPromptAtMs: snapshot.checkInPromptAtMs ?? now,
    lastHeartbeatMs: now,
    updatedAt: new Date().toISOString(),
  };
}

function enterStasis(snapshot: CardioSessionSnapshot, now: number): CardioSessionSnapshot {
  const capped = capWindowValidated(snapshot.validatedMs, snapshot.windowAnchorMs);
  return {
    ...snapshot,
    validatedMs: capped,
    status: "stasis",
    lastHeartbeatMs: now,
    hiddenAtMs: null,
    updatedAt: new Date().toISOString(),
  };
}

export function applyCardioTimeDelta(
  snapshot: CardioSessionSnapshot,
  now: number = Date.now(),
): CardioSessionSnapshot {
  if (snapshot.status === "idle" || snapshot.status === "completed" || snapshot.status === "stasis") {
    return { ...snapshot, lastHeartbeatMs: now };
  }

  if (snapshot.status === "check_in") {
    const promptAt = snapshot.checkInPromptAtMs ?? now;
    if (now - promptAt >= CARDIO_BACKGROUND_STASIS_MS) {
      return enterStasis(snapshot, now);
    }
    return { ...snapshot, lastHeartbeatMs: now };
  }

  const delta = Math.max(0, now - snapshot.lastHeartbeatMs);
  const windowUsed = snapshot.validatedMs - snapshot.windowAnchorMs;
  const windowRemaining = CARDIO_CHECK_IN_WINDOW_MS - windowUsed;

  if (windowRemaining <= 0) {
    return enterCheckIn(snapshot, now);
  }

  const increment = Math.min(delta, windowRemaining);
  let next: CardioSessionSnapshot = {
    ...snapshot,
    validatedMs: snapshot.validatedMs + increment,
    lastHeartbeatMs: now,
    updatedAt: new Date().toISOString(),
  };

  if (next.validatedMs - next.windowAnchorMs >= CARDIO_CHECK_IN_WINDOW_MS) {
    next = enterCheckIn(next, now);
  }

  return completeIfGoalReached(next);
}

export function markCardioHidden(
  snapshot: CardioSessionSnapshot,
  now: number = Date.now(),
): CardioSessionSnapshot {
  if (snapshot.hiddenAtMs !== null) return snapshot;
  return { ...snapshot, hiddenAtMs: now };
}

export function markCardioVisible(
  snapshot: CardioSessionSnapshot,
  now: number = Date.now(),
): CardioSessionSnapshot {
  if (snapshot.hiddenAtMs === null) {
    return { ...snapshot, lastHeartbeatMs: now };
  }

  const awayAnchor = snapshot.hiddenAtMs;
  let next = applyCardioTimeDelta({ ...snapshot, lastHeartbeatMs: awayAnchor }, now);

  if (next.status === "check_in") {
    const awayMs = now - awayAnchor;
    if (awayMs >= CARDIO_BACKGROUND_STASIS_MS) {
      next = enterStasis(next, now);
    }
  }

  return { ...next, hiddenAtMs: null, lastHeartbeatMs: now };
}

export function performThermalCheckIn(
  snapshot: CardioSessionSnapshot,
  now: number = Date.now(),
): CardioSessionSnapshot {
  if (snapshot.status !== "check_in" && snapshot.status !== "stasis") {
    return snapshot;
  }

  const capped = capWindowValidated(snapshot.validatedMs, snapshot.windowAnchorMs);
  const next: CardioSessionSnapshot = {
    ...snapshot,
    validatedMs: capped,
    windowAnchorMs: capped,
    status: "running",
    checkInPromptAtMs: null,
    hiddenAtMs: null,
    lastHeartbeatMs: now,
    updatedAt: new Date().toISOString(),
  };

  return completeIfGoalReached(next);
}

export function reactivateCardioFromStasis(
  snapshot: CardioSessionSnapshot,
  now: number = Date.now(),
): CardioSessionSnapshot {
  if (snapshot.status !== "stasis") return snapshot;

  const atWindowCap =
    snapshot.validatedMs - snapshot.windowAnchorMs >= CARDIO_CHECK_IN_WINDOW_MS;

  if (atWindowCap) {
    return {
      ...snapshot,
      status: "check_in",
      checkInPromptAtMs: now,
      hiddenAtMs: null,
      lastHeartbeatMs: now,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    ...snapshot,
    status: "running",
    hiddenAtMs: null,
    lastHeartbeatMs: now,
    updatedAt: new Date().toISOString(),
  };
}

function buildStorageKey(userId: string): string {
  return `${CARDIO_STORAGE_PREFIX}:${userId}`;
}

export function readCardioSession(userId: string): CardioSessionSnapshot | null {
  if (typeof window === "undefined" || !userId) return null;

  try {
    const raw = window.localStorage.getItem(buildStorageKey(userId));
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<CardioSessionSnapshot>;
    if (data.v !== CARDIO_SNAPSHOT_VERSION || data.userId !== userId) return null;
    return data as CardioSessionSnapshot;
  } catch {
    return null;
  }
}

export function writeCardioSession(snapshot: CardioSessionSnapshot): void {
  if (typeof window === "undefined" || !snapshot.userId) return;

  try {
    window.localStorage.setItem(buildStorageKey(snapshot.userId), JSON.stringify(snapshot));
  } catch {
    // noop
  }
}
