"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildScheduleMap,
  CLIENT_TRAINING_MUSCLE_GROUPS,
  DEFAULT_WEEKLY_SCHEDULE,
  formatScheduleDayLabel,
  MAX_PLANILHA_GRUPOS_POR_DIA,
  MUSCLE_GROUP_LABELS,
  parsePlanilhaDayRows,
  resolveCalendarWeekdayIndex,
  scheduleDayIncludesClientMuscle,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT_LABELS,
  type ClientTrainingMuscleGroup,
  type PlanilhaDayRow,
  type WeekdayIndex,
} from "@/lib/training-week";
import type { ForjadorTreinoConfig } from "@/lib/forjador-prescriptions";
import { DASHBOARD_TAP_TARGET, IRIS_IDLE_BORDER, IRIS_IDLE_SURFACE } from "@/lib/dashboard-config";
import { supabase } from "@/lib/supabase";

const WEEKDAY_INDICES: WeekdayIndex[] = [1, 2, 3, 4, 5, 6];

export type TreinoWeekControlsProps = {
  userId: string;
  initialSchedule?: PlanilhaDayRow[];
  activeTreinoMuscle: ClientTrainingMuscleGroup;
  isTreinoSwitching: boolean;
  hasForjadorPlan: boolean;
  forjadorConfig: ForjadorTreinoConfig;
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
  activeTreinoMuscle,
  isTreinoSwitching,
  hasForjadorPlan,
  forjadorConfig,
  indicatedDay,
  onIndicatedDayChange,
  onTrainingMusclePick,
}: TreinoWeekControlsProps) {
  const bootSchedule = useMemo(() => resolveInitialSchedule(initialSchedule), [initialSchedule]);
  const calendarToday = useMemo(() => resolveCalendarWeekdayIndex(), []);

  const [schedule, setSchedule] = useState(bootSchedule);
  const [loadingIndication, setLoadingIndication] = useState(!initialSchedule?.length);
  const [error, setError] = useState<string | null>(null);

  const indicatedMuscles = schedule[indicatedDay];
  const indicatedDayLabel = formatScheduleDayLabel(indicatedMuscles);
  const activeLabel = MUSCLE_GROUP_LABELS[activeTreinoMuscle];

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
      setError("Falha ao carregar indicação semanal.");
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
    <div className="space-y-4 border-b border-orange-500/10 pb-5">
      <section
        className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/25 to-black/50 shadow-[0_0_24px_rgba(16,185,129,0.08)]"
        aria-label="Escolha o treino de hoje"
      >
        <div className="border-b border-emerald-500/10 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-400/85">
            Escolha o treino de hoje
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Executando</p>
            <p
              className="text-lg font-bold uppercase tracking-[0.12em] text-amber-50 transition-opacity duration-150"
              style={{ opacity: isTreinoSwitching ? 0.55 : 1 }}
            >
              {activeLabel}
              {isTreinoSwitching ? "…" : ""}
            </p>
          </div>
          {hasForjadorPlan ? (
            <p className="mt-1.5 text-[9px] uppercase tracking-[0.12em] text-neutral-600">
              {`Planilha do forjador · descanso ${forjadorConfig.descansoPadraoSeg}s · cardio ${forjadorConfig.cardioMetaMinutos} min`}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-5">
          {CLIENT_TRAINING_MUSCLE_GROUPS.map((muscle) => {
            const selected = muscle === activeTreinoMuscle;
            const disabled = isTreinoSwitching && !selected;

            return (
              <button
                key={muscle}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                aria-label={`Treinar ${MUSCLE_GROUP_LABELS[muscle]}`}
                onClick={(event) => {
                  event.preventDefault();
                  if (muscle !== activeTreinoMuscle) {
                    onTrainingMusclePick(muscle);
                  }
                }}
                className={`${DASHBOARD_TAP_TARGET} relative rounded-xl border px-2 py-3 text-center transition-[border-color,background-color,box-shadow,transform,opacity] duration-200 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 ${
                  selected
                    ? "border-emerald-400/70 bg-emerald-950/45 text-emerald-50 shadow-[0_0_16px_rgba(16,185,129,0.28)]"
                    : "border-orange-500/12 bg-neutral-950/50 text-neutral-400 hover:border-cyan-500/25 hover:text-neutral-100"
                }`}
              >
                {selected ? (
                  <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
                ) : null}
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em]">
                  {MUSCLE_GROUP_LABELS[muscle]}
                </span>
              </button>
            );
          })}
        </div>

        <p className="border-t border-emerald-500/8 px-4 py-2.5 text-[9px] uppercase tracking-[0.12em] text-neutral-600">
          Até {MAX_PLANILHA_GRUPOS_POR_DIA} grupos por dia · ex.: peito · ombros · braços · costas · abdômen
        </p>
      </section>

      <section aria-label="Indicação semanal do forjador">
        <div className="mb-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400/70">
            Indicação · Segunda a Sábado
          </p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-neutral-600">
            {loadingIndication
              ? "Sincronizando indicação…"
              : `${WEEKDAY_LABELS[indicatedDay]} sugere ${indicatedDayLabel} · referência apenas`}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="group">
          {WEEKDAY_INDICES.map((day) => {
            const isSelected = day === indicatedDay;
            const isToday = day === calendarToday;
            const muscles = schedule[day];
            const dayLabel = formatScheduleDayLabel(muscles);
            const matchesChoice = scheduleDayIncludesClientMuscle(muscles, activeTreinoMuscle);

            return (
              <button
                key={day}
                type="button"
                aria-pressed={isSelected}
                onClick={(event) => {
                  event.preventDefault();
                  if (day !== indicatedDay) onIndicatedDayChange(day);
                }}
                className={`relative rounded-xl border px-2 py-2.5 text-center transition-[border-color,background-color] duration-200 ${
                  isSelected
                    ? "border-cyan-500/40 bg-cyan-950/15"
                    : `${IRIS_IDLE_BORDER} ${IRIS_IDLE_SURFACE} hover:border-orange-500/15`
                }`}
              >
                {isToday ? (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                ) : null}
                <p
                  className={`font-mono text-[9px] uppercase tracking-[0.14em] ${
                    isSelected ? "text-cyan-200/90" : "text-neutral-500"
                  }`}
                >
                  {WEEKDAY_SHORT_LABELS[day]}
                </p>
                <p
                  className={`mt-1 text-[9px] font-bold uppercase leading-tight tracking-[0.08em] ${
                    matchesChoice ? "text-emerald-300/90" : "text-neutral-500"
                  }`}
                >
                  {dayLabel}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {error ? (
        <p className="text-[10px] text-amber-400/85" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
