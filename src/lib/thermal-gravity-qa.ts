import type { PhaseTier } from "@/lib/dashboard-config";
import { PHASE_TIER_LABELS } from "@/lib/dashboard-config";
import { DEFAULT_ACADEMIA_CONFIG } from "@/lib/academia-config";
import { evaluateThermalGravity } from "@/lib/thermal-gravity";
import { formatMonthLabelPt, resolveCurrentMonthKeySp } from "@/lib/meta-sync-calendar";

export const THERMAL_GRAVITY_QA_STORAGE_KEY = "meccafit:qa-thermal-gravity";
export const THERMAL_GRAVITY_QA_UPDATED_EVENT = "meccafit:qa-thermal-gravity-updated";

export type ThermalGravityQaOverride = {
  phase_tier: PhaseTier;
  vtc_month: number;
  session_vtc_today: number;
  vtc_30d?: number;
  simulate_month_boundary_degraded?: boolean;
  simulate_month_at_risk?: boolean;
  settled_month_label?: string;
  days_remaining?: number;
};

export type ThermalGravityQaPreset = {
  id: string;
  label: string;
  hint: string;
  howTo: string;
  override: ThermalGravityQaOverride | null;
};

function buildMonthBoundaryDegradedOverride(): ThermalGravityQaOverride {
  const currentMonthLabel = formatMonthLabelPt(resolveCurrentMonthKeySp());
  return {
    phase_tier: 3,
    vtc_month: 8_000,
    session_vtc_today: 0,
    simulate_month_boundary_degraded: true,
    settled_month_label: currentMonthLabel,
  };
}

export const THERMAL_GRAVITY_QA_PRESETS: ReadonlyArray<ThermalGravityQaPreset> = [
  {
    id: "month-boundary-degraded",
    label: "Virada do mês sem meta",
    hint: "Simula a regressão do ciclo civil atual (Brasília) quando a meta mensal não foi cumprida.",
    howTo:
      "Dispare o preset e abra Evolução. O mês exibido segue o calendário de Brasília; a fase desce no card.",
    override: buildMonthBoundaryDegradedOverride(),
  },
  {
    id: "month-at-risk",
    label: "Fim do mês em risco",
    hint: "Simula poucos dias restantes com VTC do mês ainda baixo.",
    howTo: "Dispare o preset e abra o dashboard. O aviso aparece no topo por cerca de 12 segundos.",
    override: {
      phase_tier: 4,
      vtc_month: 18_000,
      session_vtc_today: 0,
      days_remaining: 5,
      simulate_month_at_risk: true,
    },
  },
  {
    id: "month-goal-met",
    label: "Meta do mês cumprida",
    hint: "Simula o mês em que você já atingiu o VTC necessário para subir ou se manter.",
    howTo: "Abra Evolução. O card fica verde e informa que a fase está protegida neste ciclo.",
    override: {
      phase_tier: 3,
      vtc_month: DEFAULT_ACADEMIA_CONFIG.phase_vtc_labareda + 2_500,
      session_vtc_today: 0,
    },
  },
  {
    id: "clear",
    label: "Limpar simulação",
    hint: "Remove o cenário fictício e volta a usar os dados reais do servidor.",
    howTo: "Clique aqui e abra Evolução de novo. Se o card não atualizar, recarregue a página.",
    override: null,
  },
];

function parseStoredOverride(raw: string): ThermalGravityQaOverride | null {
  try {
    const parsed = JSON.parse(raw) as ThermalGravityQaOverride;
    if (!parsed || typeof parsed !== "object") return null;
    const tier = Math.min(5, Math.max(1, Math.round(Number(parsed.phase_tier) || 1))) as PhaseTier;
    return {
      phase_tier: tier,
      vtc_month: Math.max(0, Number(parsed.vtc_month) || 0),
      session_vtc_today: Math.max(0, Number(parsed.session_vtc_today) || 0),
      vtc_30d: parsed.vtc_30d !== undefined ? Math.max(0, Number(parsed.vtc_30d) || 0) : undefined,
      simulate_month_boundary_degraded: parsed.simulate_month_boundary_degraded === true,
      simulate_month_at_risk: parsed.simulate_month_at_risk === true,
      settled_month_label:
        typeof parsed.settled_month_label === "string" ? parsed.settled_month_label : undefined,
      days_remaining:
        typeof parsed.days_remaining === "number" && Number.isFinite(parsed.days_remaining)
          ? Math.max(0, Math.round(parsed.days_remaining))
          : undefined,
    };
  } catch {
    return null;
  }
}

export function readThermalGravityQaOverride(): ThermalGravityQaOverride | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(THERMAL_GRAVITY_QA_STORAGE_KEY);
    if (!raw) return null;
    return parseStoredOverride(raw);
  } catch {
    return null;
  }
}

export function writeThermalGravityQaOverride(override: ThermalGravityQaOverride | null): void {
  if (typeof window === "undefined") return;
  try {
    if (override) {
      window.localStorage.setItem(THERMAL_GRAVITY_QA_STORAGE_KEY, JSON.stringify(override));
    } else {
      window.localStorage.removeItem(THERMAL_GRAVITY_QA_STORAGE_KEY);
    }
  } catch {
    // quota / private mode
  }
  window.dispatchEvent(new CustomEvent(THERMAL_GRAVITY_QA_UPDATED_EVENT));
}

export function applyThermalGravityQaPreset(presetId: string): ThermalGravityQaOverride | null {
  const preset = THERMAL_GRAVITY_QA_PRESETS.find((item) => item.id === presetId);
  if (!preset) return null;
  const override =
    presetId === "month-boundary-degraded" ? buildMonthBoundaryDegradedOverride() : preset.override;
  writeThermalGravityQaOverride(override);
  return override;
}

export function describeThermalGravityQaState(override: ThermalGravityQaOverride): string {
  const state = evaluateThermalGravity(override.phase_tier, {
    vtc_month: override.vtc_month,
    session_vtc_today: override.session_vtc_today,
    vtc_30d: override.vtc_30d,
  });
  const vtc = override.vtc_month.toLocaleString("pt-BR");
  const tierLabel = PHASE_TIER_LABELS[override.phase_tier];
  if (override.simulate_month_boundary_degraded) {
    const degradedTier = Math.max(1, override.phase_tier - 1);
    const fromLabel = PHASE_TIER_LABELS[override.phase_tier];
    const toLabel = PHASE_TIER_LABELS[degradedTier as PhaseTier];
    return `${fromLabel} → ${toLabel} na virada simulada (${override.vtc_month.toLocaleString("pt-BR")} kg no mês).`;
  }
  if (override.simulate_month_at_risk) {
    return `${tierLabel}, ${vtc} kg no mês. Fim do mês em risco simulado.`;
  }
  return `${tierLabel}, ${vtc} kg no mês. Layout ${state.phase_reached}.`;
}
