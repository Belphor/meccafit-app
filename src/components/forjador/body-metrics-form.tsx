"use client";

import { useCallback } from "react";
import {
  BODY_CIRCUMFERENCE_FIELDS,
  type BodyCircumferenceId,
  type BodyMetricsDraft,
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

type BodyMetricsFormProps = {
  draft: BodyMetricsDraft;
  onDraftChange: (draft: BodyMetricsDraft) => void;
  onSaveLocal: () => void;
  onSyncNucleus: () => void;
  savingLocal: boolean;
  syncing: boolean;
  feedback: { kind: "ok" | "error"; message: string } | null;
  disabled?: boolean;
};

export function BodyMetricsForm({
  draft,
  onDraftChange,
  onSaveLocal,
  onSyncNucleus,
  savingLocal,
  syncing,
  feedback,
  disabled = false,
}: BodyMetricsFormProps) {
  const updateField = useCallback(
    (patch: Partial<BodyMetricsDraft>) => {
      onDraftChange({
        ...draft,
        ...patch,
        updatedAt: new Date().toISOString(),
      });
    },
    [draft, onDraftChange],
  );

  const updatePerimetro = useCallback(
    (fieldId: BodyCircumferenceId, value: string) => {
      onDraftChange({
        ...draft,
        perimetros: {
          ...draft.perimetros,
          [fieldId]: value,
        },
        updatedAt: new Date().toISOString(),
      });
    },
    [draft, onDraftChange],
  );

  return (
    <div className={FORJA_COMMAND_INNER}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={FORJA_SECTION_TITLE}>Medidas antropométricas</h2>
          <p className={`${FORJA_META} mt-1`}>
            Peso, altura e perímetros · optimizado para registo rápido na sala.
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

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="body-weight" className={FORJA_LABEL}>
            Peso (kg)
          </label>
          <input
            id="body-weight"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            disabled={disabled}
            value={draft.pesoKg}
            placeholder="Ex.: 82,5"
            onChange={(event) => updateField({ pesoKg: event.target.value })}
            className={`${FORJA_INPUT} min-h-11 text-base sm:text-sm`}
          />
        </div>

        <div>
          <label htmlFor="body-height" className={FORJA_LABEL}>
            Altura (cm)
          </label>
          <input
            id="body-height"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            disabled={disabled}
            value={draft.alturaCm}
            placeholder="Ex.: 178"
            onChange={(event) => updateField({ alturaCm: event.target.value })}
            className={`${FORJA_INPUT} min-h-11 text-base sm:text-sm`}
          />
        </div>
      </div>

      <div className="mt-6">
        <p className={FORJA_LABEL}>Perímetros (cm)</p>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {BODY_CIRCUMFERENCE_FIELDS.map((field) => (
            <div key={field.id}>
              <label htmlFor={`circ-${field.id}`} className="mb-1 block text-[11px] text-zinc-500">
                {field.label}
              </label>
              <input
                id={`circ-${field.id}`}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                disabled={disabled}
                value={draft.perimetros[field.id]}
                placeholder="—"
                onChange={(event) => updatePerimetro(field.id, event.target.value)}
                className={`${FORJA_INPUT} min-h-11 text-base sm:text-sm`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="body-measured-at" className={FORJA_LABEL}>
          Data da medição
        </label>
        <input
          id="body-measured-at"
          type="datetime-local"
          disabled={disabled}
          value={toDatetimeLocalValue(draft.medidoEm)}
          onChange={(event) =>
            updateField({ medidoEm: fromDatetimeLocalValue(event.target.value) })
          }
          className={`${FORJA_INPUT} min-h-11`}
        />
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

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string {
  if (!value.trim()) {
    return new Date().toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}
