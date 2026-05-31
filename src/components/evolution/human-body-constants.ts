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
  PEITO: { faisca: 100, brasa: 240, labareda: 480 },
  OMBROS: { faisca: 50, brasa: 140, labareda: 280 },
  BRACOS: { faisca: 60, brasa: 160, labareda: 320 },
  COSTAS: { faisca: 160, brasa: 500, labareda: 1000 },
  ABDOMEN: { faisca: 50, brasa: 150, labareda: 300 },
  PERNAS: { faisca: 160, brasa: 500, labareda: 1000 },
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
  if (upper === "FOGO COSMICO" || upper === "FOGO_COSMICO") return "FOGO CÓSMICO";
  if (MUSCLE_CALOR_LEVELS.includes(upper as MuscleCalorLevel)) {
    return upper as MuscleCalorLevel;
  }
  return "CINZAS";
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

  const indiceRaw = source.indice_ignicao;
  const indice_ignicao =
    typeof indiceRaw === "number" && Number.isFinite(indiceRaw)
      ? Math.max(0, Math.min(100, Math.round(indiceRaw)))
      : 0;

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
 * Malha vetorial · baseline unificada frontal/dorsal (y idênticos)
 * Atlético magro · viewBox 0 0 400 600
 */
const HUD_BODY_SILHOUETTE =
  "M200 34 C214 34 224 44 226 58 C228 72 222 84 200 86 C178 84 172 72 174 58 C176 44 186 34 200 34 Z M186 86 C172 94 160 112 152 140 C144 170 140 208 138 248 C136 288 138 328 142 368 C146 408 152 446 158 482 C164 514 172 540 180 554 C188 564 194 568 200 568 C206 568 212 564 220 554 C228 540 236 514 242 482 C248 446 254 408 258 368 C262 328 264 288 262 248 C260 208 256 170 248 140 C240 112 228 94 214 86 L200 86 Z";

export const HUMAN_BODY_VECTORS = {
  viewBox: HUMAN_BODY_VIEWBOX.attribute,

  silhouette: {
    front: HUD_BODY_SILHOUETTE,
    back: HUD_BODY_SILHOUETTE,
  },

  spine: {
    front: "M200 90 C200 160 200 250 200 340 C200 430 200 500 200 548",
    back: "M200 90 C200 160 200 250 200 340 C200 430 200 500 200 548",
  },

  hudArcs: {
    front:
      "M152 140 C172 128 228 128 248 140 M162 268 C178 258 222 258 238 268",
    back:
      "M152 140 C172 128 228 128 248 140 M162 268 C178 258 222 258 238 268",
  },

  lineArt: {
    front:
      "M152 140 C176 130 224 130 248 140 M148 160 L252 160 M156 178 C176 172 224 172 244 178 M152 204 C172 196 228 196 248 204 M148 232 C168 224 232 224 252 232 M200 86 L200 160 M132 176 C118 214 112 262 114 310 M268 176 C282 214 288 262 286 310 M160 380 C178 370 222 370 240 380 M164 458 C182 448 218 448 236 458 M138 118 L262 118 M152 165 L248 165",
    back:
      "M152 140 C176 130 224 130 248 140 M148 160 L252 160 M156 178 C176 172 224 172 244 178 M152 204 C172 196 228 196 248 204 M148 232 C168 224 232 224 252 232 M200 86 L200 260 M128 176 C112 218 106 268 108 318 M272 176 C288 218 294 268 292 318 M158 384 C178 372 222 372 242 384 M162 462 C182 450 218 450 238 462 M142 84 C168 74 232 74 258 84 M124 158 L276 158",
  },

  silhouetteWire: {
    front:
      "M200 34 L200 568 M148 160 L252 160 M138 248 L262 248 M158 482 L242 482 M152 140 L248 140 M152 204 L248 204 M148 232 L252 232",
    back:
      "M200 34 L200 568 M148 160 L252 160 M138 248 L262 248 M158 482 L242 482 M152 140 L248 140 M152 204 L248 204 M148 232 L252 232",
  },

  front: {
    /** Deltoide anterior · capsulares simétricas */
    ombros: {
      d: "M152 140 C141 132 130 118 132 100 C134 86 146 80 158 86 C164 94 162 110 156 122 C154 130 152 140 152 140 Z M248 140 C259 132 270 118 268 100 C266 86 254 80 242 86 C236 94 238 110 244 122 C246 130 248 140 248 140 Z",
      wire:
        "M152 140 C148 108 156 88 158 86 M248 140 C252 108 244 88 242 86 M138 118 L262 118 M152 140 L248 140 M146 104 L254 104",
    },
    peito: {
      d: "M152 140 C152 116 172 106 200 108 C228 106 248 116 248 140 C248 166 234 188 200 194 C166 188 152 166 152 140 Z",
      wire:
        "M152 140 C200 108 248 140 M162 156 C182 148 218 148 238 156 M168 172 C184 166 216 166 232 172 M200 108 L200 194",
    },
    bracos: {
      d: "M152 165 C140 170 128 188 120 218 C112 252 110 296 114 336 C118 372 126 398 136 406 C146 392 150 352 152 302 C154 252 154 208 152 165 Z M248 165 C260 170 272 188 280 218 C288 252 290 296 286 336 C282 372 274 398 264 406 C254 392 250 352 248 302 C246 252 246 208 248 165 Z",
      wire:
        "M152 165 C128 188 120 218 M114 336 C126 398 136 406 M248 165 C272 188 280 218 M286 336 C274 398 264 406 M124 268 L132 338 M276 268 L268 338",
    },
    abdomen: {
      d: "M162 192 C162 186 180 182 200 184 C220 182 238 186 238 192 C236 222 228 246 200 254 C172 246 164 222 162 192 Z",
      wire:
        "M162 192 L238 192 M168 208 L232 208 M172 224 L228 224 M176 240 L224 240 M200 184 L200 254",
    },
    pernas: {
      d: "M168 252 L188 252 C184 304 180 358 174 412 C168 466 162 492 154 506 L144 516 C134 504 130 470 132 420 C134 370 140 310 168 252 Z M232 252 L212 252 C216 304 220 358 226 412 C232 466 238 492 246 506 L256 516 C266 504 270 470 268 420 C266 370 260 310 232 252 Z",
      wire:
        "M168 252 L188 252 M132 420 L174 412 M232 252 L212 252 M268 420 L226 412 M176 360 L186 356 M224 360 L214 356 M150 488 L162 482 M250 488 L238 482",
    },
  },

  back: {
    /** Trapézio + deltoide posterior · mesmo id `ombros` na dorsal */
    ombros: {
      d: "M142 84 C168 74 232 74 258 84 C248 100 232 110 200 114 C168 110 152 100 142 84 Z M122 140 C108 128 98 110 102 94 C108 80 126 74 140 84 C144 96 140 114 134 128 L122 140 Z M278 140 C292 128 302 110 298 94 C292 80 274 74 260 84 C256 96 260 114 266 128 L278 140 Z",
      wire:
        "M142 84 C200 74 258 84 M122 140 C102 94 140 84 M278 140 C298 94 260 84 M122 140 L278 140 M152 100 L248 100 M134 92 L266 92",
    },
    costas: {
      d: "M124 140 C124 114 156 102 200 106 C244 102 276 114 276 140 C276 168 262 212 200 226 C138 212 124 168 124 140 Z",
      wire:
        "M124 140 C200 106 276 140 M136 158 C164 146 236 146 264 158 M144 178 C168 168 232 168 256 178 M200 106 L200 226",
    },
    bracos: {
      d: "M124 158 C108 166 94 188 86 222 C78 260 76 302 80 342 C84 376 92 400 102 408 C112 394 116 356 118 310 C120 264 120 210 124 158 Z M276 158 C292 166 306 188 314 222 C322 260 324 302 320 342 C316 376 308 400 298 408 C288 394 284 356 282 310 C280 264 280 210 276 158 Z",
      wire:
        "M124 158 C94 188 86 222 M80 342 C92 400 102 408 M276 158 C306 188 314 222 M320 342 C308 400 298 408 M92 262 L100 332 M308 262 L300 332",
    },
    pernas: {
      d: "M162 248 L188 248 C184 300 180 354 174 408 C168 462 162 488 154 502 L144 512 C134 500 130 466 132 416 C134 366 140 306 162 248 Z M238 248 L212 248 C216 300 220 354 226 408 C232 462 238 488 246 502 L256 512 C266 500 270 466 268 416 C266 366 260 306 238 248 Z",
      wire:
        "M162 248 L188 248 M132 416 L174 408 M238 248 L212 248 M268 416 L226 408 M168 356 L182 352 M232 356 L218 352 M148 484 L160 478 M252 484 L240 478",
    },
  },
} as const;

/** @deprecated Use HUMAN_BODY_VECTORS */
export const HUMAN_BODY_PATHS = HUMAN_BODY_VECTORS;

export const HUD_MUSCLE_GROUPS_BY_FACING: Record<HudBodyFacing, readonly HudMuscleGroup[]> = {
  front: ["peito", "ombros", "bracos", "abdomen", "pernas"],
  back: ["costas", "ombros", "bracos", "pernas"],
};

/** Ordem de pintura · camadas anatômicas (base → topo) */
export const HUD_MUSCLE_RENDER_ORDER: Record<HudBodyFacing, readonly HudMuscleGroup[]> = {
  front: ["pernas", "abdomen", "peito", "bracos", "ombros"],
  back: ["pernas", "costas", "bracos", "ombros"],
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
