/**
 * ARGOS — smoke tests de funções puras (sem rede, lógica espelhada do app)
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveTreinoPersistPayload } from "../lib/training-metric.mjs";
import {
  PLUTUS_TOLERANCE,
  computeUsagePct,
  evaluateLatencyTolerance,
  evaluateUsageTolerance,
  summarizePlutusAlerts,
} from "../lib/plutus-infra-alerts.mjs";
import {
  buildLinhagemInactivityAckMessage,
  buildLinhagemInactivityAlertMessage,
  buildLinhagemInactivityDegradationMessage,
  buildLinhagemInactivityReturnMessage,
  buildThermalGravityMonthAtRiskMessage,
  buildThermalGravitySettlementMessage,
  formatMonthlyGoalLabelMet,
  isLinhagemInactivityTreinoDegraded,
  isThermalGravityMonthAtRisk,
  resolveCurrentMonthKeyBrasilia,
  resolveThermalSettlementTierAfterMiss,
  shouldCelebrateLinhagemTierTransition,
} from "../lib/linhagem-thermal-alerts.mjs";

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

assert("PLUTUS usage 79% → ok", evaluateUsageTolerance({
  id: "t", label: "Test", used: 395, limit: 500, unit: "MB",
}).level === "ok");
assert("PLUTUS usage 80% → warn", evaluateUsageTolerance({
  id: "t", label: "Test", used: 400, limit: 500, unit: "MB",
}).level === "warn");
assert("PLUTUS usage 95% → critical", evaluateUsageTolerance({
  id: "t", label: "Test", used: 475, limit: 500, unit: "MB",
}).level === "critical");
assert("PLUTUS computeUsagePct arredonda", computeUsagePct(1, 3) === 33.33);
assert("PLUTUS latency dentro budget → ok", evaluateLatencyTolerance({
  id: "rpc", label: "RPC", observedMs: 120, budgetMs: 150,
}).level === "ok");
assert("PLUTUS latency +20% budget → warn", evaluateLatencyTolerance({
  id: "rpc", label: "RPC", observedMs: 180, budgetMs: 150,
}).level === "warn");
assert("PLUTUS latency +50% budget → critical", evaluateLatencyTolerance({
  id: "rpc", label: "RPC", observedMs: 225, budgetMs: 150,
}).level === "critical");
assert("PLUTUS summarize ok quando todos ok", summarizePlutusAlerts([
  evaluateUsageTolerance({ id: "a", label: "A", used: 10, limit: 100, unit: "MB" }),
]).ok);
assert("PLUTUS summarize critical quando há critical", summarizePlutusAlerts([
  evaluateUsageTolerance({ id: "a", label: "A", used: 96, limit: 100, unit: "MB" }),
]).worst === "critical");
assert("PLUTUS tolerance warn threshold", PLUTUS_TOLERANCE.warnPct === 80);

const inactivityReturnMsg = buildLinhagemInactivityReturnMessage({
  degraded: true,
  phase_tier: 3,
  previous_tier: 4,
  phases_lost: 1,
  days_absent: 35,
  pending_rekindle: true,
  restore_tier: 4,
});
assert(
  "inatividade retorno anuncia degradação em 8s",
  inactivityReturnMsg.includes("definitiva") &&
    inactivityReturnMsg.includes("Labareda") &&
    inactivityReturnMsg.includes("Brasa") &&
    !inactivityReturnMsg.includes("dispensar"),
);

const inactivityPendingMsg = buildLinhagemInactivityAlertMessage({
  degraded: false,
  phase_tier: 3,
  previous_tier: 4,
  phases_lost: 1,
  days_absent: null,
  pending_rekindle: true,
  restore_tier: 4,
});
assert(
  "inatividade pendente permanece até série",
  inactivityPendingMsg.includes("aguarda seu retorno") &&
    inactivityPendingMsg.includes("reacender a chama") &&
    inactivityPendingMsg.includes("Labareda") &&
    !inactivityPendingMsg.includes("--"),
);
assert(
  "degradação treino ativa com pending_rekindle",
  isLinhagemInactivityTreinoDegraded({ pending_rekindle: true, phase_tier: 3 }) &&
    !isLinhagemInactivityTreinoDegraded({ pending_rekindle: false, phase_tier: 3 }),
);
assert(
  "inatividade ack confirma reacendimento sem restaurar fase",
  buildLinhagemInactivityAckMessage({
    phase_tier: 3,
    previous_tier: 4,
    phases_lost: 1,
  }).includes("reacendida") &&
    buildLinhagemInactivityAckMessage({
      phase_tier: 3,
      previous_tier: 4,
      phases_lost: 1,
    }).includes("permanece em Brasa") &&
    !buildLinhagemInactivityAckMessage({
      phase_tier: 3,
      previous_tier: 4,
      phases_lost: 1,
    }).includes("restaur"),
);
assert(
  "transmutação não dispara em rebaixamento",
  !shouldCelebrateLinhagemTierTransition(4, 3, 4) &&
    shouldCelebrateLinhagemTierTransition(3, 4, 3),
);
assert(
  "transmutação só uma vez por nível",
  !shouldCelebrateLinhagemTierTransition(3, 4, 4),
);
assert(
  "virada do mês QA desce uma fase",
  resolveThermalSettlementTierAfterMiss(false, 3) === 2,
);

const settlementMsg = buildThermalGravitySettlementMessage({
  degraded: true,
  phase_tier: 3,
  previous_tier: 4,
  settled_month: "2026-06",
  settled_month_label: "junho de 2026",
  first_settlement: false,
});
assert(
  "virada do mês sem meta descreve regressão térmica",
  settlementMsg.includes("Gravidade Térmica de junho de 2026") &&
    settlementMsg.includes("Labareda") &&
    settlementMsg.includes("Brasa") &&
    !settlementMsg.includes("Prova de") &&
    !settlementMsg.includes("--"),
);

const monthRiskState = {
  leveled_up_this_month: false,
  days_remaining: 5,
  month_label: "junho de 2026",
  next_tier: 4,
};
assert(
  "fim do mês em risco detecta janela crítica",
  isThermalGravityMonthAtRisk(monthRiskState, 40) === true,
);
const monthRiskMsg = buildThermalGravityMonthAtRiskMessage(monthRiskState, 40);
assert(
  "fim do mês em risco cita Gravidade Térmica",
  monthRiskMsg.includes("5 dias") &&
    monthRiskMsg.includes("Gravidade Térmica de junho de 2026") &&
    monthRiskMsg.includes("abaixo da meta") &&
    !monthRiskMsg.includes("Fogo Cósmico") &&
    !monthRiskMsg.includes("--"),
);

assert(
  "meta do mês cumprida usa Gravidade Térmica",
  formatMonthlyGoalLabelMet({
    leveled_up_this_month: true,
    month_label: "junho de 2026",
  }).includes("Gravidade Térmica de junho de 2026"),
);

assert(
  "mês civil segue calendário de Brasília",
  /^\d{4}-\d{2}$/.test(resolveCurrentMonthKeyBrasilia()),
);

assert(
  "virada térmica rebaixa 1 fase da atual",
  resolveThermalSettlementTierAfterMiss(false, 4) === 3 &&
    resolveThermalSettlementTierAfterMiss(false, 1) === 1 &&
    resolveThermalSettlementTierAfterMiss(true, 4) === 4,
);

console.log(`\nARGOS unit smoke: ${passed} pass · ${failed} fail\n`);
process.exit(failed > 0 ? 4 : 0);
