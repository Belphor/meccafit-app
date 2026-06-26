"use client";

import { useCallback } from "react";
import {
  DIET_WEEK_DAY_IDS,
  DIET_WEEK_DAY_LABELS,
  type DietWeekDayId,
  type WeeklyDietDraft,
} from "@/lib/forjador-vip-types";
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
  const updateDay = useCallback(
    (dayId: DietWeekDayId, patch: Partial<WeeklyDietDraft["dias"][DietWeekDayId]>) => {
      onDraftChange({
        ...draft,
        dias: {
          ...draft.dias,
          [dayId]: {
            ...draft.dias[dayId],
            ...patch,
          },
        },
        updatedAt: new Date().toISOString(),
      });
    },
    [draft, onDraftChange],
  );

  const completedCount = DIET_WEEK_DAY_IDS.filter((dayId) => draft.dias[dayId].concluido).length;

  return (
    <div className={FORJA_COMMAND_INNER}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={FORJA_SECTION_TITLE}>Dieta semanal</h2>
          <p className={`${FORJA_META} mt-1`}>
            Semana {draft.semanaRef} · {completedCount}/7 dias concluídos
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={onSaveLocal}
            disabled={disabled || savingLocal}
            className={`${FORJA_GHOST_BUTTON} w-full sm:w-auto`}
          >
            {savingLocal ? "A guardar…" : "Guardar local"}
          </button>
          <button
            type="button"
            onClick={onSyncNucleus}
            disabled={disabled || syncing}
            className={`${FORJA_PRIMARY_BUTTON} w-full sm:w-auto`}
          >
            {syncing ? "A sincronizar…" : "Salvar no núcleo"}
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {DIET_WEEK_DAY_IDS.map((dayId) => {
          const entry = draft.dias[dayId];
          const toggleId = `diet-day-${dayId}`;

          return (
            <article
              key={dayId}
              className="rounded-xl border border-zinc-800/80 bg-black/30 p-3 sm:p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={`${toggleId}-notes`} className="text-sm font-medium text-zinc-100">
                  {DIET_WEEK_DAY_LABELS[dayId]}
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={entry.concluido}
                  aria-label={`Marcar ${DIET_WEEK_DAY_LABELS[dayId]} como concluído`}
                  disabled={disabled}
                  onClick={() => updateDay(dayId, { concluido: !entry.concluido })}
                  className={[
                    "inline-flex min-h-11 min-w-[7.5rem] items-center justify-center rounded-xl border px-3 text-xs font-semibold uppercase tracking-wide transition",
                    entry.concluido
                      ? "border-emerald-700/70 bg-emerald-950/50 text-emerald-200"
                      : "border-zinc-700/80 bg-zinc-950/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200",
                    disabled ? "cursor-not-allowed opacity-45" : "",
                  ].join(" ")}
                >
                  {entry.concluido ? "Concluído" : "Pendente"}
                </button>
              </div>

              <div className="mt-3">
                <label htmlFor={`${toggleId}-notes`} className={FORJA_LABEL}>
                  Plano / observações
                </label>
                <textarea
                  id={`${toggleId}-notes`}
                  value={entry.notas}
                  disabled={disabled}
                  rows={3}
                  placeholder="Refeições, macros, hidratação…"
                  onChange={(event) => updateDay(dayId, { notas: event.target.value })}
                  className={`${FORJA_INPUT} min-h-11 resize-y py-3`}
                />
              </div>
            </article>
          );
        })}
      </div>

      {draft.syncedAt ? (
        <p className={`${FORJA_META} mt-4 text-zinc-500`}>
          Última sincronização no núcleo:{" "}
          {new Date(draft.syncedAt).toLocaleString("pt-PT")}
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
