/**
 * ARGOS — smoke tests de funções puras (sem rede, lógica espelhada do app)
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveTreinoPersistPayload } from "../lib/training-metric.mjs";

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed += 1;
  } else {
    console.log(`[FAIL] ${name}`);
    failed += 1;
  }
}

function loadExerciseCatalog() {
  const raw = readFileSync(resolve(process.cwd(), "src/data/test-exercise-catalog.json"), "utf8");
  return JSON.parse(raw);
}

function subgroupIdToMusculo(subgroupId) {
  const normalized = subgroupId.trim().toLowerCase();
  if (normalized.includes("peitoral") || normalized.includes("peito")) return "peito";
  if (normalized.includes("inferior") || normalized.includes("perna")) return "pernas";
  if (normalized === "core" || normalized.includes("abdome") || normalized.includes("abdômen")) {
    return "abdomen";
  }
  if (normalized.includes("costa")) return "costas";
  if (normalized.includes("ombro")) return "ombros";
  if (normalized.includes("braco") || normalized.includes("braço")) return "bracos";
  return "peito";
}

function resolveTreinoDayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
}

function applyHistoricoCompletionMirror(exercise, historicoWeight) {
  return {
    currentWeight: historicoWeight,
    historicalPrWeight: historicoWeight,
    completedSets: 0,
  };
}

function resolveCardioGoalMs(catalog, testMode) {
  if (testMode) return catalog.cardio.testGoalMs;
  return catalog.cardio.productionGoalMs;
}

function resolveTreinoPersistPayloadMirror(musculo, metricValue, prescribedSeries, metricKind, exercicioId) {
  return resolveTreinoPersistPayload({
    musculo,
    metricValue,
    prescribedSeries,
    metricKind,
    exercicioId,
  });
}

function reconcileSessionCompletedSetsMirror(exercises, completedMap) {
  const next = {};
  for (const exercise of exercises) {
    const sessionCompleted = Math.trunc(completedMap[exercise.id] ?? 0);
    if (sessionCompleted <= 0) continue;
    next[exercise.id] = Math.min(exercise.targetSets, sessionCompleted);
  }
  return next;
}

function sanitizeTextFilterParam(param) {
  if (param === null || param === undefined) return null;
  const normalized = param.trim().toLowerCase();
  if (!normalized || normalized === "geral") return null;
  return normalized;
}

function sanitizeNumericRouteParam(param) {
  const cleaned = sanitizeTextFilterParam(param);
  if (!cleaned || !/^\d+$/.test(cleaned)) return null;
  return Number.parseInt(cleaned, 10);
}

function isBrutaSuperacao(parsedWeight, referenceWeight) {
  return parsedWeight > referenceWeight;
}

function resolveHistoricoClienteId(rawUserId) {
  if (rawUserId === null || rawUserId === undefined) return null;
  const normalized = rawUserId.trim().toLowerCase();
  if (!normalized || normalized === "undefined" || normalized === "null") return null;
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  if (!uuidPattern.test(normalized)) return null;
  return normalized;
}

function resolveHistoricoExercicioId(rawId) {
  if (rawId === null || rawId === undefined) return 0;
  if (typeof rawId === "number") return Number.isFinite(rawId) && rawId > 0 ? Math.trunc(rawId) : 0;
  const normalized = String(rawId).trim().toLowerCase();
  if (!normalized || normalized === "geral") return 0;
  if (/^\d+$/.test(normalized)) return Number.parseInt(normalized, 10);
  return 0;
}

assert("sanitizeTextFilterParam ignora geral", sanitizeTextFilterParam("geral") === null);
assert("sanitizeTextFilterParam normaliza", sanitizeTextFilterParam(" Peitoral ") === "peitoral");
assert("sanitizeNumericRouteParam aceita dígitos", sanitizeNumericRouteParam("12") === 12);
assert("sanitizeNumericRouteParam rejeita slug", sanitizeNumericRouteParam("peitoral-superior") === null);
assert("isBrutaSuperacao estrito", isBrutaSuperacao(31, 30) === true);
assert("isBrutaSuperacao empate não supera", isBrutaSuperacao(30, 30) === false);
assert(
  "resolveHistoricoClienteId valida uuid",
  resolveHistoricoClienteId("d9417e8d-fd2f-41ec-b535-d38014c45c5c") !== null,
);
assert("resolveHistoricoClienteId rejeita undefined string", resolveHistoricoClienteId("undefined") === null);
assert("resolveHistoricoExercicioId numérico", resolveHistoricoExercicioId("7") === 7);
assert("resolveHistoricoExercicioId geral vira 0", resolveHistoricoExercicioId("geral") === 0);

const catalog = loadExerciseCatalog();
assert("catálogo possui 6 subgrupos", catalog.subgroups.length === 6);
assert(
  "catálogo cobre 6 músculos soberanos",
  new Set(catalog.subgroups.map((s) => s.musculo)).size === 6,
);
assert("catálogo possui 14 exercícios", catalog.subgroups.flatMap((s) => s.exercises).length === 14);
assert(
  "subgroup ombros mapeia musculo ombros",
  subgroupIdToMusculo("ombros-deltoides") === "ombros",
);
assert(
  "cardio test mode usa meta curta",
  resolveCardioGoalMs(catalog, true) === catalog.cardio.testGoalMs,
);
assert(
  "cardio produção usa meta longa",
  resolveCardioGoalMs(catalog, false) === catalog.cardio.productionGoalMs,
);
assert("treino day key formato ISO", /^\d{4}-\d{2}-\d{2}$/.test(resolveTreinoDayKey()));
assert(
  "histórico não marca completedSets (sessão diária)",
  applyHistoricoCompletionMirror({ targetSets: 4 }, 30).completedSets === 0,
);
assert(
  "sessão diária reconcilia conclusão",
  reconcileSessionCompletedSetsMirror([{ id: 1, targetSets: 4 }], { 1: 4 })[1] === 4,
);
assert("catálogo versão 2 com metricKind", catalog.version === 2);
assert(
  "prancha usa duration_sec",
  catalog.subgroups
    .flatMap((s) => s.exercises)
    .find((e) => e.id === 11)?.metricKind === "duration_sec",
);
assert(
  "abdomen persiste rep=1 (sem VTC inflado)",
  resolveTreinoPersistPayloadMirror("abdomen", 25, 4, "rep_max", 10).repeticoes === 1 &&
    resolveTreinoPersistPayloadMirror("abdomen", 25, 4, "rep_max", 10).pesoAtual === 25,
);
assert(
  "prancha persiste segundos com rep=1",
  resolveTreinoPersistPayloadMirror("abdomen", 45, 3, "duration_sec", 11).repeticoes === 1 &&
    resolveTreinoPersistPayloadMirror("abdomen", 45, 3, "duration_sec", 11).pesoAtual === 45,
);
assert(
  "peito persiste carga com rep=1",
  resolveTreinoPersistPayloadMirror("peito", 30, 4, "load_kg", 1).pesoAtual === 30 &&
    resolveTreinoPersistPayloadMirror("peito", 30, 4, "load_kg", 1).repeticoes === 1,
);

function parseIgnitionIndexMirror(source) {
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

assert("ignition_index MIDAS", parseIgnitionIndexMirror({ ignition_index: 72.4 }) === 72);
assert("indice_ignicao legado", parseIgnitionIndexMirror({ indice_ignicao: 41 }) === 41);
assert("ignition_index string", parseIgnitionIndexMirror({ ignition_index: "88.2" }) === 88);
assert("ignição ausente vira 0", parseIgnitionIndexMirror({}) === 0);

function sanitizeCardioSnapshotMirror(raw, userId, dayKey, goalMs = 1_800_000) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.v !== 2 || raw.userId !== userId) return null;
  if (raw.dayKey !== dayKey) return null;
  return { ...raw, goalMs };
}

function mergeCardioMirror(left, right) {
  if (!left) return right;
  if (!right) return left;
  return Date.parse(left.updatedAt) >= Date.parse(right.updatedAt) ? left : right;
}

const cardioDay = resolveTreinoDayKey();
const cardioUser = "11111111-1111-1111-1111-111111111111";
const cardioSnap = {
  v: 2,
  userId: cardioUser,
  dayKey: cardioDay,
  goalMs: 1_800_000,
  validatedMs: 120_000,
  windowAnchorMs: 0,
  status: "running",
  sessionStartedAtMs: Date.now(),
  lastHeartbeatMs: Date.now(),
  checkInPromptAtMs: null,
  hiddenAtMs: null,
  completedAt: null,
  updatedAt: new Date().toISOString(),
};

assert(
  "cardio snapshot aceita dia civil actual",
  sanitizeCardioSnapshotMirror(cardioSnap, cardioUser, cardioDay)?.validatedMs === 120_000,
);
assert(
  "cardio snapshot rejeita dia civil antigo",
  sanitizeCardioSnapshotMirror({ ...cardioSnap, dayKey: "1999-01-01" }, cardioUser, cardioDay) === null,
);
assert(
  "cardio merge prefere updatedAt mais recente",
  mergeCardioMirror(
    { ...cardioSnap, validatedMs: 10, updatedAt: "2026-06-19T10:00:00.000Z" },
    { ...cardioSnap, validatedMs: 99, updatedAt: "2026-06-19T11:00:00.000Z" },
  ).validatedMs === 99,
);

console.log(`\nARGOS unit smoke: ${passed} pass · ${failed} fail\n`);
process.exit(failed > 0 ? 4 : 0);
