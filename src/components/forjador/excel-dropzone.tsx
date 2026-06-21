"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import {
  FORJA_COMMAND_INNER,
  FORJA_FEEDBACK_ERROR,
  FORJA_FEEDBACK_OK,
  FORJA_GHOST_BUTTON,
  FORJA_META,
  FORJA_PRIMARY_BUTTON,
  FORJA_SECTION_CHIP,
  FORJA_SECTION_TITLE,
} from "@/lib/forja-config";
import { FORJA_COPY } from "@/lib/forja-copy";
import { batchUpsertPlanilhasForjador } from "@/lib/forja-sovereign-actions";
import {
  parsePlanilhaCsvText,
  parsePlanilhaXlsxBuffer,
  type PlanilhaImportRow,
} from "@/lib/forja-planilha-import";
import { WEEKDAY_LABELS, type WeekdayIndex } from "@/lib/training-week";

type ExcelDropzoneProps = {
  atletaId: string | null;
  atletaName?: string | null;
  disabled?: boolean;
};

type DropPhase = "idle" | "parsing" | "uploading" | "success" | "error";

const ACCEPT = ".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function ExcelDropzone({ atletaId, atletaName, disabled = false }: ExcelDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<DropPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<PlanilhaImportRow[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const uploadRows = useCallback(
    async (rows: PlanilhaImportRow[], importWarnings: string[]) => {
      if (!atletaId) {
        setPhase("error");
        setMessage(FORJA_COPY.planilha.selectAthlete);
        return;
      }

      setPhase("uploading");
      setWarnings(importWarnings);
      setPreview(rows);

      const result = await batchUpsertPlanilhasForjador(atletaId, rows);

      if (!result.ok) {
        setPhase("error");
        setMessage(result.message);
        return;
      }

      const upserted = Number(result.data.rows_upserted ?? rows.length);
      setPhase("success");
      setMessage(FORJA_COPY.planilha.success(atletaName ?? "atleta", upserted));
    },
    [atletaId, atletaName],
  );

  const parseFile = useCallback(
    async (file: File) => {
      setPhase("parsing");
      setMessage(null);
      setPreview(null);
      setWarnings([]);

      const lower = file.name.toLowerCase();

      try {
        if (lower.endsWith(".csv")) {
          const text = await file.text();
          const parsed = parsePlanilhaCsvText(text);
          if (!parsed.ok) {
            setPhase("error");
            setMessage(parsed.message);
            return;
          }
          await uploadRows(parsed.rows, parsed.warnings);
          return;
        }

        if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
          const buffer = await file.arrayBuffer();
          const parsed = await parsePlanilhaXlsxBuffer(buffer);
          if (!parsed.ok) {
            setPhase("error");
            setMessage(parsed.message);
            return;
          }
          await uploadRows(parsed.rows, parsed.warnings);
          return;
        }

        setPhase("error");
        setMessage("Formato não suportado. Use .csv ou .xlsx.");
      } catch {
        setPhase("error");
        setMessage("Não foi possível ler o ficheiro.");
      }
    },
    [uploadRows],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file || disabled) return;
      void parseFile(file);
    },
    [disabled, parseFile],
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (disabled) return;
      handleFiles(event.dataTransfer.files);
    },
    [disabled, handleFiles],
  );

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const isBusy = phase === "parsing" || phase === "uploading";

  return (
    <section aria-label="Importar planilha semanal">
      <div className={FORJA_COMMAND_INNER}>
        <p className={FORJA_SECTION_CHIP}>Rotina semanal</p>
        <h2 className={`${FORJA_SECTION_TITLE} mt-1`}>{FORJA_COPY.planilha.title}</h2>
        <p className={`${FORJA_META} mt-1`}>{FORJA_COPY.planilha.hint}</p>
        {atletaName ? (
          <p className={`${FORJA_META} mt-2 text-zinc-300`}>Atleta · {atletaName}</p>
        ) : null}

        <div
          role="button"
          tabIndex={0}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
          }}
          className={`mt-4 flex min-h-[10rem] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition ${
            disabled
              ? "cursor-not-allowed border-zinc-800/60 opacity-50"
              : "border-zinc-700/70 bg-black/25 hover:border-zinc-600 hover:bg-zinc-950/40"
          }`}
          onClick={() => {
            if (!disabled && !isBusy) inputRef.current?.click();
          }}
        >
          <p className="text-sm font-medium text-zinc-200">
            {isBusy ? FORJA_COPY.planilha.dropBusy : FORJA_COPY.planilha.drop}
          </p>
          <p className={`${FORJA_META} mt-2 max-w-lg`}>{FORJA_COPY.planilha.columns}</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            disabled={disabled || isBusy}
            onChange={(event) => handleFiles(event.target.files)}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className={FORJA_PRIMARY_BUTTON}
            disabled={disabled || isBusy}
            onClick={() => inputRef.current?.click()}
          >
            {FORJA_COPY.planilha.chooseFile}
          </button>
          <button
            type="button"
            className={FORJA_GHOST_BUTTON}
            disabled={!preview || isBusy}
            onClick={() => {
              setPreview(null);
              setWarnings([]);
              setMessage(null);
              setPhase("idle");
            }}
          >
            {FORJA_COPY.planilha.clearPreview}
          </button>
        </div>

        {warnings.length > 0 ? (
          <ul className={`${FORJA_META} mt-4 list-disc space-y-1 pl-5 text-amber-400/90`}>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}

        {preview && preview.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800/80">
            <table className="min-w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-950/80 text-xs text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Dia</th>
                  <th className="px-3 py-2 font-medium">Grupo</th>
                  <th className="px-3 py-2 font-medium">Ordem</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr
                    key={`${row.dia_semana}-${row.grupo_muscular}-${row.ordem}`}
                    className="border-t border-zinc-900"
                  >
                    <td className="px-3 py-2">
                      {WEEKDAY_LABELS[row.dia_semana as WeekdayIndex]} ({row.dia_semana})
                    </td>
                    <td className="px-3 py-2">{row.grupo_muscular}</td>
                    <td className="px-3 py-2 tabular-nums">{row.ordem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {message ? (
          <p
            role={phase === "error" ? "alert" : "status"}
            className={phase === "error" ? FORJA_FEEDBACK_ERROR : FORJA_FEEDBACK_OK}
          >
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
