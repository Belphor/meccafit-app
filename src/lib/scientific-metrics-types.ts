/** Antropometria científica VIP — protocolo Jackson-Pollock 7 dobras (mm). */

import {
  brasiliaDateInputToIso,
  brasiliaDisplayToYmd,
  formatBrasiliaDateFromIso,
} from "@/lib/brasilia-time";

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
export const SCIENTIFIC_SKINFOLD_DB_KEYS = {
  peito: "dobra_peito",
  axilar_media: "dobra_axilar_media",
  triceps: "dobra_triceps",
  subescapular: "dobra_subescapular",
  abdomen: "dobra_abdomen",
  suprailiaca: "dobra_suprailiaca",
  coxa: "dobra_coxa",
} as const satisfies Record<ScientificSkinfoldId, string>;

export type ScientificSkinfoldDbKey = (typeof SCIENTIFIC_SKINFOLD_DB_KEYS)[ScientificSkinfoldId];
export type ScientificPerimetrosJson = Partial<
  Record<"gordura_pct" | "massa_magra_kg" | ScientificSkinfoldDbKey, number>
>;

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

export type ScientificServerMetricsRow = {
  peso_kg: number;
  altura_cm: number;
  perimetros: unknown;
  medido_em: string;
};

export type ScientificServerSnapshotRow = ScientificServerMetricsRow & {
  client_id: string;
  forger_id: string;
  atualizado_em: string;
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
  const ymd =
    brasiliaDisplayToYmd(measuredAtRaw) ??
    (/^\d{4}-\d{2}-\d{2}$/.test(measuredAtRaw) ? measuredAtRaw : null);

  if (!ymd) {
    return { ok: false, message: "Data inválida. Use o formato DD/MM/AAAA (ex.: 27/06/2026)." };
  }

  const measuredAt = brasiliaDateInputToIso(ymd);

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
): ScientificPerimetrosJson {
  const json: ScientificPerimetrosJson = {};

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

export function parseScientificFromServerRow(
  row: ScientificServerMetricsRow,
): Omit<ScientificMetricsEntry, "id" | "clientId" | "forgerId" | "savedAt" | "syncedAt"> {
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

export function mapServerScientificSnapshot(row: ScientificServerSnapshotRow): ScientificMetricsEntry {
  const parsed = parseScientificFromServerRow(row);
  return {
    id: `server-${row.client_id}-${row.medido_em}`,
    clientId: row.client_id,
    forgerId: row.forger_id,
    savedAt: row.atualizado_em,
    syncedAt: row.atualizado_em,
    ...parsed,
  };
}

export function formatScientificDate(iso: string): string {
  return formatBrasiliaDateFromIso(iso);
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

/** Chave estável para deduplicar medições local vs servidor (mesmo dia civil). */
export function scientificEntryDayKey(entry: Pick<ScientificMetricsEntry, "clientId" | "measuredAt">): string {
  const date = new Date(entry.measuredAt);
  const day =
    Number.isNaN(date.getTime()) ? entry.measuredAt.slice(0, 10) : date.toISOString().slice(0, 10);
  return `${entry.clientId}:${day}`;
}

/** Prefere entrada local (UUID) sobre snapshot do servidor quando coincidem no mesmo dia. */
export function mergeScientificEntries(entries: ScientificMetricsEntry[]): ScientificMetricsEntry[] {
  const byDay = new Map<string, ScientificMetricsEntry>();

  for (const entry of entries) {
    const key = scientificEntryDayKey(entry);
    const existing = byDay.get(key);
    if (!existing) {
      byDay.set(key, entry);
      continue;
    }

    const preferNew =
      (entry.syncedAt && !existing.syncedAt) ||
      (!entry.id.startsWith("server-") && existing.id.startsWith("server-")) ||
      entry.savedAt > existing.savedAt;

    byDay.set(key, preferNew ? entry : existing);
  }

  return [...byDay.values()].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
}

export { DB_KEY_TO_SKINFOLD };
