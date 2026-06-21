import {
  CLIENT_TRAINING_MUSCLE_GROUPS,
  MAX_PLANILHA_GRUPOS_POR_DIA,
  normalizeTrainingMuscleGroup,
  type WeekdayIndex,
} from "@/lib/training-week";

export type PlanilhaImportRow = {
  dia_semana: WeekdayIndex;
  grupo_muscular: (typeof CLIENT_TRAINING_MUSCLE_GROUPS)[number];
  ordem: number;
};

export type PlanilhaImportResult =
  | { ok: true; rows: PlanilhaImportRow[]; warnings: string[] }
  | { ok: false; message: string };

const WEEKDAY_ALIASES: Record<string, WeekdayIndex> = {
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  SEG: 1,
  SEGUNDA: 1,
  TER: 2,
  TERCA: 2,
  TERÇA: 2,
  QUA: 3,
  QUARTA: 3,
  QUI: 4,
  QUINTA: 4,
  SEX: 5,
  SEXTA: 5,
  SAB: 6,
  SÁB: 6,
  SABADO: 6,
  SÁBADO: 6,
};

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "_");
}

function parseWeekday(raw: unknown): WeekdayIndex | null {
  const key = String(raw ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return WEEKDAY_ALIASES[key] ?? null;
}

function parseMuscleForPlanilha(raw: unknown): PlanilhaImportRow["grupo_muscular"] | null {
  const muscle = normalizeTrainingMuscleGroup(String(raw ?? ""));
  if (!muscle || muscle === "ABDOMEN") return null;
  if (!CLIENT_TRAINING_MUSCLE_GROUPS.includes(muscle as PlanilhaImportRow["grupo_muscular"])) {
    return null;
  }
  return muscle as PlanilhaImportRow["grupo_muscular"];
}

function dedupeAndCapRows(rows: PlanilhaImportRow[]): PlanilhaImportRow[] {
  const byDay = new Map<WeekdayIndex, PlanilhaImportRow[]>();

  for (const row of rows) {
    const list = byDay.get(row.dia_semana) ?? [];
    if (list.some((item) => item.grupo_muscular === row.grupo_muscular)) continue;
    if (list.length >= MAX_PLANILHA_GRUPOS_POR_DIA) continue;
    list.push({ ...row, ordem: list.length + 1 });
    byDay.set(row.dia_semana, list);
  }

  return [...byDay.values()].flat().sort((a, b) => {
    if (a.dia_semana !== b.dia_semana) return a.dia_semana - b.dia_semana;
    return a.ordem - b.ordem;
  });
}

/** Converte matriz tabular (header + linhas) em payload JSONB para RPC batch. */
export function parsePlanilhaMatrix(
  headers: string[],
  dataRows: unknown[][],
): PlanilhaImportResult {
  const normalizedHeaders = headers.map(normalizeHeader);
  const dayIdx = normalizedHeaders.findIndex((h) => h.includes("dia"));
  const muscleIdx = normalizedHeaders.findIndex(
    (h) => h.includes("grupo") || h.includes("musculo") || h.includes("muscle"),
  );
  const ordemIdx = normalizedHeaders.findIndex((h) => h.includes("ordem") || h.includes("order"));

  if (dayIdx === -1 || muscleIdx === -1) {
    return {
      ok: false,
      message: "Colunas obrigatórias: dia_semana (ou dia) e grupo_muscular (ou grupo).",
    };
  }

  const warnings: string[] = [];
  const parsed: PlanilhaImportRow[] = [];

  for (const [index, row] of dataRows.entries()) {
    const day = parseWeekday(row[dayIdx]);
    const muscle = parseMuscleForPlanilha(row[muscleIdx]);
    if (!day || !muscle) {
      warnings.push(`Linha ${index + 2} ignorada (dia ou grupo inválido).`);
      continue;
    }

    const ordemRaw = ordemIdx >= 0 ? Number(row[ordemIdx]) : parsed.filter((r) => r.dia_semana === day).length + 1;
    const ordem =
      Number.isFinite(ordemRaw) && ordemRaw >= 1 && ordemRaw <= MAX_PLANILHA_GRUPOS_POR_DIA
        ? ordemRaw
        : parsed.filter((r) => r.dia_semana === day).length + 1;

    parsed.push({ dia_semana: day, grupo_muscular: muscle, ordem });
  }

  const rows = dedupeAndCapRows(parsed);
  if (rows.length === 0) {
    return { ok: false, message: "Nenhuma linha válida encontrada na planilha." };
  }

  return { ok: true, rows, warnings };
}

/** CSV · parsing local sem dependências externas. */
export function parsePlanilhaCsvText(text: string): PlanilhaImportResult {
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

  const headers = splitRow(lines[0]);
  const dataRows = lines.slice(1).map(splitRow);
  return parsePlanilhaMatrix(headers, dataRows);
}

/** XLSX · requer import dinâmico de `xlsx` no browser. */
export async function parsePlanilhaXlsxBuffer(buffer: ArrayBuffer): Promise<PlanilhaImportResult> {
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
  return parsePlanilhaMatrix(headers, dataRows);
}
