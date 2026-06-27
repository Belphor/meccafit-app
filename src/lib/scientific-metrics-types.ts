/** Antropometria científica VIP — protocolo Jackson-Pollock 7 dobras (mm). */

export const SCIENTIFIC_SKINFOLD_IDS = [
  "peito",
  "axilar_media",
  "triceps",
  "subescapular",
  "abdomen",
  "suprailiaca",
  "coxa",
] as const;

export type ScientificSkinfoldId = (typeof SCIENTIFIC_SKINFOLD_IDS)[number];

export const SCIENTIFIC_SKINFOLD_LABELS: Record<ScientificSkinfoldId, string> = {
  peito: "Peitoral",
  axilar_media: "Axilar média",
  triceps: "Tríceps",
  subescapular: "Subescapular",
  abdomen: "Abdominal",
  suprailiaca: "Suprailíaca",
  coxa: "Coxa",
};

/** Chaves JSON em vip_medidas_corporais.perimetros */
export const SCIENTIFIC_SKINFOLD_DB_KEYS: Record<ScientificSkinfoldId, string> = {
  peito: "dobra_peito",
  axilar_media: "dobra_axilar_media",
  triceps: "dobra_triceps",
  subescapular: "dobra_subescapular",
  abdomen: "dobra_abdomen",
  suprailiaca: "dobra_suprailiaca",
  coxa: "dobra_coxa",
};

const DB_KEY_TO_SKINFOLD = Object.fromEntries(
  SCIENTIFIC_SKINFOLD_IDS.map((id) => [SCIENTIFIC_SKINFOLD_DB_KEYS[id], id]),
) as Record<string, ScientificSkinfoldId>;

export type ScientificSkinfolds = Record<ScientificSkinfoldId, number | null>;

export type ScientificMetricsEntry = {
  id: string;
  clientId: string;
  forgerId: string;
  measuredAt: string;
  weightKg: number;
  bodyFatPct: number | null;
  leanMassKg: number | null;
  skinfolds: ScientificSkinfolds;
  heightCm: number | null;
  savedAt: string;
  syncedAt: string | null;
};

export type ScientificMetricsDraftInput = {
  measuredAt: string;
  weightKg: string;
  bodyFatPct: string;
  leanMassKg: string;
  heightCm: string;
  skinfolds: Record<ScientificSkinfoldId, string>;
};

export function emptyScientificSkinfoldDraft(): Record<ScientificSkinfoldId, string> {
  return Object.fromEntries(SCIENTIFIC_SKINFOLD_IDS.map((id) => [id, ""])) as Record<
    ScientificSkinfoldId,
    string
  >;
}

export function emptyScientificSkinfolds(): ScientificSkinfolds {
  return Object.fromEntries(SCIENTIFIC_SKINFOLD_IDS.map((id) => [id, null])) as ScientificSkinfolds;
}

export const EMPTY_SCIENTIFIC_DRAFT_INPUT: ScientificMetricsDraftInput = {
  measuredAt: "",
  weightKg: "",
  bodyFatPct: "",
  leanMassKg: "",
  heightCm: "",
  skinfolds: emptyScientificSkinfoldDraft(),
};

export type ScientificMetricsSnapshotPayload = {
  pesoKg: number;
  alturaCm: number;
  gorduraPct: number | null;
  massaMagraKg: number | null;
  skinfolds: ScientificSkinfolds;
  medidoEm: string;
};

function parseOptionalNumber(
  raw: string,
  label: string,
  min: number,
  max: number,
): { ok: true; value: number | null } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };

  const value = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(value) || value < min || value > max) {
    return { ok: false, message: `${label} inválido (${min}–${max}).` };
  }

  return { ok: true, value: Math.round(value * 100) / 100 };
}

export function parseScientificDraftInput(
  input: ScientificMetricsDraftInput,
):
  | { ok: true; entry: Omit<ScientificMetricsEntry, "id" | "clientId" | "forgerId" | "savedAt" | "syncedAt"> }
  | { ok: false; message: string } {
  const weight = parseOptionalNumber(input.weightKg, "Peso", 20, 400);
  if (!weight.ok || weight.value === null) {
    return { ok: false, message: weight.ok ? "Peso obrigatório (20–400 kg)." : weight.message };
  }

  const bodyFat = parseOptionalNumber(input.bodyFatPct, "Gordura corporal", 1, 70);
  if (!bodyFat.ok) return bodyFat;

  const leanMass = parseOptionalNumber(input.leanMassKg, "Massa magra", 10, 200);
  if (!leanMass.ok) return leanMass;

  const height = parseOptionalNumber(input.heightCm, "Altura", 100, 260);
  if (!height.ok) return height;

  const skinfolds = emptyScientificSkinfolds();
  for (const id of SCIENTIFIC_SKINFOLD_IDS) {
    const parsed = parseOptionalNumber(
      input.skinfolds[id],
      SCIENTIFIC_SKINFOLD_LABELS[id],
      1,
      80,
    );
    if (!parsed.ok) return parsed;
    skinfolds[id] = parsed.value;
  }

  const measuredAtRaw = input.measuredAt.trim();
  const measuredAt = measuredAtRaw
    ? new Date(`${measuredAtRaw}T12:00:00`).toISOString()
    : new Date().toISOString();

  if (Number.isNaN(new Date(measuredAt).getTime())) {
    return { ok: false, message: "Data de medição inválida." };
  }

  return {
    ok: true,
    entry: {
      measuredAt,
      weightKg: weight.value,
      bodyFatPct: bodyFat.value,
      leanMassKg: leanMass.value,
      skinfolds,
      heightCm: height.value,
    },
  };
}

export function scientificEntryToSnapshotPayload(
  entry: ScientificMetricsEntry,
): ScientificMetricsSnapshotPayload {
  return {
    pesoKg: entry.weightKg,
    alturaCm: entry.heightCm ?? 170,
    gorduraPct: entry.bodyFatPct,
    massaMagraKg: entry.leanMassKg,
    skinfolds: entry.skinfolds,
    medidoEm: entry.measuredAt,
  };
}

export function snapshotPayloadToPerimetrosJson(
  payload: ScientificMetricsSnapshotPayload,
): Record<string, number> {
  const json: Record<string, number> = {};

  if (payload.gorduraPct !== null) json.gordura_pct = payload.gorduraPct;
  if (payload.massaMagraKg !== null) json.massa_magra_kg = payload.massaMagraKg;

  for (const id of SCIENTIFIC_SKINFOLD_IDS) {
    const value = payload.skinfolds[id];
    if (value !== null) {
      json[SCIENTIFIC_SKINFOLD_DB_KEYS[id]] = value;
    }
  }

  return json;
}

export function parseScientificFromServerRow(row: {
  peso_kg: number;
  altura_cm: number;
  perimetros: unknown;
  medido_em: string;
}): Omit<ScientificMetricsEntry, "id" | "clientId" | "forgerId" | "savedAt" | "syncedAt"> {
  const source =
    row.perimetros && typeof row.perimetros === "object" && !Array.isArray(row.perimetros)
      ? (row.perimetros as Record<string, unknown>)
      : {};

  const readNum = (key: string): number | null => {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    return null;
  };

  const skinfolds = emptyScientificSkinfolds();
  for (const id of SCIENTIFIC_SKINFOLD_IDS) {
    skinfolds[id] = readNum(SCIENTIFIC_SKINFOLD_DB_KEYS[id]);
  }

  return {
    measuredAt: row.medido_em,
    weightKg: row.peso_kg,
    bodyFatPct: readNum("gordura_pct"),
    leanMassKg: readNum("massa_magra_kg"),
    skinfolds,
    heightCm: row.altura_cm,
  };
}

export function formatScientificDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatScientificNumber(value: number | null, suffix = ""): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("pt-PT", { maximumFractionDigits: 2 })}${suffix}`;
}

/** Soma das 7 dobras (mm) — útil para acompanhamento. */
export function sumScientificSkinfolds(skinfolds: ScientificSkinfolds): number | null {
  const values = SCIENTIFIC_SKINFOLD_IDS.map((id) => skinfolds[id]).filter(
    (v): v is number => v !== null && Number.isFinite(v),
  );
  if (values.length === 0) return null;
  return Math.round(values.reduce((acc, v) => acc + v, 0) * 100) / 100;
}

export { DB_KEY_TO_SKINFOLD };
