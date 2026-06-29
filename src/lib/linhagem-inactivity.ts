import { PHASE_TIER_LABELS, type PhaseTier } from "@/lib/dashboard-config";
import { resolvePhaseTier } from "@/lib/custom-preferences";
import { formatMonthLabelPt } from "@/lib/meta-sync-calendar";

/** Dias sem entrar no app antes da penalidade de inatividade. */
export const LINHAGEM_INACTIVITY_DAYS = 30;

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

/** Toast ao retornar após 30+ dias sem entrar (inatividade — separada da Gravidade Térmica). */
export function buildLinhagemInactivityDegradationMessage(
  result: LinhagemInactivitySyncResult,
): string {
  if (!result.degraded || result.previous_tier === null || result.phases_lost < 1) {
    return "";
  }

  const phasesWord = formatCountWordPt(result.phases_lost, true).toLowerCase();
  const phaseLabel = result.phases_lost === 1 ? "fase" : "fases";
  const fromLabel = PHASE_TIER_LABELS[result.previous_tier];
  const toLabel = PHASE_TIER_LABELS[result.phase_tier];
  const absenceHint =
    result.days_absent !== null && result.days_absent >= LINHAGEM_INACTIVITY_DAYS
      ? `Você ficou mais de ${formatCountWordPt(1, true).toLowerCase()} mês longe do altar`
      : "O altar ficou em silêncio por tempo demais";

  return (
    `${absenceHint} — a Chama regrediu ${phasesWord} ${phaseLabel}: de ${fromLabel} para ${toLabel}. ` +
    `Conclua uma série de qualquer exercício no treino e sua linhagem volta a ${fromLabel}.`
  );
}

export function buildLinhagemRegressionTitle(phasesLost = 1): string {
  const word = formatCountWordPt(phasesLost, true);
  return phasesLost === 1 ? `Linhagem regrediu ${word} fase` : `Linhagem regrediu ${word} fases`;
}
