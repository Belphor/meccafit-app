import { resolveIsoWeekRefBrasilia } from "@/lib/brasilia-time";

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
  /** Texto legado — derivado das refeições quando existirem. */
  notas: string;
  concluido: boolean;
  refeicoes: DietMealEntry[];
};

export const DIET_MEAL_SLOT_IDS = [
  "cafe_manha",
  "meio_manha",
  "almoco",
  "lanche_tarde",
  "pre_treino",
  "pos_treino",
  "janta",
  "ceia",
] as const;

export type DietMealSlotId = (typeof DIET_MEAL_SLOT_IDS)[number];

export const DIET_MEAL_SLOT_LABELS: Record<DietMealSlotId, string> = {
  cafe_manha: "Café da manhã",
  meio_manha: "Meio da manhã",
  almoco: "Almoço",
  lanche_tarde: "Lanche da tarde",
  pre_treino: "Pré-treino",
  pos_treino: "Pós-treino",
  janta: "Janta",
  ceia: "Ceia",
};

export type DietMealEntry = {
  id: DietMealSlotId;
  conteudo: string;
};

export function createEmptyMealEntry(id: DietMealSlotId): DietMealEntry {
  return { id, conteudo: "" };
}

export function compileDayNotas(entry: DietWeekDayEntry | undefined | null): string {
  if (!entry) return "";

  const refeicoes = entry.refeicoes ?? [];
  const fromMeals = refeicoes
    .filter((meal) => (meal.conteudo ?? "").trim().length > 0)
    .map((meal) => `${DIET_MEAL_SLOT_LABELS[meal.id]}\n${meal.conteudo.trim()}`)
    .join("\n\n");

  if (fromMeals) return fromMeals;
  return (entry.notas ?? "").trim();
}

export function parseDayEntry(raw: unknown): DietWeekDayEntry {
  const base: DietWeekDayEntry = { notas: "", concluido: false, refeicoes: [] };

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return base;
  }

  const row = raw as Record<string, unknown>;
  base.concluido = row.concluido === true;
  base.notas = typeof row.notas === "string" ? row.notas : "";

  if (Array.isArray(row.refeicoes)) {
    for (const item of row.refeicoes) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const meal = item as Record<string, unknown>;
      const id = String(meal.id ?? "").trim() as DietMealSlotId;
      if (!DIET_MEAL_SLOT_IDS.includes(id)) continue;
      base.refeicoes.push({
        id,
        conteudo: typeof meal.conteudo === "string" ? meal.conteudo : "",
      });
    }
  }

  if (base.refeicoes.length === 0 && base.notas.trim()) {
    base.refeicoes = [{ id: "cafe_manha", conteudo: base.notas.trim() }];
  }

  return base;
}

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
    dias[dayId] = { notas: "", concluido: false, refeicoes: [] };
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

/** Semana ISO conforme calendário de Brasília · ex.: 2026-W25 */
export function resolveIsoWeekRef(date: Date = new Date()): string {
  return resolveIsoWeekRefBrasilia(date);
}

export function parseWeeklyDietDays(raw: unknown): Record<DietWeekDayId, DietWeekDayEntry> {
  const base = createEmptyWeeklyDietDraft("", "", "").dias;

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return base;
  }

  const source = raw as Record<string, unknown>;

  for (const dayId of DIET_WEEK_DAY_IDS) {
    const entry = source[dayId];
    base[dayId] = parseDayEntry(entry);
  }

  return base;
}

/** Garante estrutura completa (ex.: rascunhos legados no IndexedDB sem `refeicoes`). */
export function normalizeWeeklyDietDraft(draft: WeeklyDietDraft): WeeklyDietDraft {
  return {
    ...draft,
    dias: parseWeeklyDietDays(draft.dias),
  };
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
