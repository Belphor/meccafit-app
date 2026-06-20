"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchCardioSessionRemote,
  mergeCardioSessionSnapshots,
  upsertCardioSessionRemote,
} from "@/lib/cardio-voo-cinzas-sync";
import {
  applyCardioTimeDelta,
  createInitialCardioSession,
  markCardioHidden,
  markCardioVisible,
  performThermalCheckIn,
  reactivateCardioFromStasis,
  readCardioSession,
  startCardioSession,
  writeCardioSession,
  type CardioSessionSnapshot,
} from "@/lib/cardio-voo-cinzas";
import { commitCardioAltarCompletion } from "@/lib/cardio-altar-daily";
import { resolveAppDayKey } from "@/lib/treino-day-key";

type UseCardioVooCinzasOptions = {
  userId: string | null;
  goalMs?: number;
};

function hydrateCardioSession(
  snapshot: CardioSessionSnapshot | null,
  userId: string,
  goalMs?: number,
): CardioSessionSnapshot {
  const base = snapshot ?? createInitialCardioSession(userId, goalMs);
  return applyCardioTimeDelta(base);
}

export function useCardioVooCinzas({ userId, goalMs }: UseCardioVooCinzasOptions) {
  const [session, setSession] = useState<CardioSessionSnapshot>(() =>
    userId ? createInitialCardioSession(userId, goalMs) : createInitialCardioSession(""),
  );
  const [hydrated, setHydrated] = useState(false);
  const completionFiredRef = useRef(false);

  const persist = useCallback((next: CardioSessionSnapshot) => {
    setSession(next);
    writeCardioSession(next);
    void upsertCardioSessionRemote(next);

    if (next.status === "completed" && !completionFiredRef.current) {
      completionFiredRef.current = true;
      commitCardioAltarCompletion(next.userId);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const dayKey = resolveAppDayKey();

    void (async () => {
      const [remote, local] = await Promise.all([
        fetchCardioSessionRemote(userId, dayKey, goalMs),
        Promise.resolve(readCardioSession(userId, goalMs)),
      ]);

      if (cancelled) return;

      const merged = hydrateCardioSession(
        mergeCardioSessionSnapshots(remote, local),
        userId,
        goalMs,
      );

      completionFiredRef.current = merged.status === "completed";
      writeCardioSession(merged);
      setSession(merged);
      setHydrated(true);

      if (merged.updatedAt !== remote?.updatedAt) {
        void upsertCardioSessionRemote(merged);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, goalMs]);

  const tick = useCallback(() => {
    if (typeof document !== "undefined" && document.hidden) return;

    setSession((current) => {
      const next = applyCardioTimeDelta(current);
      if (next.updatedAt !== current.updatedAt) {
        writeCardioSession(next);
        void upsertCardioSessionRemote(next);
      }
      if (next.status === "completed" && !completionFiredRef.current) {
        completionFiredRef.current = true;
        commitCardioAltarCompletion(next.userId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!userId || !hydrated || session.status === "idle" || session.status === "completed") {
      return;
    }

    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [userId, hydrated, session.status, tick]);

  useEffect(() => {
    if (!userId || !hydrated) return;

    const onVisibility = () => {
      setSession((current) => {
        const next =
          document.visibilityState === "hidden"
            ? markCardioHidden(current)
            : markCardioVisible(current);
        writeCardioSession(next);
        void upsertCardioSessionRemote(next);
        if (next.status === "completed" && !completionFiredRef.current) {
          completionFiredRef.current = true;
          commitCardioAltarCompletion(next.userId);
        }
        return next;
      });
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [userId, hydrated]);

  const handleStart = useCallback(() => {
    if (!userId) return;
    const base = readCardioSession(userId, goalMs) ?? createInitialCardioSession(userId, goalMs);
    completionFiredRef.current = false;
    persist(startCardioSession(base));
  }, [userId, goalMs, persist]);

  const handleThermalCheckIn = useCallback(() => {
    persist(performThermalCheckIn(session));
  }, [session, persist]);

  const handleReactivate = useCallback(() => {
    persist(reactivateCardioFromStasis(session));
  }, [session, persist]);

  return {
    session,
    handleStart,
    handleThermalCheckIn,
    handleReactivate,
  };
}
