import { PHASE_TIER_LABELS, type PhaseTier } from "@/lib/dashboard-config";
import { resolvePhaseTier } from "@/lib/custom-preferences";
import { formatMonthLabelPt } from "@/lib/meta-sync-calendar";

/** Dias sem entrar no app antes da penalidade de inatividade. */
export const LINHAGEM_INACTIVITY_DAYS = 30;

/** Toast inicial ao retornar após 30+ dias (antes do aviso persistente). */
export const LINHAGEM_INACTIVITY_RETURN_TOAST_MS = 8_000;

const COUNT_WORDS_FEMININE: Record<number, string> = {
  1: "Uma",
  2: "Duas",
  3: "Três",
  4: "Quatro",
  5: "Cinco",
};

const COUNT_WORDS_MASCULINE: Record<number, string> = {
  1: "Um",
  2: "Dois",
  3: "Três",
  4: "Quatro",
  5: "Cinco",
};

export function formatCountWordPt(count: number, feminine = true): string {
  const map = feminine ? COUNT_WORDS_FEMININE : COUNT_WORDS_MASCULINE;
  const rounded = Math.min(5, Math.max(1, Math.round(count)));
  return map[rounded] ?? String(rounded);
}

export type LinhagemInactivitySyncResult = {
  degraded: boolean;
  phase_tier: PhaseTier;
  previous_tier: PhaseTier | null;
  phases_lost: number;
  days_absent: number | null;
  pending_rekindle: boolean;
  restore_tier: PhaseTier | null;
};

export type ThermalGravitySettlementResult = {
  degraded: boolean;
  phase_tier: PhaseTier;
  previous_tier: PhaseTier | null;
  settled_month: string | null;
  settled_month_label: string | null;
  first_settlement: boolean;
};

export function parseLinhagemInactivitySync(raw: unknown): LinhagemInactivitySyncResult | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;

  const phase_tier = resolvePhaseTier(row.phase_tier);
  const degraded = row.degraded === true;
  const previous_tier =
    typeof row.previous_tier === "number"
      ? (Math.min(5, Math.max(1, Math.round(row.previous_tier))) as PhaseTier)
      : null;
  const phases_lost =
    typeof row.phases_lost === "number" && Number.isFinite(row.phases_lost)
      ? Math.max(0, Math.round(row.phases_lost))
      : degraded
        ? 1
        : 0;
  const days_absent =
    typeof row.days_absent === "number" && Number.isFinite(row.days_absent)
      ? Math.max(0, Math.round(row.days_absent))
      : null;
  const pending_rekindle = row.pending_rekindle === true;
  const restore_tier =
    typeof row.restore_tier === "number"
      ? (Math.min(5, Math.max(1, Math.round(row.restore_tier))) as PhaseTier)
      : null;

  return {
    degraded,
    phase_tier,
    previous_tier,
    phases_lost,
    days_absent,
    pending_rekindle,
    restore_tier,
  };
}

export function parseThermalGravitySettlement(raw: unknown): ThermalGravitySettlementResult | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;

  const settled_month =
    typeof row.settled_month === "string" ? row.settled_month : null;

  return {
    degraded: row.degraded === true,
    phase_tier: resolvePhaseTier(row.phase_tier),
    previous_tier:
      typeof row.previous_tier === "number"
        ? (Math.min(5, Math.max(1, Math.round(row.previous_tier))) as PhaseTier)
        : null,
    settled_month,
    settled_month_label: settled_month ? formatMonthLabelPt(settled_month) : null,
    first_settlement: row.first_settlement === true,
  };
}

function resolveInactivityRegression(result: LinhagemInactivitySyncResult): {
  previousTier: PhaseTier;
  phasesLost: number;
  fromLabel: string;
  toLabel: string;
} | null {
  const previousTier = result.previous_tier ?? result.restore_tier;
  if (!previousTier) return null;

  const phasesLost =
    result.phases_lost > 0
      ? result.phases_lost
      : Math.max(0, previousTier - result.phase_tier);
  if (phasesLost < 1) return null;

  return {
    previousTier,
    phasesLost,
    fromLabel: PHASE_TIER_LABELS[previousTier],
    toLabel: PHASE_TIER_LABELS[result.phase_tier],
  };
}

/** Toast de 8s ao retornar após 30+ dias — anuncia a degradação antes do aviso persistente. */
export function buildLinhagemInactivityReturnMessage(
  result: LinhagemInactivitySyncResult,
): string {
  const regression = resolveInactivityRegression(result);
  if (!regression) return "";

  const phasesWord = formatCountWordPt(regression.phasesLost, true).toLowerCase();
  const phaseLabel = regression.phasesLost === 1 ? "fase" : "fases";
  const absenceHint =
    result.days_absent !== null && result.days_absent >= LINHAGEM_INACTIVITY_DAYS
      ? "Você ficou mais de trinta dias longe do altar"
      : "O altar permaneceu em silêncio por tempo demais";

  return (
    `${absenceHint}. A Chama regrediu ${phasesWord} ${phaseLabel}, ` +
    `de ${regression.fromLabel} para ${regression.toLabel}. Essa perda é definitiva.`
  );
}

/** Aviso persistente até concluir uma série no Treino. */
export function buildLinhagemInactivityAlertMessage(
  result: LinhagemInactivitySyncResult,
): string {
  if (!result.pending_rekindle) {
    return "";
  }

  const regression = resolveInactivityRegression(result);
  if (!regression) return "";

  const phasesWord = formatCountWordPt(regression.phasesLost, true).toLowerCase();
  const phaseLabel = regression.phasesLost === 1 ? "fase" : "fases";

  return (
    `A chama da linhagem aguarda seu retorno ao treino. A regressão permanece: ` +
    `${phasesWord} ${phaseLabel} perdida${regression.phasesLost === 1 ? "" : "s"}, ` +
    `de ${regression.fromLabel} para ${regression.toLabel}. ` +
    "Conclua qualquer série no Treino para reacender a chama e dispensar este aviso."
  );
}

/** @deprecated Use buildLinhagemInactivityAlertMessage */
export const buildLinhagemInactivityDegradationMessage = buildLinhagemInactivityAlertMessage;

export type LinhagemInactivityAckParams = {
  phase_tier: PhaseTier;
  previous_tier?: PhaseTier | null;
  phases_lost?: number;
};

/** Toast após concluir uma série com aviso de inatividade pendente. */
export function buildLinhagemInactivityAckMessage(
  params: LinhagemInactivityAckParams | PhaseTier,
): string {
  const normalized: LinhagemInactivityAckParams =
    typeof params === "number"
      ? { phase_tier: resolvePhaseTier(params) }
      : params;

  const tier = resolvePhaseTier(normalized.phase_tier);
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
    const phasesWord = formatCountWordPt(phasesLost, true).toLowerCase();
    const phaseLabel = phasesLost === 1 ? "fase" : "fases";
    return (
      `A chama foi reacendida no altar. Sua linhagem permanece em ${currentLabel}, ` +
      `após a regressão de ${phasesWord} ${phaseLabel} por inatividade (${fromLabel} para ${currentLabel}). ` +
      "Continue a forja a partir desta fase."
    );
  }

  return `Ritual retomado. Continue a forja a partir de ${currentLabel}.`;
}

export function buildLinhagemRegressionTitle(phasesLost = 1): string {
  const word = formatCountWordPt(phasesLost, true);
  return phasesLost === 1 ? `Linhagem regrediu ${word} fase` : `Linhagem regrediu ${word} fases`;
}
