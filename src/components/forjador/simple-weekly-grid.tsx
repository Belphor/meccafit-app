"use client";

import { useCallback, useMemo, useState } from "react";
import {
  compileDayNotas,
  createEmptyMealEntry,
  DIET_MEAL_SLOT_IDS,
  DIET_MEAL_SLOT_LABELS,
  DIET_WEEK_DAY_IDS,
  DIET_WEEK_DAY_LABELS,
  type DietMealEntry,
  type DietMealSlotId,
  type DietWeekDayId,
  type WeeklyDietDraft,
} from "@/lib/forjador-vip-types";
import { formatBrasiliaDate, resolveBrasiliaDietDayId } from "@/lib/brasilia-time";
import {
  FORJA_COMMAND_INNER,
  FORJA_FEEDBACK_ERROR,
  FORJA_FEEDBACK_OK,
  FORJA_GHOST_BUTTON,
  FORJA_INPUT,
  FORJA_LABEL,
  FORJA_META,
  FORJA_PRIMARY_BUTTON,
  FORJA_SECTION_TITLE,
} from "@/lib/forja-config";

type SimpleWeeklyGridProps = {
  draft: WeeklyDietDraft;
  onDraftChange: (draft: WeeklyDietDraft) => void;
  onSaveLocal: () => void;
  onSyncNucleus: () => void;
  savingLocal: boolean;
  syncing: boolean;
  feedback: { kind: "ok" | "error"; message: string } | null;
  disabled?: boolean;
};

export function SimpleWeeklyGrid({
  draft,
  onDraftChange,
  onSaveLocal,
  onSyncNucleus,
  savingLocal,
  syncing,
  feedback,
  disabled = false,
}: SimpleWeeklyGridProps) {
  const defaultDay = useMemo(() => resolveBrasiliaDietDayId(), []);
  const [expandedDay, setExpandedDay] = useState<DietWeekDayId>(defaultDay);

  const updateDay = useCallback(
    (dayId: DietWeekDayId, patch: Partial<WeeklyDietDraft["dias"][DietWeekDayId]>) => {
      const current = draft.dias[dayId];
      const nextDay = { ...current, ...patch };
      onDraftChange({
        ...draft,
        dias: {
          ...draft.dias,
          [dayId]: {
            ...nextDay,
            notas: compileDayNotas(nextDay),
          },
        },
        updatedAt: new Date().toISOString(),
      });
    },
    [draft, onDraftChange],
  );

  const addMeal = useCallback(
    (dayId: DietWeekDayId, slotId: DietMealSlotId) => {
      const current = draft.dias[dayId];
      if (current.refeicoes.some((meal) => meal.id === slotId)) return;
      updateDay(dayId, {
        refeicoes: [...current.refeicoes, createEmptyMealEntry(slotId)],
      });
    },
    [draft.dias, updateDay],
  );

  const updateMeal = useCallback(
    (dayId: DietWeekDayId, slotId: DietMealSlotId, conteudo: string) => {
      const current = draft.dias[dayId];
      updateDay(dayId, {
        refeicoes: current.refeicoes.map((meal) =>
          meal.id === slotId ? { ...meal, conteudo } : meal,
        ),
      });
    },
    [draft.dias, updateDay],
  );

  const removeMeal = useCallback(
    (dayId: DietWeekDayId, slotId: DietMealSlotId) => {
      const current = draft.dias[dayId];
      updateDay(dayId, {
        refeicoes: current.refeicoes.filter((meal) => meal.id !== slotId),
      });
    },
    [draft.dias, updateDay],
  );

  const completedCount = DIET_WEEK_DAY_IDS.filter((dayId) => draft.dias[dayId].concluido).length;

  return (
    <div className={FORJA_COMMAND_INNER}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={FORJA_SECTION_TITLE}>Plano da semana</h2>
          <p className={`${FORJA_META} mt-1`}>
            Semana {draft.semanaRef} · {completedCount} de 7 dias concluídos · horário de Brasília
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={onSaveLocal}
            disabled={disabled || savingLocal}
            className={`${FORJA_GHOST_BUTTON} w-full sm:w-auto`}
          >
            {savingLocal ? "Guardando…" : "Guardar rascunho"}
          </button>
          <button
            type="button"
            onClick={onSyncNucleus}
            disabled={disabled || syncing}
            className={`${FORJA_PRIMARY_BUTTON} w-full sm:w-auto`}
          >
            {syncing ? "Publicando…" : "Publicar para o cliente"}
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {DIET_WEEK_DAY_IDS.map((dayId) => {
          const entry = draft.dias[dayId];
          const toggleId = `diet-day-${dayId}`;
          const isExpanded = expandedDay === dayId;
          const preview = compileDayNotas(entry);
          const availableSlots = DIET_MEAL_SLOT_IDS.filter(
            (slotId) => !entry.refeicoes.some((meal) => meal.id === slotId),
          );

          return (
            <article
              key={dayId}
              className={[
                "rounded-xl border bg-black/30 transition-colors",
                isExpanded ? "border-zinc-600/70" : "border-zinc-800/80",
              ].join(" ")}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => setExpandedDay(dayId)}
                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left sm:px-4"
              >
                <span className="text-sm font-medium text-zinc-100">
                  {DIET_WEEK_DAY_LABELS[dayId]}
                  {dayId === defaultDay ? (
                    <span className="ml-2 text-[10px] font-normal text-amber-400/80">Hoje</span>
                  ) : null}
                  {entry.refeicoes.length > 0 ? (
                    <span className="ml-2 text-[10px] font-normal text-zinc-500">
                      · {entry.refeicoes.filter((m) => m.conteudo.trim()).length} refeições
                    </span>
                  ) : null}
                </span>
                <span
                  className={[
                    "rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                    entry.concluido
                      ? "border-emerald-700/70 bg-emerald-950/50 text-emerald-200"
                      : "border-zinc-700/80 bg-zinc-950/40 text-zinc-400",
                  ].join(" ")}
                >
                  {entry.concluido ? "Concluído" : "Pendente"}
                </span>
              </button>

              {isExpanded ? (
                <div className="border-t border-zinc-800/80 px-3 pb-4 pt-2 sm:px-4">
                  <div className="mb-3 flex justify-end">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={entry.concluido}
                      disabled={disabled}
                      onClick={() => updateDay(dayId, { concluido: !entry.concluido })}
                      className={`${FORJA_GHOST_BUTTON} text-xs`}
                    >
                      {entry.concluido ? "Marcar pendente" : "Marcar concluído"}
                    </button>
                  </div>

                  {entry.refeicoes.length > 0 ? (
                    <div className="space-y-3">
                      {entry.refeicoes.map((meal) => (
                        <MealSlotEditor
                          key={`${dayId}-${meal.id}`}
                          meal={meal}
                          disabled={disabled}
                          inputId={`${toggleId}-${meal.id}`}
                          onChange={(conteudo) => updateMeal(dayId, meal.id, conteudo)}
                          onRemove={() => removeMeal(dayId, meal.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      Nenhuma refeição adicionada. Use os botões abaixo para começar.
                    </p>
                  )}

                  {availableSlots.length > 0 ? (
                    <div className="mt-4">
                      <p className={FORJA_LABEL}>Adicionar refeição</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {availableSlots.map((slotId) => (
                          <button
                            key={slotId}
                            type="button"
                            disabled={disabled}
                            onClick={() => addMeal(dayId, slotId)}
                            className={`${FORJA_GHOST_BUTTON} text-xs`}
                          >
                            + {DIET_MEAL_SLOT_LABELS[slotId]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : preview ? (
                <p className="truncate px-3 pb-3 text-xs text-zinc-500 sm:px-4">{preview}</p>
              ) : null}
            </article>
          );
        })}
      </div>

      {draft.syncedAt ? (
        <p className={`${FORJA_META} mt-4 text-zinc-500`}>
          Última publicação:{" "}
          {formatBrasiliaDate(new Date(draft.syncedAt), {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      ) : null}

      {feedback ? (
        <p
          className={feedback.kind === "ok" ? FORJA_FEEDBACK_OK : FORJA_FEEDBACK_ERROR}
          role="status"
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}

function MealSlotEditor({
  meal,
  disabled,
  inputId,
  onChange,
  onRemove,
}: {
  meal: DietMealEntry;
  disabled: boolean;
  inputId: string;
  onChange: (conteudo: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
          {DIET_MEAL_SLOT_LABELS[meal.id]}
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className={`${FORJA_GHOST_BUTTON} px-2 py-1 text-[10px] text-red-300/80`}
        >
          Remover
        </button>
      </div>
      <textarea
        id={inputId}
        value={meal.conteudo}
        disabled={disabled}
        rows={3}
        placeholder="Alimentos, quantidades, substituições…"
        onChange={(event) => onChange(event.target.value)}
        className={`${FORJA_INPUT} min-h-11 resize-y py-3`}
      />
    </div>
  );
}
