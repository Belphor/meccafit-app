"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildScheduleMap,
  DEFAULT_WEEKLY_SCHEDULE,
  MUSCLE_GROUP_LABELS,
  MUSCLE_TO_SUBGROUP_ID,
  normalizeTrainingMuscleGroup,
  resolveCalendarWeekdayIndex,
  TRAINING_MUSCLE_GROUPS,
  WEEKDAY_LABELS,
  type PlanilhaDayRow,
  type TrainingMuscleGroup,
  type WeekdayIndex,
} from "@/lib/training-week";
import { DASHBOARD_TAP_TARGET, IRIS_IDLE_BORDER, IRIS_IDLE_SURFACE } from "@/lib/dashboard-config";
import { supabase } from "@/lib/supabase";

const WEEKDAY_INDICES: WeekdayIndex[] = [1, 2, 3, 4, 5, 6];

const SUBGROUP_TO_MUSCLE = Object.fromEntries(
  Object.entries(MUSCLE_TO_SUBGROUP_ID).map(([muscle, subgroupId]) => [
    subgroupId,
    muscle as TrainingMuscleGroup,
  ]),
) as Record<string, TrainingMuscleGroup>;

export type TreinoWeekControlsProps = {
  userId: string;
  activeSubgroupId?: string;
  initialSchedule?: PlanilhaDayRow[];
  onMuscleFocusChange: (payload: {
    muscle: TrainingMuscleGroup;
    subgroupId: string;
    isOverride: boolean;
    activeDay: WeekdayIndex;
  }) => void;
};

function resolveInitialSchedule(initialSchedule?: PlanilhaDayRow[]) {
  const schedule = buildScheduleMap(initialSchedule ?? []);
  const activeDay = resolveCalendarWeekdayIndex();
  return { schedule, activeDay, muscle: schedule[activeDay] };
}

export function TreinoWeekControls({
  userId,
  activeSubgroupId,
  initialSchedule,
  onMuscleFocusChange,
}: TreinoWeekControlsProps) {
  const boot = useMemo(() => resolveInitialSchedule(initialSchedule), [initialSchedule]);

  const [schedule, setSchedule] = useState(boot.schedule);
  const [activeDay, setActiveDay] = useState<WeekdayIndex>(boot.activeDay);
  const [selectedMuscle, setSelectedMuscle] = useState<TrainingMuscleGroup>(boot.muscle);
  const [isOverride, setIsOverride] = useState(false);
  const [focusMenuOpen, setFocusMenuOpen] = useState(false);
  const [loading, setLoading] = useState(!initialSchedule?.length);
  const [error, setError] = useState<string | null>(null);
  const didInitialSyncRef = useRef(false);

  const scheduledForActiveDay = schedule[activeDay];

  const emitFocus = useCallback(
    (muscle: TrainingMuscleGroup, day: WeekdayIndex, override: boolean) => {
      onMuscleFocusChange({
        muscle,
        subgroupId: MUSCLE_TO_SUBGROUP_ID[muscle],
        isOverride: override,
        activeDay: day,
      });
    },
    [onMuscleFocusChange],
  );

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("planilhas_forjador")
        .select("dia_semana, grupo_muscular")
        .eq("atleta_id", userId);

      if (queryError) {
        setError(queryError.message);
        setSchedule(DEFAULT_WEEKLY_SCHEDULE);
        return;
      }

      const rows: PlanilhaDayRow[] = (data ?? [])
        .map((row) => {
          const muscle = normalizeTrainingMuscleGroup(row.grupo_muscular);
          const day = Number(row.dia_semana) as WeekdayIndex;
          if (!muscle || day < 1 || day > 6) return null;
          return { dia_semana: day, grupo_muscular: muscle };
        })
        .filter((row): row is PlanilhaDayRow => row !== null);

      const nextSchedule = buildScheduleMap(rows);
      setSchedule(nextSchedule);

      if (!isOverride) {
        const muscle = nextSchedule[activeDay];
        setSelectedMuscle(muscle);
        emitFocus(muscle, activeDay, false);
      }
    } catch {
      setError("Falha ao carregar planilha do forjador.");
      setSchedule(DEFAULT_WEEKLY_SCHEDULE);
    } finally {
      setLoading(false);
    }
  }, [activeDay, emitFocus, isOverride, userId]);

  useEffect(() => {
    if (!initialSchedule?.length) {
      void loadSchedule();
    }
  }, [initialSchedule?.length, loadSchedule]);

  useEffect(() => {
    if (!activeSubgroupId) return;

    const muscle = SUBGROUP_TO_MUSCLE[activeSubgroupId];
    if (!muscle) return;

    setSelectedMuscle(muscle);
    setIsOverride(muscle !== schedule[activeDay]);
  }, [activeDay, activeSubgroupId, schedule]);

  useEffect(() => {
    if (didInitialSyncRef.current) return;
    didInitialSyncRef.current = true;
    emitFocus(selectedMuscle, activeDay, isOverride);
  }, [activeDay, emitFocus, isOverride, selectedMuscle]);

  const selectDay = useCallback(
    (day: WeekdayIndex) => {
      setActiveDay(day);
      setFocusMenuOpen(false);
      if (!isOverride) {
        const muscle = schedule[day];
        setSelectedMuscle(muscle);
        emitFocus(muscle, day, false);
      }
    },
    [emitFocus, isOverride, schedule],
  );

  const applyMuscleOverride = useCallback(
    (muscle: TrainingMuscleGroup) => {
      const override = muscle !== schedule[activeDay];
      setSelectedMuscle(muscle);
      setIsOverride(override);
      setFocusMenuOpen(false);
      emitFocus(muscle, activeDay, override);
    },
    [activeDay, emitFocus, schedule],
  );

  const resetToScheduled = useCallback(() => {
    const muscle = schedule[activeDay];
    setSelectedMuscle(muscle);
    setIsOverride(false);
    setFocusMenuOpen(false);
    emitFocus(muscle, activeDay, false);
  }, [activeDay, emitFocus, schedule]);

  return (
    <div className="space-y-4 border-b border-orange-500/10 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">
            Grade · Segunda a Sábado
          </p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-neutral-600">
            {loading ? "Sincronizando…" : `${WEEKDAY_LABELS[activeDay]} · ${MUSCLE_GROUP_LABELS[selectedMuscle]}`}
            {isOverride ? " · foco alternado" : ""}
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
          const muscle = schedule[day];

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
                {MUSCLE_GROUP_LABELS[muscle]}
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
              const selected = muscle === selectedMuscle;
              return (
                <button
                  key={muscle}
                  type="button"
                  onClick={() => applyMuscleOverride(muscle)}
                  className={`${DASHBOARD_TAP_TARGET} rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] ${
                    selected
                      ? "border-emerald-500 text-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
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
              className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-amber-300/80 hover:underline"
            >
              Restaurar prescrição · {MUSCLE_GROUP_LABELS[scheduledForActiveDay]}
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="text-[10px] text-amber-400/85" role="alert">
          {error} · grade padrão local.
        </p>
      ) : null}
    </div>
  );
}
