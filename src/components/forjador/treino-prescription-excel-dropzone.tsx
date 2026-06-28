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
import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";
import { batchSyncTreinoPrescriptionsFromPlanilha } from "@/lib/forja-prescription-sync";
import {
  parseTreinoPlanilhaCsvText,
  parseTreinoPlanilhaXlsxBuffer,
  type TreinoPlanilhaImportRow,
} from "@/lib/forja-treino-planilha-import";

type TreinoPrescriptionExcelDropzoneProps = {
  athlete: ForjaBondedAthlete | null;
  disabled?: boolean;
};

type DropPhase = "idle" | "parsing" | "uploading" | "success" | "error";

const ACCEPT = ".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function TreinoPrescriptionExcelDropzone({
  athlete,
  disabled = false,
}: TreinoPrescriptionExcelDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<DropPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<TreinoPlanilhaImportRow[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const uploadRows = useCallback(
    async (
      rows: TreinoPlanilhaImportRow[],
      descansoPadraoSeg: number | null,
      importWarnings: string[],
    ) => {
      if (!athlete) {
        setPhase("error");
        setMessage(FORJA_COPY.planilhaTreino.selectAthlete);
        return;
      }

      setPhase("uploading");
      setWarnings(importWarnings);
      setPreview(rows);

      const result = await batchSyncTreinoPrescriptionsFromPlanilha(
        athlete,
        rows,
        descansoPadraoSeg,
      );

      if (!result.ok) {
        setPhase("error");
        setMessage(result.message);
        return;
      }

      setPhase("success");
      setMessage(
        FORJA_COPY.planilhaTreino.success(athlete.displayName, result.upserted),
      );
    },
    [athlete],
  );

  const parseFile = useCallback(
    async (file: File) => {
      setPhase("parsing");
      setMessage(null);
      setPreview(null);
      setWarnings([]);

      const lower = file.name.toLowerCase();

      try {
        let parsed;

        if (lower.endsWith(".csv")) {
          parsed = parseTreinoPlanilhaCsvText(await file.text());
        } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
          parsed = await parseTreinoPlanilhaXlsxBuffer(await file.arrayBuffer());
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

        await uploadRows(parsed.rows, parsed.descansoPadraoSeg, parsed.warnings);
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
    <section aria-label="Importar prescrição de treino">
      <div className={FORJA_COMMAND_INNER}>
        <p className={FORJA_SECTION_CHIP}>Google Sheets · Treino</p>
        <h2 className={`${FORJA_SECTION_TITLE} mt-1`}>{FORJA_COPY.planilhaTreino.title}</h2>
        <p className={`${FORJA_META} mt-1`}>{FORJA_COPY.planilhaTreino.hint}</p>
        <p className={`${FORJA_META} mt-2`}>
          Modelo:{" "}
          <a
            href="/templates/treino-google-sheets-exemplo.csv"
            download
            className="text-sky-400/90 underline underline-offset-2 hover:text-sky-300"
          >
            treino-google-sheets-exemplo.csv
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
            {isBusy ? FORJA_COPY.planilhaTreino.dropBusy : FORJA_COPY.planilhaTreino.drop}
          </p>
          <p className={`${FORJA_META} mt-2 max-w-lg`}>{FORJA_COPY.planilhaTreino.columns}</p>
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
            className={`${FORJA_PRIMARY_BUTTON} min-h-11`}
            disabled={disabled || isBusy || !athlete}
            onClick={() => inputRef.current?.click()}
          >
            {FORJA_COPY.planilhaTreino.chooseFile}
          </button>
          <button
            type="button"
            className={`${FORJA_GHOST_BUTTON} min-h-11`}
            disabled={!preview || isBusy}
            onClick={() => {
              setPreview(null);
              setWarnings([]);
              setMessage(null);
              setPhase("idle");
            }}
          >
            {FORJA_COPY.planilhaTreino.clearPreview}
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
                  <th className="px-3 py-2 font-medium">Grupo</th>
                  <th className="px-3 py-2 font-medium">Exercício</th>
                  <th className="px-3 py-2 font-medium">Reps</th>
                  <th className="px-3 py-2 font-medium">Séries</th>
                  <th className="px-3 py-2 font-medium">Descanso</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr
                    key={`${row.grupoMuscular}-${row.exercicio}-${row.series}`}
                    className="border-t border-zinc-900"
                  >
                    <td className="px-3 py-2">{row.grupoMuscular}</td>
                    <td className="px-3 py-2">{row.exercicio}</td>
                    <td className="px-3 py-2 tabular-nums">{row.repeticoes}</td>
                    <td className="px-3 py-2 tabular-nums">{row.series}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.descansoSegundos ? `${row.descansoSegundos}s` : "—"}
                    </td>
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
