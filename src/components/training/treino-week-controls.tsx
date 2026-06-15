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
  WEEKDAY_SHORT_LABELS,
  type PlanilhaDayRow,
  type TrainingMuscleGroup,
  type WeekdayIndex,
} from "@/lib/training-week";
import { DASHBOARD_TAP_TARGET, IRIS_IDLE_BORDER, IRIS_IDLE_SURFACE } from "@/lib/dashboard-config";
import { supabase } from "@/lib/supabase";

const WEEKDAY_INDICES: WeekdayIndex[] = [1, 2, 3, 4, 5, 6];

export type TreinoWeekControlsProps = {
  userId: string;
  initialSchedule?: PlanilhaDayRow[];
  onDayTrainingChange: (payload: {
    muscle: TrainingMuscleGroup;
    subgroupId: string;
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
  initialSchedule,
  onDayTrainingChange,
}: TreinoWeekControlsProps) {
  const boot = useMemo(() => resolveInitialSchedule(initialSchedule), [initialSchedule]);
  const calendarToday = useMemo(() => resolveCalendarWeekdayIndex(), []);

  const [schedule, setSchedule] = useState(boot.schedule);
  const [activeDay, setActiveDay] = useState<WeekdayIndex>(boot.activeDay);
  const [loading, setLoading] = useState(!initialSchedule?.length);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didInitialNavigateRef = useRef(false);

  const activeMuscle = schedule[activeDay];

  const emitTraining = useCallback(
    (muscle: TrainingMuscleGroup, day: WeekdayIndex) => {
      onDayTrainingChange({
        muscle,
        subgroupId: MUSCLE_TO_SUBGROUP_ID[muscle],
        activeDay: day,
      });
    },
    [onDayTrainingChange],
  );

  const persistDayMuscle = useCallback(
    async (day: WeekdayIndex, muscle: TrainingMuscleGroup) => {
      setSaving(true);
      setError(null);

      const { error: upsertError } = await supabase.from("planilhas_forjador").upsert(
        {
          atleta_id: userId,
          dia_semana: day,
          grupo_muscular: muscle,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "atleta_id,dia_semana" },
      );

      setSaving(false);

      if (upsertError) {
        setError(upsertError.message);
        return false;
      }

      return true;
    },
    [userId],
  );

  const applyDayMuscle = useCallback(
    async (day: WeekdayIndex, muscle: TrainingMuscleGroup) => {
      setSchedule((current) => ({ ...current, [day]: muscle }));
      setActiveDay(day);
      emitTraining(muscle, day);
      await persistDayMuscle(day, muscle);
    },
    [emitTraining, persistDayMuscle],
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

      setSchedule(buildScheduleMap(rows));
    } catch {
      setError("Falha ao carregar grade semanal.");
      setSchedule(DEFAULT_WEEKLY_SCHEDULE);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!initialSchedule?.length) {
      void loadSchedule();
    }
  }, [initialSchedule?.length, loadSchedule]);

  useEffect(() => {
    if (didInitialNavigateRef.current) return;
    didInitialNavigateRef.current = true;
    emitTraining(boot.muscle, boot.activeDay);
  }, [boot.activeDay, boot.muscle, emitTraining]);

  const selectDay = useCallback(
    (day: WeekdayIndex) => {
      const muscle = schedule[day];
      setActiveDay(day);
      emitTraining(muscle, day);
    },
    [emitTraining, schedule],
  );

  return (
    <div className="space-y-4 border-b border-orange-500/10 pb-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">
          Semana · Segunda a Sábado
        </p>
        <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-neutral-600">
          {loading
            ? "Sincronizando grade…"
            : `Dia ativo · ${WEEKDAY_LABELS[activeDay]} · ${MUSCLE_GROUP_LABELS[activeMuscle]}`}
          {saving ? " · salvando…" : ""}
        </p>
      </div>

      <div
        className="grid grid-cols-3 gap-2 sm:grid-cols-6"
        role="tablist"
        aria-label="Dias da semana"
      >
        {WEEKDAY_INDICES.map((day) => {
          const isActive = day === activeDay;
          const isToday = day === calendarToday;
          const muscle = schedule[day];

          return (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectDay(day)}
              className={`relative rounded-xl border px-2 py-3 text-center transition-[border-color,box-shadow,background-color,transform] duration-200 active:scale-[0.98] ${
                isActive
                  ? "border-emerald-500/70 bg-emerald-950/30 shadow-[0_0_14px_rgba(16,185,129,0.22)]"
                  : `${IRIS_IDLE_BORDER} ${IRIS_IDLE_SURFACE} hover:border-orange-500/20`
              }`}
            >
              {isToday ? (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
              ) : null}
              <p
                className={`font-mono text-[9px] uppercase tracking-[0.14em] ${
                  isActive ? "text-emerald-200" : "text-neutral-500"
                }`}
              >
                {WEEKDAY_SHORT_LABELS[day]}
              </p>
              <p
                className={`mt-1.5 text-[10px] font-bold uppercase leading-tight tracking-[0.1em] ${
                  isActive ? "text-amber-50" : "text-neutral-500"
                }`}
              >
                {MUSCLE_GROUP_LABELS[muscle]}
              </p>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-cyan-500/12 bg-black/40 p-3 backdrop-blur-sm">
        <p className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-400/70">
          Treino de {WEEKDAY_LABELS[activeDay]}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TRAINING_MUSCLE_GROUPS.map((muscle) => {
            const selected = muscle === activeMuscle;
            return (
              <button
                key={muscle}
                type="button"
                disabled={saving}
                onClick={() => void applyDayMuscle(activeDay, muscle)}
                className={`${DASHBOARD_TAP_TARGET} rounded-lg border px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-[border-color,background-color] duration-200 disabled:opacity-50 ${
                  selected
                    ? "border-emerald-500/60 bg-emerald-950/35 text-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                    : "border-orange-500/10 bg-neutral-950/40 text-neutral-400 hover:border-cyan-500/20 hover:text-neutral-200"
                }`}
              >
                {MUSCLE_GROUP_LABELS[muscle]}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="text-[10px] text-amber-400/85" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
