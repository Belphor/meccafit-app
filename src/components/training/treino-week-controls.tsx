"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildScheduleMap,
  DEFAULT_WEEKLY_SCHEDULE,
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
} from "@/lib/dashboard-config";
import { supabase } from "@/lib/supabase";

const WEEKDAY_INDICES: WeekdayIndex[] = [1, 2, 3, 4, 5, 6];

export type TreinoWeekControlsProps = {
  userId: string;
  initialSchedule?: PlanilhaDayRow[];
  activeTrainingDay: WeekdayIndex;
  isTreinoSwitching: boolean;
  hasForjadorPlan: boolean;
  forjadorConfig: ForjadorTreinoConfig;
  weekLockedDays: WeekdayIndex[];
  onTrainingDayPick: (day: WeekdayIndex) => void;
};

function resolveInitialSchedule(initialSchedule?: PlanilhaDayRow[]) {
  return buildScheduleMap(initialSchedule ?? []);
}

export function TreinoWeekControls({
  userId,
  initialSchedule,
  activeTrainingDay,
  isTreinoSwitching,
  hasForjadorPlan,
  forjadorConfig,
  weekLockedDays,
  onTrainingDayPick,
}: TreinoWeekControlsProps) {
  const bootSchedule = useMemo(() => resolveInitialSchedule(initialSchedule), [initialSchedule]);
  const calendarToday = useMemo(() => resolveCalendarWeekdayIndex(), []);
  const lockedDaySet = useMemo(() => new Set(weekLockedDays), [weekLockedDays]);

  const [schedule, setSchedule] = useState(bootSchedule);
  const [loadingIndication, setLoadingIndication] = useState(!initialSchedule?.length);
  const [error, setError] = useState<string | null>(null);

  const activeDayMuscles = schedule[activeTrainingDay];
  const activeDayLabel = formatScheduleDayLabel(activeDayMuscles);
  const isActiveDayLocked = lockedDaySet.has(activeTrainingDay);

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
        setSchedule(DEFAULT_WEEKLY_SCHEDULE);
        return;
      }

      const rows: PlanilhaDayRow[] = parsePlanilhaDayRows(data);
      setSchedule(buildScheduleMap(rows));
    } catch {
      setError("Falha ao carregar planilha do forjador.");
      setSchedule(DEFAULT_WEEKLY_SCHEDULE);
    } finally {
      setLoadingIndication(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!initialSchedule?.length) {
      void loadSchedule();
    }
  }, [initialSchedule?.length, loadSchedule]);

  return (
    <div className="border-b border-orange-500/10">
      <div className="px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-400/90">
            Execução
          </p>
          {isActiveDayLocked ? (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-950/35 px-2.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-emerald-200/90">
              {TREINO_DIA_CONCLUIDO_LABEL}
            </span>
          ) : null}
        </div>
        <p
          className="mt-2 text-xl font-bold uppercase tracking-[0.1em] text-amber-50 transition-opacity duration-150 sm:text-2xl"
          style={{ opacity: isTreinoSwitching ? 0.55 : 1 }}
        >
          {WEEKDAY_LABELS[activeTrainingDay]}
          {isTreinoSwitching ? "…" : ""}
        </p>
        <p className="mt-1 text-sm font-medium uppercase tracking-[0.08em] text-neutral-300">
          {activeDayLabel}
        </p>
        {hasForjadorPlan ? (
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">
            Descanso {forjadorConfig.descansoPadraoSeg}s · cardio {forjadorConfig.cardioMetaMinutos} min
          </p>
        ) : null}
      </div>

      <div className="px-3 py-3 sm:px-5 sm:py-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">
            Escolha o dia
          </p>
          <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-neutral-600">
            {loadingIndication ? "Sincronizando…" : "Seg · Sáb"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" role="group">
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
                  isLocked ? " — semana concluída" : ""
                }`}
                onClick={(event) => {
                  event.preventDefault();
                  if (day !== activeTrainingDay) onTrainingDayPick(day);
                }}
                className={`${DASHBOARD_TAP_TARGET} group relative flex min-h-[4.5rem] flex-col items-center justify-center rounded-xl border px-2 py-3 text-center transition-[border-color,background-color,box-shadow,opacity] duration-200 disabled:cursor-wait disabled:opacity-60 ${
                  isSelected
                    ? "border-amber-500/45 bg-amber-950/25 shadow-[0_0_16px_rgba(245,158,11,0.12)]"
                    : "border-orange-500/10 bg-black/35 hover:border-cyan-500/25 hover:bg-neutral-950/60"
                }`}
              >
                {isToday ? (
                  <span
                    className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]"
                    aria-hidden
                  />
                ) : null}
                {isLocked ? (
                  <span className="absolute right-2 top-2 font-mono text-[8px] text-emerald-400/90">
                    ✓
                  </span>
                ) : null}
                <p
                  className={`font-mono text-[10px] font-bold uppercase tracking-[0.16em] ${
                    isSelected ? "text-amber-200" : "text-neutral-400 group-hover:text-neutral-200"
                  }`}
                >
                  {WEEKDAY_SHORT_LABELS[day]}
                </p>
                <p
                  className={`mt-1.5 line-clamp-2 text-[8px] font-semibold uppercase leading-snug tracking-[0.06em] ${
                    isSelected ? "text-amber-100/90" : "text-neutral-500 group-hover:text-neutral-400"
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
        <p className="px-4 pb-3 text-[10px] text-amber-400/85 sm:px-5" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
