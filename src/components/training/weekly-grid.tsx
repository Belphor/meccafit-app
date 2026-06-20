"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExerciseList } from "@/components/training/exercise-list";
import {
  buildScheduleMap,
  DEFAULT_WEEKLY_SCHEDULE,
  formatScheduleDayLabel,
  MUSCLE_GROUP_LABELS,
  parsePlanilhaDayRows,
  resolveCalendarWeekdayIndex,
  resolvePrimaryClientMuscleForDay,
  TRAINING_MUSCLE_GROUPS,
  WEEKDAY_LABELS,
  type PlanilhaDayRow,
  type TrainingMuscleGroup,
  type WeekdayIndex,
} from "@/lib/training-week";
import { DASHBOARD_TAP_TARGET, IRIS_IDLE_BORDER, IRIS_IDLE_SURFACE } from "@/lib/dashboard-config";
import { supabase } from "@/lib/supabase";

const WEEKDAY_INDICES: WeekdayIndex[] = [1, 2, 3, 4, 5, 6];

export type WeeklyGridProps = {
  userId: string;
  initialSchedule?: PlanilhaDayRow[];
};

type WeeklyGridState = {
  schedule: Record<WeekdayIndex, TrainingMuscleGroup[]>;
  activeDay: WeekdayIndex;
  selectedMuscleGroup: TrainingMuscleGroup;
  isOverride: boolean;
  focusMenuOpen: boolean;
  loading: boolean;
  error: string | null;
};

function resolveInitialState(initialSchedule?: PlanilhaDayRow[]): Omit<WeeklyGridState, "loading" | "error" | "focusMenuOpen"> {
  const schedule = buildScheduleMap(initialSchedule ?? []);
  const activeDay = resolveCalendarWeekdayIndex();
  const selectedMuscleGroup = resolvePrimaryClientMuscleForDay(schedule[activeDay]);
  return {
    schedule,
    activeDay,
    selectedMuscleGroup,
    isOverride: false,
  };
}

export function WeeklyGrid({ userId, initialSchedule }: WeeklyGridProps) {
  const boot = useMemo(() => resolveInitialState(initialSchedule), [initialSchedule]);

  const [schedule, setSchedule] = useState(boot.schedule);
  const [activeDay, setActiveDay] = useState<WeekdayIndex>(boot.activeDay);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<TrainingMuscleGroup>(
    boot.selectedMuscleGroup,
  );
  const [isOverride, setIsOverride] = useState(false);
  const [focusMenuOpen, setFocusMenuOpen] = useState(false);
  const [loading, setLoading] = useState(!initialSchedule?.length);
  const [error, setError] = useState<string | null>(null);

  const scheduledForActiveDay = schedule[activeDay];
  const scheduledForActiveDayLabel = formatScheduleDayLabel(scheduledForActiveDay);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
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

      const nextSchedule = buildScheduleMap(rows);
      setSchedule(nextSchedule);

      setSelectedMuscleGroup((current) => {
        const dayMuscle = resolvePrimaryClientMuscleForDay(nextSchedule[activeDay]);
        return isOverride ? current : dayMuscle;
      });
    } catch {
      setError("Falha ao carregar planilha do forjador.");
      setSchedule(DEFAULT_WEEKLY_SCHEDULE);
    } finally {
      setLoading(false);
    }
  }, [activeDay, isOverride, userId]);

  useEffect(() => {
    if (!initialSchedule?.length) {
      void loadSchedule();
    }
  }, [initialSchedule?.length, loadSchedule]);

  const selectDay = useCallback(
    (day: WeekdayIndex) => {
      setActiveDay(day);
      setFocusMenuOpen(false);
      if (!isOverride) {
        setSelectedMuscleGroup(resolvePrimaryClientMuscleForDay(schedule[day]));
      }
    },
    [isOverride, schedule],
  );

  const applyMuscleOverride = useCallback((muscle: TrainingMuscleGroup) => {
    setSelectedMuscleGroup(muscle);
    setIsOverride(!scheduledForActiveDay.includes(muscle));
    setFocusMenuOpen(false);
  }, [scheduledForActiveDay]);

  const resetToScheduled = useCallback(() => {
    setSelectedMuscleGroup(resolvePrimaryClientMuscleForDay(scheduledForActiveDay));
    setIsOverride(false);
    setFocusMenuOpen(false);
  }, [scheduledForActiveDay]);

  return (
    <section aria-label="Grade semanal de treino" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">
            Grade · Segunda a Sábado
          </p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-neutral-600">
            {loading ? "Sincronizando planilha…" : WEEKDAY_LABELS[activeDay]} ·{" "}
            {MUSCLE_GROUP_LABELS[selectedMuscleGroup]}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFocusMenuOpen((open) => !open)}
          className={`${DASHBOARD_TAP_TARGET} rounded-full border border-cyan-500/20 bg-neutral-950/60 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-100/85 backdrop-blur-md`}
        >
          Alternar Foco Vital
        </button>
      </div>

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
        role="tablist"
        aria-label="Dias da semana"
      >
        {WEEKDAY_INDICES.map((day) => {
          const isActive = day === activeDay;
          const muscles = schedule[day];
          const dayLabel = formatScheduleDayLabel(muscles);

          return (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectDay(day)}
              className={`rounded-xl border px-3 py-3 text-left transition-[border-color,box-shadow,background-color] duration-200 ${
                isActive
                  ? "border-emerald-500 bg-emerald-950/20 shadow-[0_0_12px_rgba(16,185,129,0.28)]"
                  : `${IRIS_IDLE_BORDER} ${IRIS_IDLE_SURFACE} opacity-80`
              }`}
            >
              <p
                className={`font-mono text-[9px] uppercase tracking-[0.16em] ${
                  isActive ? "text-emerald-200" : "text-neutral-500"
                }`}
              >
                {WEEKDAY_LABELS[day]}
              </p>
              <p
                className={`mt-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                  isActive ? "text-amber-50" : "text-neutral-600"
                }`}
              >
                {dayLabel}
              </p>
            </button>
          );
        })}
      </div>

      {focusMenuOpen ? (
        <div className="rounded-xl border border-cyan-500/20 bg-black/55 p-3 backdrop-blur-md">
          <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-400/70">
            Selecione o grupo muscular
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TRAINING_MUSCLE_GROUPS.map((muscle) => {
              const selected = muscle === selectedMuscleGroup;
              return (
                <button
                  key={muscle}
                  type="button"
                  onClick={() => applyMuscleOverride(muscle)}
                  className={`${DASHBOARD_TAP_TARGET} rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] ${
                    selected
                      ? "border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] text-emerald-100"
                      : "border-orange-500/10 text-neutral-500 opacity-70"
                  }`}
                >
                  {MUSCLE_GROUP_LABELS[muscle]}
                </button>
              );
            })}
          </div>
          {isOverride ? (
            <button
              type="button"
              onClick={resetToScheduled}
              className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-amber-300/80 underline-offset-2 hover:underline"
            >
              Restaurar prescrição · {scheduledForActiveDayLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="text-[10px] text-amber-400/85" role="alert">
          {error} · usando grade padrão local.
        </p>
      ) : null}

      {!loading ? (
        <ExerciseList
          userId={userId}
          selectedMuscleGroup={selectedMuscleGroup}
          isOverride={isOverride}
        />
      ) : (
        <div className="h-32 animate-pulse rounded-xl border border-orange-500/10 bg-neutral-950/40" />
      )}
    </section>
  );
}
