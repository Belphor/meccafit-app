import {
  parseProgressionFromSpreadsheet,
  type PrescriptionProgressionId,
} from "@/lib/prescription-progression";
import type { TrainingMuscleGroup, WeekdayIndex } from "@/lib/training-week";
import { TRAINING_MUSCLE_GROUPS } from "@/lib/training-week";

export type TreinoPlanilhaImportRow = {
  diaSemana: WeekdayIndex;
  grupoMuscular: TrainingMuscleGroup;
  exercicio: string;
  pesoPrescrito: number | null;
  repeticoes: number;
  series: number;
  descansoSegundos: number | null;
  progressaoAlternativas: PrescriptionProgressionId[];
};

export type TreinoPlanilhaImportResult =
  | { ok: true; rows: TreinoPlanilhaImportRow[]; warnings: string[]; cardioMetaMinutos: number | null }
  | { ok: false; message: string };

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "_");
}

function findColumnIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const exact = normalized.indexOf(alias);
    if (exact >= 0) return exact;
  }
  for (const alias of aliases) {
    const prefixed = normalized.findIndex(
      (header) => header.startsWith(`${alias}_`) || header.endsWith(`_${alias}`),
    );
    if (prefixed >= 0) return prefixed;
  }
  return -1;
}

function cellValue(row: unknown[], index: number): string {
  if (index < 0) return "";
  return String(row[index] ?? "")
    .replace(/^\uFEFF/, "")
    .trim();
}

function parseNumber(raw: string): number | null {
  const normalized = raw.replace(",", ".").trim();
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseMuscle(raw: string): TrainingMuscleGroup | null {
  const key = raw.trim().toUpperCase();
  return TRAINING_MUSCLE_GROUPS.includes(key as TrainingMuscleGroup)
    ? (key as TrainingMuscleGroup)
    : null;
}

export function parseTreinoPlanilhaMatrix(
  headers: string[],
  dataRows: unknown[][],
): TreinoPlanilhaImportResult {
  const grupoIdx = findColumnIndex(headers, ["grupo_muscular", "grupo", "musculo"]);
  const diaIdx = findColumnIndex(headers, ["dia_semana", "dia", "day"]);
  const exercicioIdx = findColumnIndex(headers, ["exercicio", "exercise", "movimento"]);
  const pesoIdx = findColumnIndex(headers, ["peso", "peso_kg", "carga"]);
  const repsIdx = findColumnIndex(headers, ["repeticoes", "reps", "rep"]);
  const seriesIdx = findColumnIndex(headers, ["series", "sets", "serie"]);
  const descansoIdx = findColumnIndex(headers, ["descanso_segundos", "descanso", "rest"]);
  const tecnicaIdx = findColumnIndex(headers, [
    "tecnica",
    "tecnicas",
    "progressao",
    "progressao_alternativas",
    "tecnica_progressao",
  ]);
  const cardioIdx = findColumnIndex(headers, [
    "meta_cardio",
    "cardio_meta_minutos",
    "cardio_meta",
    "meta_cardio_minutos",
  ]);

  if (diaIdx === -1 || grupoIdx === -1 || exercicioIdx === -1 || repsIdx === -1 || seriesIdx === -1) {
    return {
      ok: false,
      message:
        "Colunas obrigatórias: dia_semana (1 a 6), grupo_muscular, exercicio, repeticoes, series. Opcional: peso, descanso_segundos, tecnica, meta_cardio.",
    };
  }

  const warnings: string[] = [];
  const parsed: TreinoPlanilhaImportRow[] = [];
  let cardioMetaMinutos: number | null = null;

  for (const [index, row] of dataRows.entries()) {
    const grupo = parseMuscle(cellValue(row, grupoIdx));
    const exercicio = cellValue(row, exercicioIdx);
    const peso = pesoIdx >= 0 ? parseNumber(cellValue(row, pesoIdx)) : null;
    const repeticoes = parseNumber(cellValue(row, repsIdx));
    const series = parseNumber(cellValue(row, seriesIdx));
    const descansoRaw = parseNumber(cellValue(row, descansoIdx));
    const tecnicaRaw = cellValue(row, tecnicaIdx);
    const cardioRaw = parseNumber(cellValue(row, cardioIdx));

    if (cardioRaw !== null && cardioRaw >= 5 && cardioRaw <= 180 && cardioMetaMinutos === null) {
      cardioMetaMinutos = Math.round(cardioRaw);
    } else if (cardioRaw !== null && (cardioRaw < 5 || cardioRaw > 180)) {
      warnings.push(`Linha ${index + 2}: meta_cardio ignorada (use 5 a 180 min).`);
    }

    if (!grupo || !exercicio) {
      if (exercicio || cellValue(row, grupoIdx)) {
        warnings.push(`Linha ${index + 2} ignorada (grupo ou exercício inválido).`);
      }
      continue;
    }

    const pesoPrescrito =
      peso !== null && peso > 0 && peso <= 9999.99 ? peso : null;
    if (peso !== null && pesoPrescrito === null) {
      warnings.push(`Linha ${index + 2}: peso ignorado (valor inválido).`);
    }

    if (repeticoes === null || repeticoes < 1 || repeticoes > 100) {
      warnings.push(`Linha ${index + 2}: repetições inválidas.`);
      continue;
    }

    if (series === null || series < 1 || series > 20) {
      warnings.push(`Linha ${index + 2}: séries inválidas.`);
      continue;
    }

    const descansoSegundos =
      descansoRaw !== null && descansoRaw >= 15 && descansoRaw <= 600 ? descansoRaw : null;

    const diaRaw = parseNumber(cellValue(row, diaIdx));
    const diaSemana: WeekdayIndex | undefined =
      diaRaw !== null && diaRaw >= 1 && diaRaw <= 6 ? (Math.round(diaRaw) as WeekdayIndex) : undefined;

    if (diaSemana === undefined) {
      warnings.push(`Linha ${index + 2}: dia_semana inválido ou vazio (use 1 a 6).`);
      continue;
    }

    const progressaoAlternativas = parseProgressionFromSpreadsheet(tecnicaRaw);
    if (tecnicaRaw && progressaoAlternativas.length === 0) {
      warnings.push(`Linha ${index + 2}: técnica não reconhecida («${tecnicaRaw}»).`);
    }

    parsed.push({
      diaSemana,
      grupoMuscular: grupo,
      exercicio,
      pesoPrescrito,
      repeticoes: Math.round(repeticoes),
      series: Math.round(series),
      descansoSegundos,
      progressaoAlternativas,
    });
  }

  if (parsed.length === 0) {
    return { ok: false, message: "Nenhuma linha válida encontrada na planilha de treino." };
  }

  return { ok: true, rows: parsed, warnings, cardioMetaMinutos };
}

export function parseTreinoPlanilhaCsvText(text: string): TreinoPlanilhaImportResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { ok: false, message: "CSV vazio ou sem dados." };
  }

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const splitRow = (line: string) =>
    line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""));

  return parseTreinoPlanilhaMatrix(splitRow(lines[0]), lines.slice(1).map(splitRow));
}

export async function parseTreinoPlanilhaXlsxBuffer(buffer: ArrayBuffer): Promise<TreinoPlanilhaImportResult> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { ok: false, message: "Ficheiro Excel sem folhas." };
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  if (!matrix.length) {
    return { ok: false, message: "Folha Excel vazia." };
  }

  const headers = (matrix[0] ?? []).map(String);
  const dataRows = matrix.slice(1) as unknown[][];
  return parseTreinoPlanilhaMatrix(headers, dataRows);
}
