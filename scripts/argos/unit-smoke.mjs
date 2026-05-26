/**
 * ARGOS — smoke tests de funções puras (sem rede, lógica espelhada do app)
 */

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

console.log(`\nARGOS unit smoke: ${passed} pass · ${failed} fail\n`);
process.exit(failed > 0 ? 4 : 0);
