"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import {
  FORJA_COMMAND_INNER,
  FORJA_FEEDBACK_ERROR,
  FORJA_FEEDBACK_OK,
  FORJA_GHOST_BUTTON,
  FORJA_INPUT,
  FORJA_LABEL,
  FORJA_META,
  FORJA_PRIMARY_BUTTON,
  FORJA_SECTION_CHIP,
  FORJA_SECTION_TITLE,
} from "@/lib/forja-config";
import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";
import {
  EMPTY_SCIENTIFIC_DRAFT_INPUT,
  formatScientificDate,
  formatScientificNumber,
  parseScientificDraftInput,
  SCIENTIFIC_SKINFOLD_IDS,
  SCIENTIFIC_SKINFOLD_LABELS,
  sumScientificSkinfolds,
  type ScientificMetricsDraftInput,
  type ScientificMetricsEntry,
} from "@/lib/scientific-metrics-types";

const TOUCH_INPUT = `${FORJA_INPUT} min-h-11 text-base sm:text-sm`;
const TOUCH_BUTTON = "min-h-11 min-w-11";

type ScientificMetricsTableProps = {
  athlete: ForjaBondedAthlete;
  entries: ScientificMetricsEntry[];
  onAddEntry: (entry: ScientificMetricsEntry) => void | Promise<void>;
  onSyncLatest: () => void | Promise<void>;
  onDeleteEntry?: (entryId: string) => void | Promise<void>;
  syncing: boolean;
  saving: boolean;
  feedback: { kind: "ok" | "error"; message: string } | null;
  allowDelete?: boolean;
};

export function ScientificMetricsTable({
  athlete,
  entries,
  onAddEntry,
  onSyncLatest,
  onDeleteEntry,
  syncing,
  saving,
  feedback,
  allowDelete = false,
}: ScientificMetricsTableProps) {
  const [draft, setDraft] = useState<ScientificMetricsDraftInput>(() => ({
    ...EMPTY_SCIENTIFIC_DRAFT_INPUT,
    measuredAt: new Date().toISOString().slice(0, 10),
  }));

  const [formError, setFormError] = useState<string | null>(null);

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt)),
    [entries],
  );

  const updateField = useCallback(
    (field: keyof Omit<ScientificMetricsDraftInput, "skinfolds">, value: string) => {
      setDraft((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const updateSkinfold = useCallback((id: (typeof SCIENTIFIC_SKINFOLD_IDS)[number], value: string) => {
    setDraft((current) => ({
      ...current,
      skinfolds: { ...current.skinfolds, [id]: value },
    }));
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const parsed = parseScientificDraftInput(draft);
      if (!parsed.ok) {
        setFormError(parsed.message);
        return;
      }

      setFormError(null);

      const entry: ScientificMetricsEntry = {
        id: crypto.randomUUID(),
        clientId: athlete.clientId,
        forgerId: athlete.forgerId,
        savedAt: new Date().toISOString(),
        syncedAt: null,
        ...parsed.entry,
      };

      await onAddEntry(entry);
      setDraft({
        ...EMPTY_SCIENTIFIC_DRAFT_INPUT,
        measuredAt: new Date().toISOString().slice(0, 10),
        heightCm: draft.heightCm,
      });
    },
    [athlete.clientId, athlete.forgerId, draft, onAddEntry],
  );

  const foldColumnCount = SCIENTIFIC_SKINFOLD_IDS.length;
  const baseColumnCount = 4;
  const totalColumns = baseColumnCount + foldColumnCount + 1 + (allowDelete ? 1 : 0);

  return (
    <div className={FORJA_COMMAND_INNER}>
      <header className="border-b border-zinc-800/80 pb-4">
        <p className={FORJA_SECTION_CHIP}>7 dobras científicas</p>
        <h2 className={FORJA_SECTION_TITLE}>{athlete.displayName}</h2>
        <p className={`${FORJA_META} mt-1`}>
          Registe peso, composição e as 7 dobras (mm). Histórico local · publicar envia só a última
          medição.
        </p>
      </header>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 space-y-4">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Nova medição</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            id="sci-date"
            label="Data"
            type="date"
            value={draft.measuredAt}
            onChange={(value) => updateField("measuredAt", value)}
          />
          <Field
            id="sci-weight"
            label="Peso (kg)"
            inputMode="decimal"
            value={draft.weightKg}
            onChange={(value) => updateField("weightKg", value)}
            placeholder="82,5"
          />
          <Field
            id="sci-height"
            label="Altura (cm)"
            inputMode="decimal"
            value={draft.heightCm}
            onChange={(value) => updateField("heightCm", value)}
            placeholder="178"
          />
          <Field
            id="sci-fat"
            label="Gordura (%)"
            inputMode="decimal"
            value={draft.bodyFatPct}
            onChange={(value) => updateField("bodyFatPct", value)}
            placeholder="14,2"
          />
          <Field
            id="sci-lean"
            label="Massa magra (kg)"
            inputMode="decimal"
            value={draft.leanMassKg}
            onChange={(value) => updateField("leanMassKg", value)}
            placeholder="68,4"
          />
        </div>

        <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
          Dobras cutâneas (mm)
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {SCIENTIFIC_SKINFOLD_IDS.map((id) => (
            <Field
              key={id}
              id={`sci-fold-${id}`}
              label={SCIENTIFIC_SKINFOLD_LABELS[id]}
              inputMode="decimal"
              value={draft.skinfolds[id]}
              onChange={(value) => updateSkinfold(id, value)}
              placeholder="—"
            />
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="submit"
            disabled={saving}
            className={`${FORJA_PRIMARY_BUTTON} ${TOUCH_BUTTON} w-full sm:w-auto`}
          >
            {saving ? "A guardar…" : "Registar medição"}
          </button>
          <button
            type="button"
            disabled={syncing || sortedEntries.length === 0}
            onClick={() => void onSyncLatest()}
            className={`${FORJA_GHOST_BUTTON} ${TOUCH_BUTTON} w-full sm:w-auto`}
          >
            {syncing ? "A publicar…" : "Publicar última medição"}
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-800/80">
        <table className="min-w-[72rem] w-full border-collapse text-left text-xs sm:text-sm">
          <thead className="bg-zinc-950/90 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            <tr>
              <th className="px-3 py-3 font-medium">Data</th>
              <th className="px-3 py-3 font-medium">Peso</th>
              <th className="px-3 py-3 font-medium">Gordura</th>
              <th className="px-3 py-3 font-medium">M. magra</th>
              {SCIENTIFIC_SKINFOLD_IDS.map((id) => (
                <th key={id} className="px-2 py-3 font-medium">
                  {SCIENTIFIC_SKINFOLD_LABELS[id]}
                </th>
              ))}
              <th className="px-3 py-3 font-medium">Σ dobras</th>
              {allowDelete ? <th className="px-3 py-3 font-medium"> </th> : null}
            </tr>
          </thead>
          <tbody>
            {sortedEntries.length === 0 ? (
              <tr>
                <td colSpan={totalColumns} className="px-3 py-8 text-center text-zinc-500">
                  Sem registos. Adicione a primeira medição acima.
                </td>
              </tr>
            ) : (
              sortedEntries.map((entry) => (
                <tr key={entry.id} className="border-t border-zinc-900/80 hover:bg-zinc-950/40">
                  <td className="px-3 py-3 tabular-nums text-zinc-200">
                    {formatScientificDate(entry.measuredAt)}
                    {entry.syncedAt ? (
                      <span className="ml-2 text-[10px] text-emerald-400/80">pub.</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-100">
                    {formatScientificNumber(entry.weightKg)}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-300">
                    {formatScientificNumber(entry.bodyFatPct)}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-300">
                    {formatScientificNumber(entry.leanMassKg)}
                  </td>
                  {SCIENTIFIC_SKINFOLD_IDS.map((id) => (
                    <td key={id} className="px-2 py-3 tabular-nums text-zinc-400">
                      {formatScientificNumber(entry.skinfolds[id])}
                    </td>
                  ))}
                  <td className="px-3 py-3 tabular-nums font-medium text-zinc-200">
                    {formatScientificNumber(sumScientificSkinfolds(entry.skinfolds))}
                  </td>
                  {allowDelete && onDeleteEntry ? (
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => void onDeleteEntry(entry.id)}
                        className={`${FORJA_GHOST_BUTTON} ${TOUCH_BUTTON} px-3 text-[11px] text-red-300/90`}
                      >
                        Remover
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formError ? (
        <p role="alert" className={FORJA_FEEDBACK_ERROR}>
          {formError}
        </p>
      ) : null}

      {feedback ? (
        <p
          role={feedback.kind === "error" ? "alert" : "status"}
          className={feedback.kind === "ok" ? FORJA_FEEDBACK_OK : FORJA_FEEDBACK_ERROR}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "decimal" | "numeric" | "text";
}) {
  return (
    <div>
      <label htmlFor={id} className={FORJA_LABEL}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={TOUCH_INPUT}
      />
    </div>
  );
}
