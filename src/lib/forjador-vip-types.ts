export const DIET_WEEK_DAY_IDS = [
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
] as const;

export type DietWeekDayId = (typeof DIET_WEEK_DAY_IDS)[number];

export const DIET_WEEK_DAY_LABELS: Record<DietWeekDayId, string> = {
  segunda: "Segunda",
  terca: "Terça",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta",
  sabado: "Sábado",
  domingo: "Domingo",
};

export type DietWeekDayEntry = {
  notas: string;
  concluido: boolean;
};

export type WeeklyDietDraft = {
  clientId: string;
  forgerId: string;
  semanaRef: string;
  dias: Record<DietWeekDayId, DietWeekDayEntry>;
  updatedAt: string;
  syncedAt: string | null;
};

export const BODY_CIRCUMFERENCE_FIELDS = [
  { id: "braco_d", label: "Braço (D)" },
  { id: "braco_e", label: "Braço (E)" },
  { id: "peito", label: "Peito" },
  { id: "cintura", label: "Cintura" },
  { id: "quadril", label: "Quadril" },
  { id: "coxa_d", label: "Coxa (D)" },
  { id: "coxa_e", label: "Coxa (E)" },
] as const;

export type BodyCircumferenceId = (typeof BODY_CIRCUMFERENCE_FIELDS)[number]["id"];

export type BodyCircumferences = Partial<Record<BodyCircumferenceId, number>>;

export type BodyMetricsDraft = {
  clientId: string;
  forgerId: string;
  pesoKg: string;
  alturaCm: string;
  perimetros: Record<BodyCircumferenceId, string>;
  medidoEm: string;
  updatedAt: string;
  syncedAt: string | null;
};

export function createEmptyWeeklyDietDraft(
  clientId: string,
  forgerId: string,
  semanaRef: string,
): WeeklyDietDraft {
  const dias = {} as Record<DietWeekDayId, DietWeekDayEntry>;
  for (const dayId of DIET_WEEK_DAY_IDS) {
    dias[dayId] = { notas: "", concluido: false };
  }

  return {
    clientId,
    forgerId,
    semanaRef,
    dias,
    updatedAt: new Date().toISOString(),
    syncedAt: null,
  };
}

export function createEmptyBodyMetricsDraft(
  clientId: string,
  forgerId: string,
): BodyMetricsDraft {
  const perimetros = {} as Record<BodyCircumferenceId, string>;
  for (const field of BODY_CIRCUMFERENCE_FIELDS) {
    perimetros[field.id] = "";
  }

  return {
    clientId,
    forgerId,
    pesoKg: "",
    alturaCm: "",
    perimetros,
    medidoEm: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncedAt: null,
  };
}

/** ISO week key · ex.: 2026-W25 */
export function resolveIsoWeekRef(date: Date = new Date()): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function parseWeeklyDietDays(raw: unknown): Record<DietWeekDayId, DietWeekDayEntry> {
  const base = createEmptyWeeklyDietDraft("", "", "").dias;

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return base;
  }

  const source = raw as Record<string, unknown>;

  for (const dayId of DIET_WEEK_DAY_IDS) {
    const entry = source[dayId];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const row = entry as Record<string, unknown>;
    base[dayId] = {
      notas: typeof row.notas === "string" ? row.notas : "",
      concluido: row.concluido === true,
    };
  }

  return base;
}

export function parseBodyCircumferences(raw: unknown): Record<BodyCircumferenceId, string> {
  const result = createEmptyBodyMetricsDraft("", "").perimetros;

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return result;
  }

  const source = raw as Record<string, unknown>;

  for (const field of BODY_CIRCUMFERENCE_FIELDS) {
    const value = source[field.id];
    if (typeof value === "number" && Number.isFinite(value)) {
      result[field.id] = String(value);
    } else if (typeof value === "string" && value.trim().length > 0) {
      result[field.id] = value.trim();
    }
  }

  return result;
}
