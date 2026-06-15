"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DASHBOARD_TAP_TARGET } from "@/lib/dashboard-config";

export type WorkoutTimerProps = {
  /** Segundos de descanso entre séries */
  defaultSeconds?: number;
  className?: string;
  onRestComplete?: () => void;
  /** Incrementa para reiniciar o descanso (ex.: após gravar série) */
  restartToken?: number;
  /** Compacto: embutido no card do exercício */
  variant?: "panel" | "exercise";
};

export function WorkoutTimer({
  defaultSeconds = 90,
  className = "",
  onRestComplete,
  restartToken = 0,
  variant = "panel",
}: WorkoutTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);
          onRestComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [clearTimer, isRunning, onRestComplete]);

  const startRest = useCallback(
    (seconds = defaultSeconds) => {
      clearTimer();
      setSecondsLeft(Math.max(0, Math.round(seconds)));
      setIsRunning(seconds > 0);
    },
    [clearTimer, defaultSeconds],
  );

  useEffect(() => {
    if (restartToken > 0) {
      startRest();
    }
  }, [restartToken, startRest]);

  const stopRest = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setSecondsLeft(0);
  }, [clearTimer]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  if (variant === "exercise") {
    return (
      <div
        className={`rounded-lg border border-cyan-500/12 bg-black/40 px-3 py-2 ${className}`}
        aria-live="polite"
        data-exercise-interactive="true"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-cyan-400/75">
              Descanso
            </p>
            <p
              className={`font-mono text-xl font-bold tabular-nums tracking-wider ${
                isRunning ? "text-emerald-200" : "text-neutral-500"
              }`}
            >
              {display}
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => startRest()}
              className={`${DASHBOARD_TAP_TARGET} rounded-full border border-emerald-500/20 bg-emerald-950/25 px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-emerald-100`}
            >
              {defaultSeconds}s
            </button>
            <button
              type="button"
              onClick={stopRest}
              disabled={!isRunning && secondsLeft === 0}
              className={`${DASHBOARD_TAP_TARGET} rounded-full border border-orange-500/12 bg-neutral-950/50 px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-neutral-400 disabled:opacity-40`}
            >
              Parar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-cyan-500/15 bg-black/45 p-4 backdrop-blur-md ${className}`}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">
            Cronômetro de descanso
          </p>
          <p
            className={`mt-1 font-mono text-3xl font-bold tabular-nums tracking-wider ${
              isRunning ? "text-emerald-200" : "text-neutral-500"
            }`}
          >
            {display}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => startRest()}
            className={`${DASHBOARD_TAP_TARGET} rounded-full border border-emerald-500/25 bg-emerald-950/30 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-100`}
          >
            Iniciar {defaultSeconds}s
          </button>
          <button
            type="button"
            onClick={stopRest}
            disabled={!isRunning && secondsLeft === 0}
            className={`${DASHBOARD_TAP_TARGET} rounded-full border border-orange-500/15 bg-neutral-950/60 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-400 disabled:opacity-40`}
          >
            Parar
          </button>
        </div>
      </div>
    </div>
  );
}
