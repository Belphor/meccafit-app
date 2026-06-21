/**
 * PLUTUS · Alertas de infraestrutura com bandas de tolerância (free tier).
 * Uso: scripts ARGOS · zero dependência de rede na avaliação pura.
 */

/** @typedef {"ok" | "warn" | "critical"} PlutusAlertLevel */

/** @typedef {{ id: string; label: string; used: number; limit: number; unit: string }} PlutusMetricInput */

/** @typedef {{ id: string; label: string; level: PlutusAlertLevel; used: number; limit: number; unit: string; usagePct: number; message: string }} PlutusAlertEvaluation */

export const PLUTUS_TOLERANCE = {
  /** Abaixo disto: OK silencioso */
  warnPct: 80,
  /** Acima disto: CRITICAL — accção imediata */
  criticalPct: 95,
};

/** Limites Supabase Free · referência Jun 2026 · ajustar em PLUTUS-INFRA-SNAPSHOT */
export const SUPABASE_FREE_LIMITS = {
  dbSizeMb: 500,
  egressGb: 5,
  monthlyActiveUsers: 50_000,
  realtimeConnections: 200,
};

/** Budgets HERMES · latência RPC dashboard (ms) */
export const HERMES_LATENCY_BUDGETS = {
  rpcWarmP95Ms: 150,
  rpcLoadP95Ms: 650,
  /** Tolerância acima do budget antes de WARN */
  warnOverBudgetPct: 15,
  /** Tolerância acima do budget antes de CRITICAL */
  criticalOverBudgetPct: 40,
};

/**
 * @param {number} used
 * @param {number} limit
 * @returns {number}
 */
export function computeUsagePct(used, limit) {
  if (!Number.isFinite(used) || used < 0) return 0;
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  return Math.round((used / limit) * 10_000) / 100;
}

/**
 * Avalia utilização contra limite com bandas PLUTUS (80% warn · 95% critical).
 * @param {PlutusMetricInput} metric
 * @returns {PlutusAlertEvaluation}
 */
export function evaluateUsageTolerance(metric) {
  const usagePct = computeUsagePct(metric.used, metric.limit);

  /** @type {PlutusAlertLevel} */
  let level = "ok";
  if (usagePct >= PLUTUS_TOLERANCE.criticalPct) level = "critical";
  else if (usagePct >= PLUTUS_TOLERANCE.warnPct) level = "warn";

  const message =
    level === "critical"
      ? `${metric.label} em ${usagePct}% — risco de bloqueio/custo (${metric.used}/${metric.limit} ${metric.unit})`
      : level === "warn"
        ? `${metric.label} em ${usagePct}% — aproxima-se do teto free (${metric.used}/${metric.limit} ${metric.unit})`
        : `${metric.label} dentro da tolerância (${usagePct}%)`;

  return {
    id: metric.id,
    label: metric.label,
    level,
    used: metric.used,
    limit: metric.limit,
    unit: metric.unit,
    usagePct,
    message,
  };
}

/**
 * Latência: invertida — quanto maior vs budget, pior o nível.
 * @param {{ id: string; label: string; observedMs: number; budgetMs: number }} input
 * @returns {PlutusAlertEvaluation}
 */
export function evaluateLatencyTolerance(input) {
  const { id, label, observedMs, budgetMs } = input;
  if (!Number.isFinite(observedMs) || observedMs <= 0 || budgetMs <= 0) {
    return {
      id,
      label,
      level: "ok",
      used: observedMs,
      limit: budgetMs,
      unit: "ms",
      usagePct: 0,
      message: `${label} — sem amostra`,
    };
  }

  const usagePct = computeUsagePct(observedMs, budgetMs);

  /** @type {PlutusAlertLevel} */
  let level = "ok";
  if (usagePct >= 100 + HERMES_LATENCY_BUDGETS.criticalOverBudgetPct) level = "critical";
  else if (usagePct >= 100 + HERMES_LATENCY_BUDGETS.warnOverBudgetPct) level = "warn";

  const message =
    level === "critical"
      ? `${label} p95=${observedMs}ms · ${usagePct}% do budget ${budgetMs}ms — CRITICAL`
      : level === "warn"
        ? `${label} p95=${observedMs}ms · acima do budget ${budgetMs}ms — WARN`
        : `${label} p95=${observedMs}ms · dentro do budget ${budgetMs}ms`;

  return {
    id,
    label,
    level,
    used: observedMs,
    limit: budgetMs,
    unit: "ms",
    usagePct,
    message,
  };
}

/**
 * @param {PlutusAlertEvaluation[]} evaluations
 * @returns {{ worst: PlutusAlertLevel; alerts: PlutusAlertEvaluation[]; ok: boolean }}
 */
export function summarizePlutusAlerts(evaluations) {
  const alerts = evaluations.filter((row) => row.level !== "ok");
  const worst = alerts.some((row) => row.level === "critical")
    ? "critical"
    : alerts.some((row) => row.level === "warn")
      ? "warn"
      : "ok";

  return { worst, alerts, ok: worst === "ok" };
}
