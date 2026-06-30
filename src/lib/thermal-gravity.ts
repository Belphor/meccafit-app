import {
  resolvePhaseVtcThresholds,
  type AcademiaConfig,
} from "@/lib/academia-config";
import {
  PHASE_LAYOUT_RESTORATION_SESSION_KG,
  PHASE_TIER_LABELS,
  type PhaseLayoutCode,
  type PhaseTier,
} from "@/lib/dashboard-config";
import { resolvePhaseTier } from "@/lib/custom-preferences";
import { formatMonthLabelPt, resolveMonthContextSp } from "@/lib/meta-sync-calendar";
import type { ThermalGravitySettlementResult } from "@/lib/linhagem-inactivity";

export type ThermalGravityMetrics = {
  vtc_month?: number;
  vtc_30d?: number;
  session_vtc_today: number;
};

export type ThermalGravityState = {
  phase_reached: PhaseLayoutCode;
  active_phase_layout: PhaseLayoutCode;
  effective_tier: PhaseTier;
  vtc_month: number;
  vtc_30d: number;
  session_vtc_today: number;
  month_label: string;
  day_of_month: number;
  days_in_month: number;
  days_remaining: number;
  monthly_goal_kg: number | null;
  next_tier: PhaseTier | null;
  leveled_up_this_month: boolean;
  is_degraded: boolean;
  restoration_active: boolean;
  restoration_session_baseline_kg: number | null;
  /** Mês civil avaliado na última virada (quando houve regressão). */
  settled_month_label?: string | null;
};

const PHASE_TIER_TO_LAYOUT: Record<PhaseTier, PhaseLayoutCode> = {
  1: "CINZAS",
  2: "FAISCA",
  3: "BRASA",
  4: "LABAREDA",
  5: "FOGO_COSMICO",
};

export function phaseTierToLayoutCode(tier: unknown): PhaseLayoutCode {
  return PHASE_TIER_TO_LAYOUT[resolvePhaseTier(tier)];
}

function sanitizeKg(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100) / 100;
}

export function resolveLevelThresholdKg(
  tier: PhaseTier,
  config?: Partial<AcademiaConfig> | null,
): number {
  const t = resolvePhaseVtcThresholds(config);
  switch (tier) {
    case 5:
      return t.fogoCosmico;
    case 4:
      return t.labareda;
    case 3:
      return t.brasa;
    case 2:
      return t.faisca;
    default:
      return 0;
  }
}

/** Meta do mês: patamar VTC da próxima fase (subir de nível até a virada do mês). */
export function resolveMonthlyLevelUpGoalKg(
  conqueredTier: PhaseTier,
  config?: Partial<AcademiaConfig> | null,
): { goalKg: number | null; nextTier: PhaseTier | null } {
  if (conqueredTier <= 1) {
    return { goalKg: resolveLevelThresholdKg(2, config), nextTier: 2 };
  }
  if (conqueredTier >= 5) {
    return { goalKg: resolveLevelThresholdKg(5, config), nextTier: null };
  }
  const nextTier = (conqueredTier + 1) as PhaseTier;
  return { goalKg: resolveLevelThresholdKg(nextTier, config), nextTier };
}

function restorationBaselineForPhase(phaseReached: PhaseLayoutCode): number | null {
  const baseline = PHASE_LAYOUT_RESTORATION_SESSION_KG[phaseReached];
  return baseline > 0 ? baseline : null;
}

/**
 * Gravidade Térmica · mês civil (Brasília).
 * A regressão acontece na virada do mês (servidor). O card mostra o ritmo do mês atual.
 */
export function evaluateThermalGravity(
  phaseTier: unknown,
  metrics: ThermalGravityMetrics,
  config?: Partial<AcademiaConfig> | null,
): ThermalGravityState {
  const conqueredTier = resolvePhaseTier(phaseTier);
  const phase_reached = phaseTierToLayoutCode(conqueredTier);
  const vtc_month = sanitizeKg(metrics.vtc_month ?? 0);
  const vtc_30d = sanitizeKg(metrics.vtc_30d ?? metrics.vtc_month ?? 0);
  const session_vtc_today = sanitizeKg(metrics.session_vtc_today);
  const monthCtx = resolveMonthContextSp();

  const { goalKg: monthly_goal_kg, nextTier: next_tier } = resolveMonthlyLevelUpGoalKg(
    conqueredTier,
    config,
  );

  const leveled_up_this_month =
    monthly_goal_kg !== null &&
    monthly_goal_kg > 0 &&
    (vtc_month >= monthly_goal_kg || vtc_30d >= monthly_goal_kg);

  const restoration_session_baseline_kg = restorationBaselineForPhase(phase_reached);

  return {
    phase_reached,
    active_phase_layout: phase_reached,
    effective_tier: conqueredTier,
    vtc_month,
    vtc_30d,
    session_vtc_today,
    month_label: monthCtx.monthLabel,
    day_of_month: monthCtx.dayOfMonth,
    days_in_month: monthCtx.daysInMonth,
    days_remaining: monthCtx.daysRemaining,
    monthly_goal_kg,
    next_tier,
    leveled_up_this_month,
    is_degraded: false,
    restoration_active: false,
    restoration_session_baseline_kg,
  };
}

export function parseThermalGravityState(raw: unknown): ThermalGravityState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;

  const phase_reached = row.phase_reached;
  const active_phase_layout = row.active_phase_layout;
  if (typeof phase_reached === "string" && typeof active_phase_layout === "string") {
    const monthCtx = resolveMonthContextSp();
    return {
      phase_reached: phase_reached as PhaseLayoutCode,
      active_phase_layout: active_phase_layout as PhaseLayoutCode,
      effective_tier:
        typeof row.effective_tier === "number"
          ? (Math.min(5, Math.max(1, Math.round(row.effective_tier))) as PhaseTier)
          : 1,
      vtc_month: sanitizeKg(row.vtc_month ?? row.vtc_20d ?? row.vtc_30d),
      vtc_30d: sanitizeKg(row.vtc_30d ?? row.vtc_month ?? row.vtc_20d),
      session_vtc_today: sanitizeKg(row.session_vtc_today),
      month_label: typeof row.month_label === "string" ? row.month_label : monthCtx.monthLabel,
      day_of_month: typeof row.day_of_month === "number" ? row.day_of_month : monthCtx.dayOfMonth,
      days_in_month: typeof row.days_in_month === "number" ? row.days_in_month : monthCtx.daysInMonth,
      days_remaining:
        typeof row.days_remaining === "number" ? row.days_remaining : monthCtx.daysRemaining,
      monthly_goal_kg:
        row.monthly_goal_kg === null || row.monthly_goal_kg === undefined
          ? null
          : sanitizeKg(row.monthly_goal_kg),
      next_tier:
        typeof row.next_tier === "number"
          ? (Math.min(5, Math.max(1, Math.round(row.next_tier))) as PhaseTier)
          : null,
      leveled_up_this_month: row.leveled_up_this_month === true,
      is_degraded: row.is_degraded === true,
      restoration_active: row.restoration_active === true,
      restoration_session_baseline_kg:
        row.restoration_session_baseline_kg === null
          ? null
          : sanitizeKg(row.restoration_session_baseline_kg),
      settled_month_label:
        typeof row.settled_month_label === "string" ? row.settled_month_label : null,
    };
  }

  const vtc_month = sanitizeKg(row.vtc_month ?? row.vtc_20d ?? row.vtc_30d);
  const vtc_30d = sanitizeKg(row.vtc_30d ?? vtc_month);
  const session_vtc_today = sanitizeKg(row.session_vtc_today);
  return evaluateThermalGravity(1, { vtc_month, vtc_30d, session_vtc_today });
}

export function thermalGravityToProfileFields(state: ThermalGravityState): Record<string, unknown> {
  return {
    phase_reached: state.phase_reached,
    active_phase_layout: state.active_phase_layout,
    thermal_gravity: state,
  };
}

export function resolveMonthlyLevelUpProgressPercent(state: ThermalGravityState): number | null {
  if (state.monthly_goal_kg === null || state.monthly_goal_kg <= 0) return null;
  const progress = Math.max(state.vtc_month, state.vtc_30d);
  return Math.min(150, Math.round((progress / state.monthly_goal_kg) * 100));
}

export function formatMonthlyGoalLabel(state: ThermalGravityState): string {
  if (state.leveled_up_this_month) {
    return `Gravidade Térmica de ${state.month_label} cumprida.`;
  }
  if (state.next_tier) {
    return `Alcance ${PHASE_TIER_LABELS[state.next_tier]} antes da virada do mês.`;
  }
  return `Renove ${PHASE_TIER_LABELS[5]} antes da virada do mês.`;
}

export function formatThermalGravityShortHint(state: ThermalGravityState): string {
  if (state.leveled_up_this_month) {
    return "Sua fase está protegida neste ciclo.";
  }
  return "Suba de fase até a virada do mês ou a linhagem desce um nível.";
}

export function isThermalGravityMonthAtRisk(
  state: ThermalGravityState,
  progressPercent: number,
): boolean {
  if (state.leveled_up_this_month) return false;
  const pct = Math.min(100, Math.max(0, progressPercent));
  return state.days_remaining <= 7 && pct < 70;
}

export function buildThermalGravityMonthAtRiskMessage(
  state: ThermalGravityState,
  progressPercent: number,
): string {
  if (!isThermalGravityMonthAtRisk(state, progressPercent)) return "";

  const days = state.days_remaining;
  const dayWord = days === 1 ? "dia" : "dias";

  return (
    `Faltam ${days} ${dayWord} para a virada do mês e a Gravidade Térmica de ${state.month_label} ` +
    "ainda está abaixo da meta. Reacenda o volume antes da virada para proteger sua fase."
  );
}

export function buildThermalGravitySettlementMessage(
  settlement: ThermalGravitySettlementResult,
): string {
  if (!settlement.degraded || settlement.previous_tier === null || settlement.first_settlement) {
    return "";
  }

  const fromLabel = PHASE_TIER_LABELS[settlement.previous_tier];
  const toLabel = PHASE_TIER_LABELS[settlement.phase_tier];
  const monthLabel =
    settlement.settled_month_label ??
    (settlement.settled_month ? formatMonthLabelPt(settlement.settled_month) : "o mês anterior");

  return (
    `A Gravidade Térmica de ${monthLabel} não foi cumprida. ` +
    `A linhagem desceu de ${fromLabel} para ${toLabel}. ` +
    "Reacenda o volume neste ciclo mensal."
  );
}
