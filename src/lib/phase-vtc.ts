import { PHASE_TIER_LABELS, type PhaseTier } from "@/lib/dashboard-config";

/** Limites de VTC 30d alinhados a calcular_estagio_forca (bootstrap). */
export const VTC_30D_TIER_THRESHOLDS = {
  faisca: 5_000,
  brasa: 20_000,
  labareda: 50_000,
  fogoCosmico: 100_000,
} as const;

/** Fase mínima esperada pelo volume acumulado nos últimos 30 dias. */
export function resolveExpectedPhaseTierFromVtc30d(vtc30d: number): PhaseTier {
  const v = Number.isFinite(vtc30d) && vtc30d > 0 ? vtc30d : 0;

  if (v >= VTC_30D_TIER_THRESHOLDS.fogoCosmico) return 5;
  if (v >= VTC_30D_TIER_THRESHOLDS.labareda) return 4;
  if (v >= VTC_30D_TIER_THRESHOLDS.brasa) return 3;
  if (v >= VTC_30D_TIER_THRESHOLDS.faisca) return 2;
  return 1;
}

/** Fase efetiva para exibição — nunca abaixo do volume justifica. */
export function resolveEffectivePhaseTier(registeredTier: unknown, vtc30d: number): PhaseTier {
  const registered = clampPhaseTier(registeredTier);
  const expected = resolveExpectedPhaseTierFromVtc30d(vtc30d);
  return Math.max(registered, expected) as PhaseTier;
}

export function clampPhaseTier(value: unknown): PhaseTier {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(5, Math.max(1, Math.round(parsed))) as PhaseTier;
}

export function phaseTierLabel(tier: PhaseTier): string {
  return PHASE_TIER_LABELS[tier];
}

export function formatVtcKg(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 kg";
  return `${Math.round(value).toLocaleString("pt-BR")} kg`;
}

export function hasPhaseTierMismatch(registeredTier: unknown, vtc30d: number): boolean {
  const registered = clampPhaseTier(registeredTier);
  const expected = resolveExpectedPhaseTierFromVtc30d(vtc30d);
  return expected > registered;
}
