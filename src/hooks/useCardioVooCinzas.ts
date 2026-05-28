"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

type UseCardioVooCinzasOptions = {
  userId: string | null;
  goalMs?: number;
};

export function useCardioVooCinzas({ userId, goalMs }: UseCardioVooCinzasOptions) {
  const [session, setSession] = useState<CardioSessionSnapshot>(() =>
    userId ? readCardioSession(userId) ?? createInitialCardioSession(userId, goalMs) : createInitialCardioSession(""),
  );
  const completionFiredRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    queueMicrotask(() => {
      const restored = readCardioSession(userId);
      setSession(restored ?? createInitialCardioSession(userId, goalMs));
      completionFiredRef.current = restored?.status === "completed";
    });
  }, [userId, goalMs]);

  const persist = useCallback((next: CardioSessionSnapshot) => {
    setSession(next);
    writeCardioSession(next);

    if (next.status === "completed" && !completionFiredRef.current) {
      completionFiredRef.current = true;
      commitCardioAltarCompletion(next.userId);
    }
  }, []);

  const tick = useCallback(() => {
    if (typeof document !== "undefined" && document.hidden) return;

    setSession((current) => {
      const next = applyCardioTimeDelta(current);
      if (next.updatedAt !== current.updatedAt) writeCardioSession(next);
      if (next.status === "completed" && !completionFiredRef.current) {
        completionFiredRef.current = true;
        commitCardioAltarCompletion(next.userId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!userId || session.status === "idle" || session.status === "completed") return;

    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [userId, session.status, tick]);

  useEffect(() => {
    if (!userId) return;

    const onVisibility = () => {
      setSession((current) => {
        const next =
          document.visibilityState === "hidden"
            ? markCardioHidden(current)
            : markCardioVisible(current);
        writeCardioSession(next);
        if (next.status === "completed" && !completionFiredRef.current) {
          completionFiredRef.current = true;
          commitCardioAltarCompletion(next.userId);
        }
        return next;
      });
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [userId]);

  const handleStart = useCallback(() => {
    if (!userId) return;
    const base = readCardioSession(userId) ?? createInitialCardioSession(userId, goalMs);
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
