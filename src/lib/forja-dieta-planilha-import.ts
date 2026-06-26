import type { DietMeal } from "@/lib/diet-data";
import {
  parseDietObjective,
  type ForjaDietBlueprintPayload,
  normalizeDietMeals,
  validateDietBlueprintPayload,
} from "@/lib/forja-diet-blueprint-sync";

export type DietaPlanilhaImportResult =
  | { ok: true; blueprint: ForjaDietBlueprintPayload; warnings: string[] }
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

function slugifyMealId(raw: string): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized.slice(0, 48) : `refeicao-${Date.now()}`;
}

/** Converte matriz tabular (Google Sheets → CSV/XLSX) em blueprint de dieta. */
export function parseDietaPlanilhaMatrix(
  headers: string[],
  dataRows: unknown[][],
): DietaPlanilhaImportResult {
  const tituloIdx = findColumnIndex(headers, ["titulo", "title", "plano"]);
  const objetivoIdx = findColumnIndex(headers, ["objetivo", "goal"]);
  const caloriasAlvoIdx = findColumnIndex(headers, ["calorias_alvo"]);
  const proteinasAlvoIdx = findColumnIndex(headers, ["proteinas_alvo", "proteinas_g_alvo"]);
  const carboidratosAlvoIdx = findColumnIndex(headers, ["carboidratos_alvo", "carboidratos_g_alvo"]);
  const gordurasAlvoIdx = findColumnIndex(headers, ["gorduras_alvo", "gorduras_g_alvo"]);
  const aguaIdx = findColumnIndex(headers, ["agua_litros", "agua", "hidratacao"]);
  const observacoesIdx = findColumnIndex(headers, ["observacoes", "notas", "obs"]);
  const refeicaoIdx = findColumnIndex(headers, ["refeicao", "refeicao_nome", "meal"]);
  const horarioIdx = findColumnIndex(headers, ["horario", "hora", "time"]);
  const alimentoIdx = findColumnIndex(headers, ["alimento", "food", "item"]);
  const quantidadeIdx = findColumnIndex(headers, ["quantidade", "qtd", "porcao"]);
  const itemCaloriasIdx = findColumnIndex(headers, ["calorias", "kcal"]);
  const itemProteinasIdx = findColumnIndex(headers, ["proteinas_g", "proteinas", "proteina"]);

  if (tituloIdx === -1 || objetivoIdx === -1 || caloriasAlvoIdx === -1) {
    return {
      ok: false,
      message:
        "Colunas obrigatórias: titulo, objetivo, calorias_alvo. Para refeições: refeicao, alimento (opcional: horario, quantidade, calorias, proteinas_g).",
    };
  }

  const warnings: string[] = [];
  let metaTitulo = "";
  let metaObjetivo = "";
  let metaCalorias: number | null = null;
  let metaProteinas: number | null = null;
  let metaCarboidratos: number | null = null;
  let metaGorduras: number | null = null;
  let metaAgua: number | null = null;
  let metaObservacoes = "";

  const mealsMap = new Map<string, DietMeal>();

  for (const [index, row] of dataRows.entries()) {
    const titulo = cellValue(row, tituloIdx);
    const objetivo = cellValue(row, objetivoIdx);
    const calorias = parseNumber(cellValue(row, caloriasAlvoIdx));
    const proteinas = parseNumber(cellValue(row, proteinasAlvoIdx));
    const carboidratos = parseNumber(cellValue(row, carboidratosAlvoIdx));
    const gorduras = parseNumber(cellValue(row, gordurasAlvoIdx));
    const agua = parseNumber(cellValue(row, aguaIdx));
    const observacoes = cellValue(row, observacoesIdx);

    if (titulo) metaTitulo = titulo;
    if (objetivo) metaObjetivo = objetivo;
    if (calorias !== null) metaCalorias = calorias;
    if (proteinas !== null) metaProteinas = proteinas;
    if (carboidratos !== null) metaCarboidratos = carboidratos;
    if (gorduras !== null) metaGorduras = gorduras;
    if (agua !== null) metaAgua = agua;
    if (observacoes) metaObservacoes = observacoes;

    const refeicaoNome = cellValue(row, refeicaoIdx);
    const alimento = cellValue(row, alimentoIdx);
    if (!refeicaoNome || !alimento) {
      if (refeicaoNome && !alimento) {
        warnings.push(`Linha ${index + 2}: refeição sem alimento ignorada.`);
      }
      continue;
    }

    const horario = cellValue(row, horarioIdx);
    const mealKey = `${refeicaoNome.toLowerCase()}::${horario}`;
    const mealId = slugifyMealId(refeicaoNome);

    const existing = mealsMap.get(mealKey) ?? {
      id: mealId,
      nome: refeicaoNome,
      horario,
      itens: [],
    };

    const itemCalorias = parseNumber(cellValue(row, itemCaloriasIdx)) ?? 0;
    const itemProteinas = parseNumber(cellValue(row, itemProteinasIdx)) ?? 0;

    existing.itens.push({
      alimento,
      quantidade: cellValue(row, quantidadeIdx),
      calorias: itemCalorias,
      proteinas_g: itemProteinas,
    });

    mealsMap.set(mealKey, existing);
  }

  const objetivo = parseDietObjective(metaObjetivo);
  if (!metaTitulo || !objetivo || metaCalorias === null || metaProteinas === null || metaGorduras === null) {
    return {
      ok: false,
      message:
        "Planilha sem metadados válidos (titulo, objetivo, calorias_alvo, proteinas_alvo, gorduras_alvo na primeira linha).",
    };
  }

  const blueprint: ForjaDietBlueprintPayload = {
    titulo: metaTitulo,
    objetivo,
    caloriasAlvo: metaCalorias,
    proteinasG: metaProteinas,
    carboidratosG: metaCarboidratos ?? 0,
    gordurasG: metaGorduras,
    aguaLitros: metaAgua ?? 3,
    observacoes: metaObservacoes || null,
    refeicoes: normalizeDietMeals([...mealsMap.values()]),
  };

  const validation = validateDietBlueprintPayload(blueprint);
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  if (blueprint.refeicoes.length === 0) {
    warnings.push("Nenhuma refeição com alimentos encontrada — apenas macros serão publicados.");
  }

  return { ok: true, blueprint, warnings };
}

export function parseDietaPlanilhaCsvText(text: string): DietaPlanilhaImportResult {
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
  return parseDietaPlanilhaMatrix(headers, dataRows);
}

export async function parseDietaPlanilhaXlsxBuffer(buffer: ArrayBuffer): Promise<DietaPlanilhaImportResult> {
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
  return parseDietaPlanilhaMatrix(headers, dataRows);
}
