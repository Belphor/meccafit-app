/**
 * Espelho das mensagens de alerta da Gravidade Térmica e Inatividade da Linhagem.
 */

const PHASE_TIER_LABELS = {
  1: "Cinzas",
  2: "Faísca",
  3: "Brasa",
  4: "Labareda",
  5: "Fogo Cósmico",
};

const COUNT_WORDS_FEMININE = {
  1: "uma",
  2: "duas",
  3: "três",
  4: "quatro",
  5: "cinco",
};

function resolveRegression(result) {
  const previousTier = result.previous_tier ?? result.restore_tier;
  if (previousTier == null) return null;
  const phasesLost =
    result.phases_lost > 0 ? result.phases_lost : Math.max(0, previousTier - result.phase_tier);
  if (phasesLost < 1) return null;
  return {
    phasesLost,
    fromLabel: PHASE_TIER_LABELS[previousTier],
    toLabel: PHASE_TIER_LABELS[result.phase_tier],
  };
}

export function buildLinhagemInactivityReturnMessage(result) {
  const regression = resolveRegression(result);
  if (!regression) return "";
  const phasesWord = COUNT_WORDS_FEMININE[Math.min(5, Math.max(1, regression.phasesLost))] ?? "uma";
  const phaseLabel = regression.phasesLost === 1 ? "fase" : "fases";
  const absenceHint =
    result.days_absent != null && result.days_absent >= 30
      ? "Você ficou mais de trinta dias longe do altar"
      : "O altar permaneceu em silêncio por tempo demais";
  return (
    `${absenceHint}. A Chama regrediu ${phasesWord} ${phaseLabel}, ` +
    `de ${regression.fromLabel} para ${regression.toLabel}. Essa perda é definitiva.`
  );
}

export function buildLinhagemInactivityAlertMessage(result) {
  if (!result.pending_rekindle) return "";
  const regression = resolveRegression(result);
  if (!regression) return "";
  const phasesWord = COUNT_WORDS_FEMININE[Math.min(5, Math.max(1, regression.phasesLost))] ?? "uma";
  const phaseLabel = regression.phasesLost === 1 ? "fase" : "fases";
  return (
    "A chama da linhagem aguarda seu retorno ao treino. A regressão permanece: " +
    `${phasesWord} ${phaseLabel} perdida${regression.phasesLost === 1 ? "" : "s"}, ` +
    `de ${regression.fromLabel} para ${regression.toLabel}. ` +
    "Conclua qualquer série no Treino para reacender a chama e dispensar este aviso."
  );
}

export const buildLinhagemInactivityDegradationMessage = buildLinhagemInactivityReturnMessage;

export function buildLinhagemInactivityAckMessage(params) {
  const normalized =
    typeof params === "number" ? { phase_tier: params } : params ?? { phase_tier: 1 };

  const tier = Math.min(5, Math.max(1, Math.round(normalized.phase_tier)));
  const currentLabel = PHASE_TIER_LABELS[tier];
  const previousTier = normalized.previous_tier ?? null;
  const phasesLost =
    normalized.phases_lost && normalized.phases_lost > 0
      ? normalized.phases_lost
      : previousTier && previousTier > tier
        ? previousTier - tier
        : 0;

  if (previousTier && previousTier > tier && phasesLost > 0) {
    const fromLabel = PHASE_TIER_LABELS[previousTier];
    const phasesWord = COUNT_WORDS_FEMININE[Math.min(5, Math.max(1, phasesLost))] ?? "uma";
    const phaseLabel = phasesLost === 1 ? "fase" : "fases";
    return (
      `A chama foi reacendida no altar. Sua linhagem permanece em ${currentLabel}, ` +
      `após a regressão de ${phasesWord} ${phaseLabel} por inatividade (${fromLabel} para ${currentLabel}). ` +
      "Continue a forja a partir desta fase."
    );
  }

  return `Ritual retomado. Continue a forja a partir de ${currentLabel}.`;
}

export function buildThermalGravitySettlementMessage(settlement) {
  if (!settlement.degraded || settlement.previous_tier == null || settlement.first_settlement) {
    return "";
  }

  const fromLabel = PHASE_TIER_LABELS[settlement.previous_tier];
  const toLabel = PHASE_TIER_LABELS[settlement.phase_tier];
  const monthLabel = settlement.settled_month_label ?? "o mês anterior";

  return (
    `A Gravidade Térmica de ${monthLabel} não foi cumprida. ` +
    `A linhagem desceu de ${fromLabel} para ${toLabel}. ` +
    "Reacenda o volume neste ciclo mensal."
  );
}

export function isThermalGravityMonthAtRisk(state, progressPercent) {
  if (!state || state.leveled_up_this_month) return false;
  const pct = Math.min(100, Math.max(0, progressPercent));
  return state.days_remaining <= 7 && pct < 70;
}

export function buildThermalGravityMonthAtRiskMessage(state, progressPercent) {
  if (!isThermalGravityMonthAtRisk(state, progressPercent)) return "";

  const days = state.days_remaining;
  const dayWord = days === 1 ? "dia" : "dias";

  return (
    `Faltam ${days} ${dayWord} para a virada do mês e a Gravidade Térmica de ${state.month_label} ` +
    "ainda está abaixo da meta. Reacenda o volume antes da virada para proteger sua fase."
  );
}

export function formatMonthlyGoalLabelMet(state) {
  if (!state.leveled_up_this_month) return "";
  return `Gravidade Térmica de ${state.month_label} cumprida.`;
}

export function resolveThermalSettlementTierAfterMiss(goalMet, currentTier) {
  if (goalMet) return currentTier;
  return Math.max(1, currentTier - 1);
}

export function shouldCelebrateLinhagemTierTransition(previousTier, nextTier, acknowledgedTier) {
  if (nextTier <= previousTier) return false;
  if (acknowledgedTier != null && nextTier <= acknowledgedTier) return false;
  return true;
}

export function resolveCurrentMonthKeyBrasilia(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).format(now).slice(0, 7);
}
