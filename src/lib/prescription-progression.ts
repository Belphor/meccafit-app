export const PRESCRIPTION_PROGRESSION_OPTIONS = [
  { id: "aumento_carga", label: "Progressão de carga" },
  { id: "aumento_repeticoes", label: "Aumento de repetições" },
  { id: "reducao_descanso", label: "Redução de descanso" },
  { id: "cadencia_controle", label: "Cadência e controle" },
  { id: "isometria", label: "Isometria" },
  { id: "drop_sets", label: "Drop sets" },
  { id: "rest_pause", label: "Rest pause" },
  { id: "amplitude", label: "Amplitude" },
] as const;

export type PrescriptionProgressionId = (typeof PRESCRIPTION_PROGRESSION_OPTIONS)[number]["id"];

export type PrescriptionRepValue = number | "FALHA";

const PROGRESSION_ID_SET = new Set<string>(PRESCRIPTION_PROGRESSION_OPTIONS.map((item) => item.id));

export function resolveProgressionLabel(id: PrescriptionProgressionId): string {
  return PRESCRIPTION_PROGRESSION_OPTIONS.find((item) => item.id === id)?.label ?? id;
}

export function parseProgressionAlternatives(raw: unknown): PrescriptionProgressionId[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const result: PrescriptionProgressionId[] = [];

  for (const item of raw) {
    const key = String(item ?? "").trim();
    if (!PROGRESSION_ID_SET.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(key as PrescriptionProgressionId);
  }

  return result;
}

export function parseRepsPerSet(raw: unknown): PrescriptionRepValue[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  return raw.map((item) => {
    if (String(item).trim().toUpperCase() === "FALHA") return "FALHA";
    const value = Number.parseInt(String(item), 10);
    return Number.isFinite(value) && value >= 1 && value <= 100 ? value : 1;
  });
}

export function normalizeRepsPerSetDraft(
  values: string[],
  seriesCount: number,
): PrescriptionRepValue[] {
  const safeSeries = Number.isFinite(seriesCount) && seriesCount >= 1 ? seriesCount : 1;
  const normalized: PrescriptionRepValue[] = [];

  for (let index = 0; index < safeSeries; index += 1) {
    const raw = (values[index] ?? "").trim();
    if (!raw) {
      normalized.push(1);
      continue;
    }
    if (raw.toUpperCase() === "FALHA") {
      normalized.push("FALHA");
      continue;
    }
    const parsed = Number.parseInt(raw, 10);
    normalized.push(Number.isFinite(parsed) && parsed >= 1 && parsed <= 100 ? parsed : 1);
  }

  return normalized;
}

export function derivePrimaryRepTarget(repsPerSet: PrescriptionRepValue[]): number {
  const numeric = repsPerSet.filter((value): value is number => typeof value === "number");
  if (numeric.length === 0) return 1;
  return Math.max(...numeric);
}

export function formatRepsPerSet(repsPerSet: PrescriptionRepValue[]): string {
  if (repsPerSet.length === 0) return "";
  return repsPerSet
    .map((value, index) => `S${index + 1}×${value === "FALHA" ? "FALHA" : value}`)
    .join(" · ");
}

export function formatProgressionSummary(ids: PrescriptionProgressionId[]): string {
  if (ids.length === 0) return "";
  return ids.map((id) => resolveProgressionLabel(id)).join(" · ");
}

export function serializeRepsPerSet(repsPerSet: PrescriptionRepValue[]): string[] {
  return repsPerSet.map((value) => (value === "FALHA" ? "FALHA" : String(value)));
}
