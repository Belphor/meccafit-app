"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DASHBOARD_TAP_TARGET,
  WORKOUT_TIMER_ACTION,
  WORKOUT_TIMER_LABEL,
  WORKOUT_TIMER_ROOT,
  WORKOUT_TIMER_SHELL_IDLE,
  WORKOUT_TIMER_SHELL_RUNNING,
  WORKOUT_TIMER_SHELL_URGENT,
  WORKOUT_TIMER_SHELL_WARNING,
  WORKOUT_TIMER_VALUE,
} from "@/lib/dashboard-config";

export type WorkoutTimerProps = {
  defaultSeconds?: number;
  className?: string;
  onRestComplete?: () => void;
  restartToken?: number;
  variant?: "panel" | "exercise";
  isExerciseActive?: boolean;
};

type TimerPhase = "idle" | "running" | "warning" | "urgent";

function resolveTimerPhase(secondsLeft: number, isRunning: boolean): TimerPhase {
  if (!isRunning || secondsLeft <= 0) return "idle";
  if (secondsLeft <= 10) return "urgent";
  if (secondsLeft <= 20) return "warning";
  return "running";
}

function resolveExerciseTimerShell(phase: TimerPhase) {
  if (phase === "urgent") return WORKOUT_TIMER_SHELL_URGENT;
  if (phase === "warning") return WORKOUT_TIMER_SHELL_WARNING;
  if (phase === "running") return WORKOUT_TIMER_SHELL_RUNNING;
  return WORKOUT_TIMER_SHELL_IDLE;
}

function resolveTimerLabelClass(phase: TimerPhase) {
  if (phase === "urgent") return `${WORKOUT_TIMER_LABEL} text-orange-300/90`;
  if (phase === "warning") return `${WORKOUT_TIMER_LABEL} text-amber-300/85`;
  if (phase === "running") return `${WORKOUT_TIMER_LABEL} text-cyan-300/85`;
  return `${WORKOUT_TIMER_LABEL} text-neutral-500`;
}

function resolveTimerValueClass(phase: TimerPhase) {
  if (phase === "urgent") return `${WORKOUT_TIMER_VALUE} text-orange-200`;
  if (phase === "warning") return `${WORKOUT_TIMER_VALUE} text-amber-200`;
  if (phase === "running") return `${WORKOUT_TIMER_VALUE} text-cyan-100`;
  return `${WORKOUT_TIMER_VALUE} text-neutral-400`;
}

function resolveStartButtonClass(phase: TimerPhase) {
  if (phase === "running") {
    return `${DASHBOARD_TAP_TARGET} ${WORKOUT_TIMER_ACTION} border border-cyan-500/25 bg-cyan-950/30 text-cyan-100`;
  }
  if (phase === "warning") {
    return `${DASHBOARD_TAP_TARGET} ${WORKOUT_TIMER_ACTION} border border-amber-500/28 bg-amber-950/30 text-amber-100`;
  }
  if (phase === "urgent") {
    return `${DASHBOARD_TAP_TARGET} ${WORKOUT_TIMER_ACTION} border border-orange-500/30 bg-orange-950/35 text-orange-100`;
  }
  return `${DASHBOARD_TAP_TARGET} ${WORKOUT_TIMER_ACTION} border border-neutral-600/35 bg-neutral-900/50 text-neutral-300`;
}

function resolveProgressClass(phase: TimerPhase) {
  return `workout-timer__progress-fill workout-timer__progress-fill--${phase}`;
}

export function WorkoutTimer({
  defaultSeconds = 90,
  className = "",
  onRestComplete,
  restartToken = 0,
  variant = "panel",
  isExerciseActive = false,
}: WorkoutTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onRestCompleteRef = useRef(onRestComplete);

  useEffect(() => {
    onRestCompleteRef.current = onRestComplete;
  }, [onRestComplete]);

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
          onRestCompleteRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [clearTimer, isRunning]);

  const startRest = useCallback(
    (seconds = defaultSeconds) => {
      clearTimer();
      setSecondsLeft(Math.max(0, Math.round(seconds)));
      setIsRunning(seconds > 0);
    },
    [clearTimer, defaultSeconds],
  );

  useEffect(() => {
    if (restartToken <= 0) return;

    const timer = window.setTimeout(() => startRest(), 0);
    return () => window.clearTimeout(timer);
  }, [restartToken, startRest]);

  const stopRest = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setSecondsLeft(0);
  }, [clearTimer]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const phase = useMemo(
    () => resolveTimerPhase(secondsLeft, isRunning),
    [secondsLeft, isRunning],
  );
  const progressPercent = useMemo(() => {
    if (!isRunning || defaultSeconds <= 0) return 0;
    return Math.min(100, Math.max(0, (secondsLeft / defaultSeconds) * 100));
  }, [defaultSeconds, isRunning, secondsLeft]);

  const statusHint =
    phase === "urgent"
      ? "Próxima série"
      : phase === "warning"
        ? "Quase lá"
        : phase === "running"
          ? "Descanso"
          : isExerciseActive
            ? "Pronto"
            : "Parado";

  if (variant === "exercise") {
    return (
      <div
        className={`${WORKOUT_TIMER_ROOT} ${resolveExerciseTimerShell(phase)} ${className}`}
        aria-live="polite"
        data-exercise-interactive="true"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border sm:h-12 sm:w-12 ${
                phase === "running"
                  ? "border-cyan-500/25 bg-cyan-950/25"
                  : phase === "warning"
                    ? "border-amber-500/25 bg-amber-950/25"
                    : phase === "urgent"
                      ? "border-orange-500/30 bg-orange-950/30"
                      : "border-neutral-700/40 bg-neutral-900/40"
              }`}
              aria-hidden
            >
              <span
                className={`font-mono text-[10px] font-bold tabular-nums leading-none sm:text-[11px] ${
                  phase === "urgent"
                    ? "text-orange-200"
                    : phase === "warning"
                      ? "text-amber-200"
                      : phase === "running"
                        ? "text-cyan-100"
                        : "text-neutral-400"
                }`}
              >
                {display}
              </span>
            </div>
            <div className="min-w-0">
              <p className={resolveTimerLabelClass(phase)}>Cronômetro · {statusHint}</p>
              <p className="mt-0.5 font-mono text-[9px] tabular-nums text-neutral-500 sm:text-[10px]">
                Meta {defaultSeconds}s
              </p>
            </div>
          </div>

          <div className="flex w-full gap-1.5 sm:w-auto sm:shrink-0">
            <button type="button" onClick={() => startRest()} className={`flex-1 sm:flex-none ${resolveStartButtonClass(phase)}`}>
              {defaultSeconds}s
            </button>
            <button
              type="button"
              onClick={stopRest}
              disabled={!isRunning && secondsLeft === 0}
              className={`${DASHBOARD_TAP_TARGET} ${WORKOUT_TIMER_ACTION} flex-1 border border-neutral-700/40 bg-neutral-950/60 text-neutral-400 disabled:opacity-40 sm:flex-none`}
            >
              Parar
            </button>
          </div>
        </div>

        <div className="workout-timer__progress" aria-hidden>
          <div className={resolveProgressClass(phase)} style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
    );
  }

  const panelShell =
    phase === "urgent"
      ? "workout-timer workout-timer--urgent workout-timer-urgent rounded-xl border border-orange-500/30 bg-orange-950/25 p-3 backdrop-blur-md sm:p-4"
      : phase === "warning"
        ? "workout-timer workout-timer--warning rounded-xl border border-amber-500/25 bg-amber-950/20 p-3 backdrop-blur-md sm:p-4"
        : phase === "running"
          ? "workout-timer workout-timer--running rounded-xl border border-cyan-500/22 bg-cyan-950/15 p-3 backdrop-blur-md sm:p-4"
          : "workout-timer workout-timer--idle rounded-xl border border-neutral-700/45 bg-neutral-950/65 p-3 backdrop-blur-md sm:p-4";

  return (
    <div className={`${WORKOUT_TIMER_ROOT} ${panelShell} ${className}`} aria-live="polite">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={resolveTimerLabelClass(phase)}>Cronômetro de descanso</p>
          <p className={`mt-1 ${resolveTimerValueClass(phase)} text-[clamp(1.5rem,6vw,1.875rem)]`}>
            {display}
          </p>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => startRest()} className={resolveStartButtonClass(phase)}>
            Iniciar {defaultSeconds}s
          </button>
          <button
            type="button"
            onClick={stopRest}
            disabled={!isRunning && secondsLeft === 0}
            className={`${DASHBOARD_TAP_TARGET} ${WORKOUT_TIMER_ACTION} border border-neutral-700/40 bg-neutral-950/60 text-neutral-400 disabled:opacity-40`}
          >
            Parar
          </button>
        </div>
      </div>

      <div className="workout-timer__progress" aria-hidden>
        <div className={resolveProgressClass(phase)} style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
}
