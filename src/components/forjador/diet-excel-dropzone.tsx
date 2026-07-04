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
import { syncForjaDietBlueprint } from "@/lib/forja-diet-blueprint-sync";
import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";
import {
  parseDietaPlanilhaCsvText,
  parseDietaPlanilhaXlsxBuffer,
  type DietaPlanilhaImportResult,
} from "@/lib/forja-dieta-planilha-import";
import type { ForjaDietBlueprintPayload } from "@/lib/forja-diet-blueprint-sync";
import { DIET_OBJECTIVE_LABELS } from "@/lib/diet-data";

type DietExcelDropzoneProps = {
  athlete: ForjaBondedAthlete | null;
  disabled?: boolean;
  isSovereign?: boolean;
};

type DropPhase = "idle" | "parsing" | "uploading" | "success" | "error";

const ACCEPT = ".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function DietExcelDropzone({
  athlete,
  disabled = false,
  isSovereign = false,
}: DietExcelDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<DropPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<ForjaDietBlueprintPayload | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const uploadBlueprint = useCallback(
    async (parsed: Extract<DietaPlanilhaImportResult, { ok: true }>) => {
      if (!athlete) {
        setPhase("error");
        setMessage(FORJA_COPY.planilhaDieta.selectAthlete);
        return;
      }

      setPhase("uploading");
      setWarnings(parsed.warnings);
      setPreview(parsed.blueprint);

      const result = await syncForjaDietBlueprint(athlete, parsed.blueprint, { isSovereign });

      if (!result.ok) {
        setPhase("error");
        setMessage(result.message);
        return;
      }

      setPhase("success");
      setMessage(
        FORJA_COPY.planilhaDieta.success(
          athlete.displayName,
          parsed.blueprint.titulo,
          parsed.blueprint.refeicoes.length,
        ),
      );
    },
    [athlete, isSovereign],
  );

  const parseFile = useCallback(
    async (file: File) => {
      setPhase("parsing");
      setMessage(null);
      setPreview(null);
      setWarnings([]);

      const lower = file.name.toLowerCase();

      try {
        let parsed: DietaPlanilhaImportResult;

        if (lower.endsWith(".csv")) {
          const text = await file.text();
          parsed = parseDietaPlanilhaCsvText(text);
        } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
          const buffer = await file.arrayBuffer();
          parsed = await parseDietaPlanilhaXlsxBuffer(buffer);
        } else {
          setPhase("error");
          setMessage("Formato não suportado. Use .csv ou .xlsx.");
          return;
        }

        if (!parsed.ok) {
          setPhase("error");
          setMessage(parsed.message);
          return;
        }

        await uploadBlueprint(parsed);
      } catch {
        setPhase("error");
        setMessage("Não foi possível ler o ficheiro.");
      }
    },
    [uploadBlueprint],
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
    <section aria-label="Importar planilha de dieta">
      <div className={FORJA_COMMAND_INNER}>
        <p className={FORJA_SECTION_CHIP}>Google Sheets · Dieta</p>
        <h2 className={`${FORJA_SECTION_TITLE} mt-1`}>{FORJA_COPY.planilhaDieta.title}</h2>
        <p className={`${FORJA_META} mt-1`}>{FORJA_COPY.planilhaDieta.hint}</p>
        <p className={`${FORJA_META} mt-2`}>
          Modelo de exemplo:{" "}
          <a
            href="/templates/dieta-google-sheets-exemplo.csv"
            download
            className="text-emerald-400/90 underline underline-offset-2 hover:text-emerald-300"
          >
            dieta-google-sheets-exemplo.csv
          </a>
        </p>
        {athlete ? (
          <p className={`${FORJA_META} mt-2 text-zinc-300`}>Atleta · {athlete.displayName}</p>
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
            {isBusy ? FORJA_COPY.planilhaDieta.dropBusy : FORJA_COPY.planilhaDieta.drop}
          </p>
          <p className={`${FORJA_META} mt-2 max-w-lg`}>{FORJA_COPY.planilhaDieta.columns}</p>
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
            disabled={disabled || isBusy || !athlete}
            onClick={() => inputRef.current?.click()}
          >
            {FORJA_COPY.planilhaDieta.chooseFile}
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
            {FORJA_COPY.planilhaDieta.clearPreview}
          </button>
        </div>

        {warnings.length > 0 ? (
          <ul className={`${FORJA_META} mt-4 list-disc space-y-1 pl-5 text-amber-400/90`}>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}

        {preview ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800/80 p-4">
            <p className="text-sm font-medium text-zinc-100">{preview.titulo}</p>
            <p className={`${FORJA_META} mt-1`}>
              {DIET_OBJECTIVE_LABELS[preview.objetivo]} · {preview.caloriasAlvo} kcal ·{" "}
              {preview.proteinasG}g P · {preview.carboidratosG}g C · {preview.gordurasG}g G ·{" "}
              {preview.aguaLitros}L água
            </p>
            {preview.refeicoes.length > 0 ? (
              <ul className={`${FORJA_META} mt-3 space-y-1`}>
                {preview.refeicoes.map((meal) => (
                  <li key={meal.id}>
                    {meal.nome}
                    {meal.horario ? ` (${meal.horario})` : ""} · {meal.itens.length} alimento(s)
                  </li>
                ))}
              </ul>
            ) : null}
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
