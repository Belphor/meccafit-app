import type { TrainingMuscleGroup, WeekdayIndex } from "@/lib/training-week";
import { TRAINING_MUSCLE_GROUPS } from "@/lib/training-week";

export type TreinoPlanilhaImportRow = {
  diaSemana?: WeekdayIndex;
  grupoMuscular: TrainingMuscleGroup;
  exercicio: string;
  repeticoes: number;
  series: number;
  descansoSegundos: number | null;
};

export type TreinoPlanilhaImportResult =
  | { ok: true; rows: TreinoPlanilhaImportRow[]; descansoPadraoSeg: number | null; warnings: string[] }
  | { ok: false; message: string };

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "_");
}

function findColumnIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const idx = normalized.findIndex((header) => header === alias || header.includes(alias));
    if (idx >= 0) return idx;
  }
  return -1;
}

function cellValue(row: unknown[], index: number): string {
  if (index < 0) return "";
  return String(row[index] ?? "").trim();
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
  const descansoPadraoIdx = findColumnIndex(headers, ["descanso_padrao_seg", "descanso_padrao"]);

  if (grupoIdx === -1 || exercicioIdx === -1 || repsIdx === -1 || seriesIdx === -1) {
    return {
      ok: false,
      message:
        "Colunas obrigatórias: grupo_muscular, exercicio, repeticoes, series. Opcional: descanso_segundos, descanso_padrao_seg.",
    };
  }

  const warnings: string[] = [];
  const parsed: TreinoPlanilhaImportRow[] = [];
  let descansoPadraoSeg: number | null = null;

  for (const [index, row] of dataRows.entries()) {
    const grupo = parseMuscle(cellValue(row, grupoIdx));
    const exercicio = cellValue(row, exercicioIdx);
    const peso = pesoIdx >= 0 ? parseNumber(cellValue(row, pesoIdx)) : null;
    const repeticoes = parseNumber(cellValue(row, repsIdx));
    const series = parseNumber(cellValue(row, seriesIdx));
    const descansoRaw = parseNumber(cellValue(row, descansoIdx));
    const descansoPadraoRaw = parseNumber(cellValue(row, descansoPadraoIdx));

    if (descansoPadraoRaw !== null && descansoPadraoRaw >= 15 && descansoPadraoRaw <= 600) {
      descansoPadraoSeg = descansoPadraoRaw;
    }

    if (!grupo || !exercicio) {
      if (exercicio || cellValue(row, grupoIdx)) {
        warnings.push(`Linha ${index + 2} ignorada (grupo ou exercício inválido).`);
      }
      continue;
    }

    if (peso !== null && (peso <= 0 || peso > 9999.99)) {
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

    const diaRaw = diaIdx >= 0 ? parseNumber(cellValue(row, diaIdx)) : null;
    const diaSemana =
      diaRaw !== null && diaRaw >= 1 && diaRaw <= 6 ? (Math.round(diaRaw) as WeekdayIndex) : undefined;

    if (diaIdx >= 0 && diaRaw !== null && diaSemana === undefined) {
      warnings.push(`Linha ${index + 2}: dia inválido (use 1–6).`);
    }

    parsed.push({
      ...(diaSemana !== undefined ? { diaSemana } : {}),
      grupoMuscular: grupo,
      exercicio,
      repeticoes: Math.round(repeticoes),
      series: Math.round(series),
      descansoSegundos,
    });
  }

  if (parsed.length === 0) {
    return { ok: false, message: "Nenhuma linha válida encontrada na planilha de treino." };
  }

  return { ok: true, rows: parsed, descansoPadraoSeg, warnings };
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
