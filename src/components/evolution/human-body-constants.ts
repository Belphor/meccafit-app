/**
 * Aba 3 · Tipagens estritas, malha vetorial SVG (Figma → HUD 2D) e helpers RPC
 * viewBox 400×600 · silhueta atlética unissex premium
 */

export const SOVEREIGN_MUSCLES = [
  "PEITO",
  "OMBROS",
  "BRACOS",
  "COSTAS",
  "ABDOMEN",
  "PERNAS",
] as const;

export const CALOR_JSON_KEYS = [
  "peito",
  "ombros",
  "bracos",
  "costas",
  "abdomen",
  "pernas",
] as const;

export type CalorJsonKey = (typeof CALOR_JSON_KEYS)[number];

export const JSON_KEY_TO_SOVEREIGN: Record<CalorJsonKey, SovereignMuscleId> = {
  peito: "PEITO",
  ombros: "OMBROS",
  bracos: "BRACOS",
  costas: "COSTAS",
  abdomen: "ABDOMEN",
  pernas: "PERNAS",
};

export type SovereignMuscleId = (typeof SOVEREIGN_MUSCLES)[number];

export const MUSCLE_CALOR_LEVELS = [
  "CINZAS",
  "FAISCA",
  "BRASA",
  "LABAREDA",
  "FOGO CÓSMICO",
] as const;

export type ThermalStatus =
  | "CINZAS"
  | "FAISCA"
  | "BRASA"
  | "LABAREDA"
  | "FOGO CÓSMICO";

/** Ordem crescente de intensidade térmica · Aba 3 */
export const THERMAL_STATUSES: readonly ThermalStatus[] = [
  "CINZAS",
  "FAISCA",
  "BRASA",
  "LABAREDA",
  "FOGO CÓSMICO",
] as const;

export type MuscleCalorLevel = ThermalStatus;

/** Alias legado · renderizador SVG */
export type MuscleStatus = ThermalStatus;

export type MuscleCalorGroupRecord = {
  nivel_calculado: MuscleCalorLevel;
  is_frozen: boolean;
  metrica_bruta?: number;
};

export type EvolutionCalorJson = {
  indice_ignicao: number;
  peito: MuscleCalorGroupRecord;
  ombros: MuscleCalorGroupRecord;
  bracos: MuscleCalorGroupRecord;
  costas: MuscleCalorGroupRecord;
  abdomen: MuscleCalorGroupRecord;
  pernas: MuscleCalorGroupRecord;
};

export type MuscleCalorRow = {
  membro_principal: SovereignMuscleId;
  nivel_calculado: MuscleCalorLevel;
  is_frozen: boolean;
  metrica_bruta?: number;
};

export type EvolutionCalorPayload = {
  calorRows: MuscleCalorRow[];
  indice_ignicao: number;
};

export const PURITY_PENALTY_THRESHOLD = 50;

/** Normaliza índice de ignição (MIDAS `ignition_index` ou legado `indice_ignicao`). */
export function parseIgnitionIndex(source: Record<string, unknown>): number {
  const raw = source.ignition_index ?? source.indice_ignicao;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.min(100, Math.round(raw)));
  }
  if (typeof raw === "string" && raw.trim().length > 0) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(100, Math.round(parsed)));
    }
  }
  return 0;
}

export const MUSCLE_LABELS: Record<SovereignMuscleId, string> = {
  PEITO: "Peito",
  OMBROS: "Ombros",
  BRACOS: "Braços",
  COSTAS: "Costas",
  ABDOMEN: "Abdômen",
  PERNAS: "Pernas",
};

/** Tetos de classificação térmica por membro · métrica quinzenal acumulada */
export const MUSCLE_THERMAL_CEILINGS: Record<
  SovereignMuscleId,
  { faisca: number; brasa: number; labareda: number }
> = {
  PEITO: { faisca: 160, brasa: 500, labareda: 1000 },
  COSTAS: { faisca: 160, brasa: 500, labareda: 1000 },
  PERNAS: { faisca: 160, brasa: 500, labareda: 1000 },
  OMBROS: { faisca: 100, brasa: 240, labareda: 480 },
  BRACOS: { faisca: 60, brasa: 160, labareda: 320 },
  ABDOMEN: { faisca: 50, brasa: 150, labareda: 300 },
};

export type ThermalCeilingProgress = {
  nextLevel: MuscleCalorLevel | null;
  ceiling: number | null;
  remaining: number | null;
};

export function resolveThermalCeilingProgress(
  muscleId: SovereignMuscleId,
  metrica: number | undefined,
  level: MuscleCalorLevel,
): ThermalCeilingProgress {
  if (level === "FOGO CÓSMICO" || level === "LABAREDA") {
    return { nextLevel: null, ceiling: null, remaining: null };
  }

  const score = typeof metrica === "number" && Number.isFinite(metrica) ? metrica : 0;
  const ceilings = MUSCLE_THERMAL_CEILINGS[muscleId];

  const steps: Array<{ level: MuscleCalorLevel; ceiling: number }> = [
    { level: "FAISCA", ceiling: ceilings.faisca },
    { level: "BRASA", ceiling: ceilings.brasa },
    { level: "LABAREDA", ceiling: ceilings.labareda },
  ];

  const rank: Record<MuscleCalorLevel, number> = {
    CINZAS: 0,
    FAISCA: 1,
    BRASA: 2,
    LABAREDA: 3,
    "FOGO CÓSMICO": 4,
  };

  for (const step of steps) {
    if (rank[step.level] <= rank[level]) continue;
    return {
      nextLevel: step.level,
      ceiling: step.ceiling,
      remaining: Math.max(0, step.ceiling - score),
    };
  }

  return { nextLevel: null, ceiling: null, remaining: null };
}

export const CALOR_LEVEL_LABELS: Record<MuscleCalorLevel, string> = {
  CINZAS: "Cinzas",
  FAISCA: "Faísca",
  BRASA: "Brasa",
  LABAREDA: "Labareda",
  "FOGO CÓSMICO": "Fogo Cósmico",
};

/** Anel térmico circular · Aba 3 Evolução */
export const GLOBAL_THERMAL_RING_CLASS: Record<MuscleCalorLevel, string> = {
  CINZAS: "ring-4 ring-gray-600/80",
  FAISCA: "ring-4 ring-orange-500/90 animate-pulse",
  BRASA: "ring-4 ring-orange-600/90",
  LABAREDA: "ring-4 ring-red-600/90 drop-shadow-[0_0_10px_rgba(220,38,38,0.55)]",
  "FOGO CÓSMICO": "ring-4 ring-violet-500/90 evolution-cosmic-ring",
};

export function formatMetricaBruta(value: number | undefined): string {
  const metric = typeof value === "number" && Number.isFinite(value) ? value : 0;
  if (metric >= 1000) return `${(metric / 1000).toFixed(1)}k`;
  return Math.round(metric).toLocaleString("pt-BR");
}

/** Rótulo contextual da métrica RPC · índice de calor quinzenal (não carga única em kg) */
export type CalorMembroMetric = {
  label: string;
  value: string;
  hint: string;
};

export function formatCalorMembroMetric(row: MuscleCalorRow): CalorMembroMetric {
  const score = formatMetricaBruta(row.metrica_bruta);

  if (row.is_frozen) {
    return {
      label: "Estase VIP",
      value: "Membro congelado",
      hint: "Fora da prescrição ativa do forjador",
    };
  }

  if (row.membro_principal === "ABDOMEN") {
    return {
      label: "Estímulo de core",
      value: `${score} rep`,
      hint: "Quinzena · séries × reps no altar",
    };
  }

  return {
    label: "Índice de calor forjado",
    value: `${score} calor`,
    hint: "Quinzena · picos acumulados no membro",
  };
}

/** @deprecated Use formatCalorMembroMetric */
export function formatCalorForjaMetric(row: MuscleCalorRow): { label: string; value: string } {
  const metric = formatCalorMembroMetric(row);
  return { label: metric.label, value: metric.value };
}

export function normalizeMuscleCalorLevel(value: string | null | undefined): MuscleCalorLevel {
  const upper = String(value ?? "CINZAS").trim().toUpperCase();
  if (upper === "CONGELADO") return "CINZAS";
  if (upper === "FOGO COSMICO" || upper === "FOGO_COSMICO") return "FOGO CÓSMICO";
  if (MUSCLE_CALOR_LEVELS.includes(upper as MuscleCalorLevel)) {
    return upper as MuscleCalorLevel;
  }
  return "CINZAS";
}

type MidasMuscleRecord = {
  grupo?: string;
  vtc?: number;
  vra?: number;
  metric_raw?: number;
  metric_final?: number;
  thermal_level?: string;
};

export function parseMidasEvolutionJson(data: unknown): EvolutionCalorPayload {
  const source = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  if (source.error === "unauthorized" || source.code === 401) {
    throw new Error(
      typeof source.message === "string" ? source.message : "Sessão inválida — faça login novamente.",
    );
  }

  const indice_ignicao = parseIgnitionIndex(source);

  const musclesRaw = source.muscles;
  const muscles =
    musclesRaw && typeof musclesRaw === "object" && !Array.isArray(musclesRaw)
      ? (musclesRaw as Record<string, MidasMuscleRecord>)
      : {};

  const calorRows: MuscleCalorRow[] = CALOR_JSON_KEYS.map((key) => {
    const record = muscles[key] ?? {};
    const sovereign = JSON_KEY_TO_SOVEREIGN[key];
    const metrica_bruta =
      typeof record.metric_raw === "number" && Number.isFinite(record.metric_raw)
        ? record.metric_raw
        : sovereign === "ABDOMEN"
          ? Number(record.vra ?? 0)
          : Number(record.vtc ?? 0);

    return {
      membro_principal: sovereign,
      nivel_calculado: normalizeMuscleCalorLevel(record.thermal_level),
      is_frozen: false,
      metrica_bruta,
    };
  });

  return { calorRows, indice_ignicao };
}

function parseGroupRecord(raw: unknown): MuscleCalorGroupRecord {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    nivel_calculado: normalizeMuscleCalorLevel(String(row.nivel_calculado ?? "CINZAS")),
    is_frozen: row.is_frozen === true,
    metrica_bruta:
      typeof row.metrica_bruta === "number" && Number.isFinite(row.metrica_bruta)
        ? row.metrica_bruta
        : 0,
  };
}

export function parseEvolutionCalorJson(data: unknown): EvolutionCalorPayload {
  const source = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  const indice_ignicao = parseIgnitionIndex(source);

  const calorRows: MuscleCalorRow[] = CALOR_JSON_KEYS.map((key) => {
    const group = parseGroupRecord(source[key]);
    return {
      membro_principal: JSON_KEY_TO_SOVEREIGN[key],
      nivel_calculado: group.nivel_calculado,
      is_frozen: group.is_frozen,
      metrica_bruta: group.metrica_bruta,
    };
  });

  return { calorRows, indice_ignicao };
}

export function normalizeMuscleCalorRows(
  data:
    | Array<{
        membro_principal: string;
        nivel_calculado: string;
        is_frozen: boolean;
      }>
    | Record<string, unknown>
    | null
    | undefined,
): MuscleCalorRow[] {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return parseEvolutionCalorJson(data).calorRows;
  }

  if (!Array.isArray(data)) return [];

  const byMuscle = new Map<SovereignMuscleId, MuscleCalorRow>();

  for (const row of data) {
    const id = String(row.membro_principal ?? "").trim().toUpperCase() as SovereignMuscleId;
    if (!SOVEREIGN_MUSCLES.includes(id)) continue;
    byMuscle.set(id, {
      membro_principal: id,
      nivel_calculado: normalizeMuscleCalorLevel(row.nivel_calculado),
      is_frozen: row.is_frozen === true,
    });
  }

  return SOVEREIGN_MUSCLES.map(
    (id) =>
      byMuscle.get(id) ?? {
        membro_principal: id,
        nivel_calculado: "CINZAS",
        is_frozen: false,
      },
  );
}

export function resolveNivelTermicoGlobal(
  ignicaoPercent: number,
  calorRows: MuscleCalorRow[],
): MuscleCalorLevel {
  const activeLevels = calorRows
    .filter((row) => !row.is_frozen)
    .map((row) => row.nivel_calculado);

  const rank: Record<MuscleCalorLevel, number> = {
    CINZAS: 0,
    FAISCA: 1,
    BRASA: 2,
    LABAREDA: 3,
    "FOGO CÓSMICO": 4,
  };

  let peak: MuscleCalorLevel = "CINZAS";
  for (const level of activeLevels) {
    if (rank[level] > rank[peak]) peak = level;
  }

  const fromIgnicao = resolveThermalLevelFromIgnicao(ignicaoPercent);
  return rank[fromIgnicao] > rank[peak] ? fromIgnicao : peak;
}

export function resolveThermalLevelFromIgnicao(ignicaoPercent: number): MuscleCalorLevel {
  if (ignicaoPercent >= 90) return "FOGO CÓSMICO";
  if (ignicaoPercent >= 70) return "LABAREDA";
  if (ignicaoPercent >= 50) return "BRASA";
  if (ignicaoPercent >= 25) return "FAISCA";
  return "CINZAS";
}

export function hasAnyFrozenMember(calorRows: MuscleCalorRow[]): boolean {
  return calorRows.some((row) => row.is_frozen);
}

export function buildCalorPayloadFingerprint(calorRows: MuscleCalorRow[], ignicao: number): string {
  return `${ignicao}:${calorRows.map((r) => `${r.membro_principal}:${r.nivel_calculado}:${r.is_frozen}:${r.metrica_bruta ?? 0}`).join("|")}`;
}

export type HudMuscleGroup =
  | "peito"
  | "ombros"
  | "bracos"
  | "pernas"
  | "abdomen"
  | "costas";

export type HudBodyFacing = "front" | "back";

export const HUMAN_BODY_VIEWBOX = {
  width: 400,
  height: 600,
  attribute: "0 0 400 600",
} as const;

export type HumanBodyVectorMesh = {
  /** Path principal do grupo muscular */
  d: string;
  /** Line-art interno · malha vetorial HUD */
  wire: string;
};

/**
 * Landmarks anatômicos · baseline única frontal/dorsal (y idênticos)
 * Proporção atlética ~8 cabeças · viewBox 0 0 400 600
 */
export const HUD_BODY_LANDMARKS = {
  headTop: 52,
  chin: 104,
  shoulderY: 148,
  chestBottom: 214,
  waistY: 252,
  crotchY: 278,
  kneeY: 436,
  footY: 576,
  centerX: 200,
} as const;

/** Silhueta unificada · tronco contínuo até o quadril, pernas integradas */
const HUD_BODY_SILHOUETTE =
  "M200 52 C215 52 225 62 227 78 C229 92 223 102 200 104 C177 102 171 92 173 78 C175 62 185 52 200 52 Z M187 104 C172 110 156 124 146 144 C136 168 132 200 130 236 C128 272 130 308 134 342 C138 376 144 408 150 434 C154 450 158 462 160 468 C160 472 158 476 156 478 C152 492 146 528 142 564 C140 574 150 578 166 576 L188 578 L200 580 L212 578 L234 576 C250 578 260 574 258 564 C254 528 248 492 244 478 C242 476 240 472 240 468 C242 462 246 450 250 434 C256 408 262 376 266 342 C270 308 272 272 270 236 C268 200 264 168 254 144 C244 124 228 110 213 104 L200 104 Z";

/** Pernas · topo colado ao quadril (y=278) · continuidade com abdômen/costas */
const HUD_LEGS_MESH = {
  d: "M160 278 L188 278 C186 318 180 368 174 418 C168 468 162 518 156 562 L148 576 C138 564 134 520 136 468 C138 416 144 362 160 278 Z M240 278 L212 278 C214 318 220 368 226 418 C232 468 238 518 244 562 L252 576 C262 564 266 520 264 468 C262 416 256 362 240 278 Z",
  wire:
    "M160 278 L200 278 L240 278 M134 468 L174 418 M266 468 L226 418 M168 384 L182 380 M232 384 L218 380 M152 552 L164 546 M248 552 L236 546",
} as const;

export const HUMAN_BODY_VECTORS = {
  viewBox: HUMAN_BODY_VIEWBOX.attribute,

  silhouette: {
    front: HUD_BODY_SILHOUETTE,
    back: HUD_BODY_SILHOUETTE,
  },

  spine: {
    front: "M200 106 C200 172 200 264 200 356 C200 448 200 518 200 562",
    back: "M200 106 C200 172 200 264 200 356 C200 448 200 518 200 562",
  },

  hudArcs: {
    front:
      "M148 148 C170 138 230 138 252 148 M174 252 C186 242 214 242 226 252",
    back:
      "M148 148 C170 138 230 138 252 148 M174 252 C186 242 214 242 226 252",
  },

  lineArt: {
    front:
      "M148 148 C174 138 226 138 252 148 M144 168 L256 168 M152 188 C174 180 226 180 248 188 M148 212 C170 204 230 204 252 212 M144 236 C166 228 234 228 256 236 M200 104 L200 188 M132 168 C120 208 116 258 118 308 M268 168 C280 208 284 258 282 308 M160 396 C180 386 220 386 240 396 M164 474 C184 464 216 464 236 474 M136 132 L264 132 M160 278 L240 278",
    back:
      "M148 148 C174 138 226 138 252 148 M144 168 L256 168 M152 188 C174 180 226 180 248 188 M148 212 C170 204 230 204 252 212 M144 236 C166 228 234 228 256 236 M200 104 L200 278 M128 168 C112 212 106 264 108 316 M272 168 C288 212 294 264 292 316 M156 400 C176 388 224 388 244 400 M160 478 C180 466 220 466 240 478 M160 132 C182 124 218 124 240 132 M160 278 L240 278",
  },

  silhouetteWire: {
    front:
      "M200 52 L200 580 M144 168 L256 168 M130 236 L270 236 M150 434 L250 434 M148 148 L252 148 M148 212 L252 212 M144 236 L256 236 M160 278 L240 278",
    back:
      "M200 52 L200 580 M144 168 L256 168 M130 236 L270 236 M150 434 L250 434 M148 148 L252 148 M148 212 L252 212 M144 236 L256 236 M160 278 L240 278",
  },

  front: {
    ombros: {
      d: "M148 168 C138 166 126 156 122 146 C120 140 124 134 130 132 C136 130 142 134 146 140 C148 144 148 148 148 148 L148 168 Z M252 168 C262 166 274 156 278 146 C280 140 276 134 270 132 C264 130 258 134 254 140 C252 144 252 148 252 148 L252 168 Z",
      wire:
        "M148 148 L252 148 M148 168 C128 148 132 134 M252 168 C272 148 268 134 M136 132 L264 132",
    },
    peito: {
      d: "M148 148 C148 134 168 126 200 128 C232 126 252 134 252 148 C252 176 238 198 200 204 C162 198 148 176 148 148 Z",
      wire:
        "M148 148 C200 128 252 148 M158 162 C180 154 220 154 242 162 M166 180 C184 174 216 174 234 180 M200 128 L200 204",
    },
    bracos: {
      d: "M148 168 C134 172 122 192 114 222 C106 258 104 302 108 344 C112 382 120 410 130 418 C140 404 144 364 146 314 C148 264 148 214 148 168 Z M252 168 C266 172 278 192 286 222 C294 258 296 302 292 344 C288 382 280 410 270 418 C260 404 256 364 254 314 C252 264 252 214 252 168 Z",
      wire:
        "M148 168 C122 192 114 222 M108 344 C120 410 130 418 M252 168 C278 192 286 222 M292 344 C280 410 270 418 M116 276 L124 348 M284 276 L276 348",
    },
    abdomen: {
      d: "M172 198 C172 192 186 188 200 190 C214 188 228 192 228 198 C226 222 218 242 200 250 C182 242 174 222 172 198 Z M174 222 C170 238 164 258 160 278 L240 278 C236 258 230 238 226 222 C214 248 186 248 174 222 Z",
      wire:
        "M172 198 L228 198 M176 212 L224 212 M180 228 L220 228 M184 242 L216 242 M200 190 L200 278 M160 278 L240 278",
    },
    pernas: HUD_LEGS_MESH,
  },

  back: {
    ombros: {
      d: "M132 168 C122 166 110 156 106 146 C104 140 108 134 114 132 C120 130 126 134 130 140 C132 144 132 148 132 148 L132 168 Z M268 168 C278 166 290 156 294 146 C296 140 292 134 286 132 C280 130 274 134 270 140 C268 144 268 148 268 148 L268 168 Z",
      wire:
        "M132 148 L268 148 M132 168 C112 148 116 134 M268 168 C288 148 284 134 M160 132 C182 124 218 124 240 132",
    },
    costas: {
      d: "M132 148 C132 132 162 124 200 128 C238 124 268 132 268 148 C268 176 254 216 200 228 C146 216 132 176 132 148 Z M160 132 C174 128 186 126 200 128 C214 126 226 128 240 132 C232 138 216 142 200 144 C184 142 168 138 160 132 Z M174 228 C170 244 164 262 160 278 L240 278 C236 262 230 244 226 228 C214 252 186 252 174 228 Z",
      wire:
        "M132 148 C200 128 268 148 M144 164 C170 152 230 152 256 164 M152 184 C176 174 224 174 248 184 M200 128 L200 278 M160 278 L240 278 M160 132 C200 124 240 132",
    },
    bracos: {
      d: "M132 168 C116 174 102 196 94 230 C86 268 84 312 88 354 C92 390 100 414 110 422 C120 408 124 368 126 322 C128 276 128 220 132 168 Z M268 168 C284 174 298 196 306 230 C314 268 316 312 312 354 C308 390 300 414 290 422 C280 408 276 368 274 322 C272 276 272 220 268 168 Z",
      wire:
        "M132 168 C102 196 94 230 M88 354 C100 414 110 422 M268 168 C298 196 306 230 M312 354 C300 414 290 422 M100 280 L108 352 M300 280 L292 352",
    },
    pernas: HUD_LEGS_MESH,
  },
} as const;

export const HUD_MUSCLE_GROUPS_BY_FACING: Record<HudBodyFacing, readonly HudMuscleGroup[]> = {
  front: ["peito", "ombros", "bracos", "abdomen", "pernas"],
  back: ["costas", "ombros", "bracos", "pernas"],
};

/** Ordem de pintura · camadas anatômicas (base → topo) */
export const HUD_MUSCLE_RENDER_ORDER: Record<HudBodyFacing, readonly HudMuscleGroup[]> = {
  front: ["pernas", "abdomen", "ombros", "peito", "bracos"],
  back: ["pernas", "ombros", "costas", "bracos"],
};

export function getHudPath(
  facing: HudBodyFacing,
  group: HudMuscleGroup,
): HumanBodyVectorMesh | null {
  if (facing === "front") {
    if (group === "costas") return null;
    return HUMAN_BODY_VECTORS.front[group];
  }
  if (group === "abdomen" || group === "peito") return null;
  return HUMAN_BODY_VECTORS.back[group];
}

export const HUD_GROUP_TO_SOVEREIGN: Record<HudMuscleGroup, SovereignMuscleId> = {
  peito: "PEITO",
  ombros: "OMBROS",
  bracos: "BRACOS",
  costas: "COSTAS",
  abdomen: "ABDOMEN",
  pernas: "PERNAS",
};

export type NiveisTermicos = Record<HudMuscleGroup, MuscleCalorLevel>;

export type CongelamentoPorMembro = Partial<Record<HudMuscleGroup, boolean>>;

export function calorRowsToNiveisTermicos(rows: MuscleCalorRow[]): NiveisTermicos {
  const find = (id: SovereignMuscleId): MuscleCalorLevel =>
    rows.find((row) => row.membro_principal === id)?.nivel_calculado ?? "CINZAS";

  return {
    peito: find("PEITO"),
    ombros: find("OMBROS"),
    bracos: find("BRACOS"),
    costas: find("COSTAS"),
    abdomen: find("ABDOMEN"),
    pernas: find("PERNAS"),
  };
}

export function calorRowsToCongelamento(rows: MuscleCalorRow[]): CongelamentoPorMembro {
  const map: CongelamentoPorMembro = {};
  for (const row of rows) {
    const group = row.membro_principal.toLowerCase() as HudMuscleGroup;
    map[group] = row.is_frozen;
  }
  return map;
}

/** ID estável do grupo muscular · compartilhado entre visão frontal e dorsal */
export function hudMuscleDomId(group: HudMuscleGroup): string {
  return `fenyxia-hud-${group}`;
}
