"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildScheduleMap,
  CLIENT_TRAINING_MUSCLE_GROUPS,
  DEFAULT_WEEKLY_SCHEDULE,
  MUSCLE_GROUP_LABELS,
  normalizeWeeklyScheduleMuscle,
  resolveCalendarWeekdayIndex,
  subgroupIdToClientTrainingMuscle,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT_LABELS,
  type ClientTrainingMuscleGroup,
  type PlanilhaDayRow,
  type WeekdayIndex,
} from "@/lib/training-week";
import { DASHBOARD_TAP_TARGET, IRIS_IDLE_BORDER, IRIS_IDLE_SURFACE } from "@/lib/dashboard-config";
import { supabase } from "@/lib/supabase";

const WEEKDAY_INDICES: WeekdayIndex[] = [1, 2, 3, 4, 5, 6];

export type TreinoWeekControlsProps = {
  userId: string;
  initialSchedule?: PlanilhaDayRow[];
  activeSubgroupId: string;
  indicatedDay: WeekdayIndex;
  onIndicatedDayChange: (day: WeekdayIndex) => void;
  onTrainingMusclePick: (muscle: ClientTrainingMuscleGroup) => void;
};

function resolveInitialSchedule(initialSchedule?: PlanilhaDayRow[]) {
  return buildScheduleMap(initialSchedule ?? []);
}

export function TreinoWeekControls({
  userId,
  initialSchedule,
  activeSubgroupId,
  indicatedDay,
  onIndicatedDayChange,
  onTrainingMusclePick,
}: TreinoWeekControlsProps) {
  const bootSchedule = useMemo(() => resolveInitialSchedule(initialSchedule), [initialSchedule]);
  const calendarToday = useMemo(() => resolveCalendarWeekdayIndex(), []);

  const [schedule, setSchedule] = useState(bootSchedule);
  const [loading, setLoading] = useState(!initialSchedule?.length);
  const [error, setError] = useState<string | null>(null);

  const indicatedMuscle = schedule[indicatedDay];
  const activeTrainingMuscle =
    subgroupIdToClientTrainingMuscle(activeSubgroupId) ?? indicatedMuscle;

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
          const muscle = normalizeWeeklyScheduleMuscle(row.grupo_muscular);
          const day = Number(row.dia_semana) as WeekdayIndex;
          if (!muscle || day < 1 || day > 6) return null;
          return { dia_semana: day, grupo_muscular: muscle };
        })
        .filter((row): row is PlanilhaDayRow => row !== null);

      setSchedule(buildScheduleMap(rows));
    } catch {
      setError("Falha ao carregar indicação semanal.");
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

  const selectIndicatedDay = useCallback(
    (day: WeekdayIndex) => {
      if (day !== indicatedDay) {
        onIndicatedDayChange(day);
      }
    },
    [indicatedDay, onIndicatedDayChange],
  );

  return (
    <div className="space-y-4 border-b border-orange-500/10 pb-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">
          Indicação · Segunda a Sábado
        </p>
        <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-neutral-600">
          {loading
            ? "Sincronizando indicação…"
            : `${WEEKDAY_LABELS[indicatedDay]} · indica ${MUSCLE_GROUP_LABELS[indicatedMuscle]}`}
        </p>
        <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-neutral-700">
          Referência da planilha · sua escolha de treino é livre abaixo
        </p>
      </div>

      <div
        className="grid grid-cols-3 gap-2 sm:grid-cols-6"
        role="group"
        aria-label="Indicação de treino por dia"
      >
        {WEEKDAY_INDICES.map((day) => {
          const isSelected = day === indicatedDay;
          const isToday = day === calendarToday;
          const muscle = schedule[day];

          return (
            <button
              key={day}
              type="button"
              aria-pressed={isSelected}
              onClick={(event) => {
                event.preventDefault();
                selectIndicatedDay(day);
              }}
              className={`relative rounded-xl border px-2 py-3 text-center transition-[border-color,box-shadow,background-color,transform] duration-200 active:scale-[0.98] ${
                isSelected
                  ? "border-cyan-500/50 bg-cyan-950/20 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                  : `${IRIS_IDLE_BORDER} ${IRIS_IDLE_SURFACE} hover:border-orange-500/20`
              }`}
            >
              {isToday ? (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
              ) : null}
              <p
                className={`font-mono text-[9px] uppercase tracking-[0.14em] ${
                  isSelected ? "text-cyan-200" : "text-neutral-500"
                }`}
              >
                {WEEKDAY_SHORT_LABELS[day]}
              </p>
              <p
                className={`mt-1.5 text-[10px] font-bold uppercase leading-tight tracking-[0.1em] ${
                  isSelected ? "text-amber-50/90" : "text-neutral-500"
                }`}
              >
                {MUSCLE_GROUP_LABELS[muscle]}
              </p>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-emerald-500/15 bg-black/40 p-3 backdrop-blur-sm">
        <p className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-400/75">
          Escolha o treino de hoje
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CLIENT_TRAINING_MUSCLE_GROUPS.map((muscle) => {
            const selected = muscle === activeTrainingMuscle;
            return (
              <button
                key={muscle}
                type="button"
                onClick={() => onTrainingMusclePick(muscle)}
                className={`${DASHBOARD_TAP_TARGET} rounded-lg border px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-[border-color,background-color] duration-200 ${
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
        <p className="mt-2.5 text-[9px] uppercase tracking-[0.12em] text-neutral-600">
          Abdômen integrado nos exercícios dos membros · sem dia exclusivo
        </p>
      </div>

      {error ? (
        <p className="text-[10px] text-amber-400/85" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
