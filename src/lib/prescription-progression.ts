export const PRESCRIPTION_PROGRESSION_OPTIONS = [
  {
    id: "aumento_carga",
    label: "Progressão de carga",
    aliases: [
      "progressao de carga",
      "progressao carga",
      "prog carga",
      "prog. carga",
      "aumento carga",
      "aumento de carga",
      "carga",
    ],
  },
  {
    id: "aumento_repeticoes",
    label: "Aumento de repetições",
    aliases: [
      "aumento de repeticoes",
      "aumento repeticoes",
      "aumento reps",
      "aumento de reps",
      "repeticoes",
      "reps",
    ],
  },
  {
    id: "reducao_descanso",
    label: "Redução de descanso",
    aliases: [
      "reducao de descanso",
      "reducao descanso",
      "menos descanso",
      "descanso",
    ],
  },
  {
    id: "cadencia_controle",
    label: "Cadência e controle",
    aliases: [
      "cadencia e controle",
      "cadencia controle",
      "cadencia",
      "controle",
      "tempo",
    ],
  },
  {
    id: "isometria",
    label: "Isometria",
    aliases: ["isometrico", "isometrica", "pausa isometrica"],
  },
  {
    id: "drop_sets",
    label: "Drop sets",
    aliases: ["drop set", "drop-set", "drop_set", "dropset", "dropsets"],
  },
  {
    id: "rest_pause",
    label: "Rest pause",
    aliases: ["rest-pause", "rest_pause", "restpause", "pausa ativa"],
  },
  {
    id: "amplitude",
    label: "Amplitude",
    aliases: ["amplitude de movimento", "rom", "range de movimento"],
  },
] as const;

export type PrescriptionProgressionId = (typeof PRESCRIPTION_PROGRESSION_OPTIONS)[number]["id"];

export type PrescriptionRepValue = number | "FALHA";

const PROGRESSION_ID_SET = new Set<string>(PRESCRIPTION_PROGRESSION_OPTIONS.map((item) => item.id));

export function resolveProgressionLabel(id: PrescriptionProgressionId): string {
  return PRESCRIPTION_PROGRESSION_OPTIONS.find((item) => item.id === id)?.label ?? id;
}

function normalizeProgressionToken(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[\s.\-/]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function resolveProgressionIdFromToken(token: string): PrescriptionProgressionId | null {
  const normalized = normalizeProgressionToken(token);
  if (!normalized) return null;

  for (const option of PRESCRIPTION_PROGRESSION_OPTIONS) {
    if (option.id === normalized) return option.id;
    if (normalizeProgressionToken(option.label) === normalized) return option.id;

    for (const alias of option.aliases) {
      if (normalizeProgressionToken(alias) === normalized) return option.id;
    }
  }

  return null;
}

export function parseProgressionFromSpreadsheet(raw: string): PrescriptionProgressionId[] {
  const trimmed = raw.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return [];

  const tokens = trimmed
    .split(/[,;|/]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const result: PrescriptionProgressionId[] = [];

  for (const token of tokens) {
    const resolved = resolveProgressionIdFromToken(token);
    if (resolved && !seen.has(resolved)) {
      seen.add(resolved);
      result.push(resolved);
    }
  }

  if (result.length === 0 && tokens.length === 1) {
    const resolvedWhole = resolveProgressionIdFromToken(trimmed);
    if (resolvedWhole) return [resolvedWhole];
  }

  return result;
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
