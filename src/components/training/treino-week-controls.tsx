"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildForjadorScheduleMap,
  buildScheduleMap,
  formatScheduleDayLabel,
  parsePlanilhaDayRows,
  resolveCalendarWeekdayIndex,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT_LABELS,
  type PlanilhaDayRow,
  type WeekdayIndex,
} from "@/lib/training-week";
import type { ForjadorTreinoConfig } from "@/lib/forjador-prescriptions";
import {
  DASHBOARD_TAP_TARGET,
  TREINO_DIA_CONCLUIDO_LABEL,
  TREINO_DAY_BUTTON,
  TREINO_DAY_PICKER_LABEL,
  TREINO_EXECUTION_DAY_TITLE,
  TREINO_EXECUTION_HERO,
  TREINO_EXECUTION_LABEL,
  TREINO_EXECUTION_META,
  TREINO_EXECUTION_MUSCLES,
  TREINO_EXECUTION_PICKER,
} from "@/lib/dashboard-config";
import { supabase } from "@/lib/supabase";

const WEEKDAY_INDICES: WeekdayIndex[] = [1, 2, 3, 4, 5, 6];

type ExecutionTone = "complete" | "today" | "default";

export type TreinoWeekControlsProps = {
  userId: string;
  initialSchedule?: PlanilhaDayRow[];
  useForjadorSchedule?: boolean;
  activeTrainingDay: WeekdayIndex;
  isTreinoSwitching: boolean;
  hasForjadorPlan: boolean;
  forjadorConfig: ForjadorTreinoConfig;
  weekLockedDays: WeekdayIndex[];
  onTrainingDayPick: (day: WeekdayIndex) => void;
};

function resolveInitialSchedule(initialSchedule?: PlanilhaDayRow[], useForjadorSchedule = false) {
  if (useForjadorSchedule) {
    return buildForjadorScheduleMap(initialSchedule ?? []);
  }
  return buildScheduleMap(initialSchedule ?? []);
}

function resolveExecutionTone(isActiveDayLocked: boolean, isCalendarToday: boolean): ExecutionTone {
  if (isActiveDayLocked) return "complete";
  if (isCalendarToday) return "today";
  return "default";
}

function resolveExecutionLabelClass(tone: ExecutionTone) {
  if (tone === "complete") return `${TREINO_EXECUTION_LABEL} text-emerald-300/90`;
  if (tone === "today") return `${TREINO_EXECUTION_LABEL} text-emerald-400/85`;
  return `${TREINO_EXECUTION_LABEL} text-emerald-500/70`;
}

function resolveExecutionDayTitleClass(tone: ExecutionTone) {
  if (tone === "complete") return `${TREINO_EXECUTION_DAY_TITLE} text-emerald-50`;
  if (tone === "today") return `${TREINO_EXECUTION_DAY_TITLE} text-emerald-100`;
  return `${TREINO_EXECUTION_DAY_TITLE} text-neutral-100`;
}

function resolveExecutionMusclesClass(tone: ExecutionTone) {
  if (tone === "complete") return `${TREINO_EXECUTION_MUSCLES} text-emerald-200/80`;
  if (tone === "today") return `${TREINO_EXECUTION_MUSCLES} text-emerald-200/70`;
  return `${TREINO_EXECUTION_MUSCLES} text-neutral-400`;
}

function resolveStatusBadgeClass(tone: ExecutionTone) {
  if (tone === "complete") {
    return "rounded-full border border-emerald-400/35 bg-emerald-950/50 px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-emerald-100/95 sm:px-2.5 sm:text-[8px] sm:tracking-[0.14em]";
  }
  return "rounded-full border border-emerald-500/25 bg-emerald-950/35 px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-emerald-300/90 sm:px-2.5 sm:text-[8px] sm:tracking-[0.14em]";
}

function resolveDayButtonClass(isSelected: boolean, isLocked: boolean, isToday: boolean) {
  if (isSelected && isLocked) {
    return "border-emerald-400/45 bg-emerald-950/40 shadow-[0_0_14px_rgba(16,185,129,0.12)] sm:shadow-[0_0_18px_rgba(16,185,129,0.14)]";
  }
  if (isSelected && isToday) {
    return "border-emerald-400/35 bg-emerald-950/30 shadow-[0_0_10px_rgba(52,211,153,0.08)] sm:shadow-[0_0_14px_rgba(52,211,153,0.1)]";
  }
  if (isSelected) {
    return "border-emerald-500/30 bg-emerald-950/25 shadow-[0_0_8px_rgba(16,185,129,0.06)] sm:shadow-[0_0_12px_rgba(16,185,129,0.08)]";
  }
  if (isLocked) {
    return "border-emerald-500/12 bg-black/35 hover:border-emerald-500/22 hover:bg-emerald-950/20";
  }
  return "border-neutral-800/60 bg-black/30 hover:border-emerald-500/18 hover:bg-neutral-950/55";
}

export function TreinoWeekControls({
  userId,
  initialSchedule,
  useForjadorSchedule = false,
  activeTrainingDay,
  isTreinoSwitching,
  hasForjadorPlan,
  forjadorConfig,
  weekLockedDays,
  onTrainingDayPick,
}: TreinoWeekControlsProps) {
  const bootSchedule = useMemo(
    () => resolveInitialSchedule(initialSchedule, useForjadorSchedule),
    [initialSchedule, useForjadorSchedule],
  );
  const calendarToday = useMemo(() => resolveCalendarWeekdayIndex(), []);
  const lockedDaySet = useMemo(() => new Set(weekLockedDays), [weekLockedDays]);

  const [loadedSchedule, setLoadedSchedule] = useState(bootSchedule);
  const [loadingIndication, setLoadingIndication] = useState(
    !useForjadorSchedule && !initialSchedule?.length,
  );
  const [error, setError] = useState<string | null>(null);

  const schedule = useForjadorSchedule ? bootSchedule : loadedSchedule;
  const activeDayMuscles = schedule[activeTrainingDay];
  const activeDayLabel = formatScheduleDayLabel(activeDayMuscles);
  const isActiveDayLocked = lockedDaySet.has(activeTrainingDay);
  const isCalendarToday = activeTrainingDay === calendarToday;
  const executionTone = resolveExecutionTone(isActiveDayLocked, isCalendarToday);

  const loadSchedule = useCallback(async () => {
    setLoadingIndication(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("planilhas_forjador")
        .select("dia_semana, grupo_muscular, ordem")
        .eq("atleta_id", userId)
        .order("dia_semana")
        .order("ordem");

      if (queryError) {
        setError(queryError.message);
        setLoadedSchedule(buildScheduleMap([]));
        return;
      }

      const rows: PlanilhaDayRow[] = parsePlanilhaDayRows(data);
      setLoadedSchedule(
        useForjadorSchedule ? buildForjadorScheduleMap(rows) : buildScheduleMap(rows),
      );
    } catch {
      setError("Não foi possível carregar a rotina de treino.");
      setLoadedSchedule(useForjadorSchedule ? buildForjadorScheduleMap([]) : buildScheduleMap([]));
    } finally {
      setLoadingIndication(false);
    }
  }, [userId, useForjadorSchedule]);

  useEffect(() => {
    if (useForjadorSchedule) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadSchedule();
    });

    return () => {
      cancelled = true;
    };
  }, [loadSchedule, useForjadorSchedule]);

  return (
    <div className={`treino-execution treino-execution--${executionTone}`}>
      <div className={TREINO_EXECUTION_HERO}>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <p className={resolveExecutionLabelClass(executionTone)}>Execução</p>
          {isActiveDayLocked ? (
            <span className={resolveStatusBadgeClass(executionTone)}>{TREINO_DIA_CONCLUIDO_LABEL}</span>
          ) : isCalendarToday ? (
            <span className={resolveStatusBadgeClass(executionTone)}>Dia civil</span>
          ) : null}
        </div>
        <p
          className={`${resolveExecutionDayTitleClass(executionTone)} transition-opacity duration-150`}
          style={{ opacity: isTreinoSwitching ? 0.55 : 1 }}
        >
          {WEEKDAY_LABELS[activeTrainingDay]}
          {isTreinoSwitching ? "…" : ""}
        </p>
        <p className={`${resolveExecutionMusclesClass(executionTone)} line-clamp-2 sm:line-clamp-none`}>
          {activeDayLabel}
        </p>
        {hasForjadorPlan ? (
          <p className={`${TREINO_EXECUTION_META} text-emerald-500/45`}>
            Descanso {forjadorConfig.descansoPadraoSeg}s, cardio {forjadorConfig.cardioMetaMinutos} min
          </p>
        ) : null}
      </div>

      <div className={TREINO_EXECUTION_PICKER}>
        <div className="mb-2.5 flex items-center justify-between gap-2 sm:mb-3">
          <p className={TREINO_DAY_PICKER_LABEL}>Escolha o dia</p>
          <p className="font-mono text-[7px] uppercase tracking-[0.1em] text-emerald-500/40 sm:text-[8px] sm:tracking-[0.12em]">
            {loadingIndication ? "Sincronizando…" : "Seg a Sáb"}
          </p>
        </div>

        <div className="treino-execution-day-grid" role="group">
          {WEEKDAY_INDICES.map((day) => {
            const isSelected = day === activeTrainingDay;
            const isToday = day === calendarToday;
            const isLocked = lockedDaySet.has(day);
            const muscles = schedule[day];
            const dayLabel = formatScheduleDayLabel(muscles);
            const disabled = isTreinoSwitching && !isSelected;

            return (
              <button
                key={day}
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                aria-label={`Treino de ${WEEKDAY_LABELS[day]}: ${dayLabel}${
                  isLocked ? ", semana concluída" : ""
                }`}
                onClick={(event) => {
                  event.preventDefault();
                  if (day !== activeTrainingDay) onTrainingDayPick(day);
                }}
                className={`${DASHBOARD_TAP_TARGET} ${TREINO_DAY_BUTTON} disabled:cursor-wait disabled:opacity-60 ${resolveDayButtonClass(isSelected, isLocked, isToday)}`}
              >
                {isToday ? (
                  <span
                    className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.7)] sm:left-2 sm:top-2"
                    aria-hidden
                  />
                ) : null}
                {isLocked ? (
                  <span className="absolute right-1.5 top-1.5 font-mono text-[7px] text-emerald-300/90 sm:right-2 sm:top-2 sm:text-[8px]">
                    ✓
                  </span>
                ) : null}
                <p
                  className={`font-mono text-[9px] font-bold uppercase tracking-[0.14em] sm:text-[10px] sm:tracking-[0.16em] ${
                    isSelected
                      ? "text-emerald-100"
                      : isLocked
                        ? "text-emerald-400/70 group-hover:text-emerald-300/80"
                        : "text-neutral-500 group-hover:text-neutral-300"
                  }`}
                >
                  {WEEKDAY_SHORT_LABELS[day]}
                </p>
                <p
                  className={`mt-1 line-clamp-2 text-[7px] font-semibold uppercase leading-snug tracking-[0.05em] sm:mt-1.5 sm:text-[8px] sm:tracking-[0.06em] ${
                    isSelected
                      ? "text-emerald-50/90"
                      : isLocked
                        ? "text-emerald-500/55 group-hover:text-emerald-400/65"
                        : "text-neutral-600 group-hover:text-neutral-500"
                  }`}
                >
                  {dayLabel}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="px-3 pb-3 text-[9px] text-amber-400/85 sm:px-5 sm:text-[10px]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
