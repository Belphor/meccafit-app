import type { PhaseTier } from "@/lib/dashboard-config";

/** Configuração global da academia — defaults alinhados ao bootstrap ARGOS. */
export const DEFAULT_ACADEMIA_CONFIG = {
  meta_coletiva_alvo_kg: 100_000,
  phase_vtc_faisca: 5_000,
  phase_vtc_brasa: 20_000,
  phase_vtc_labareda: 50_000,
  phase_vtc_fogo_cosmico: 100_000,
} as const;

export type AcademiaConfig = {
  meta_coletiva_alvo_kg: number;
  phase_vtc_faisca: number;
  phase_vtc_brasa: number;
  phase_vtc_labareda: number;
  phase_vtc_fogo_cosmico: number;
  updated_at?: string | null;
  mes_referencia?: string | null;
  tonelagem_alvo_mes?: number;
  tonelagem_atual_mes?: number;
  progresso_pct?: number;
};

export type PhaseVtcThresholds = {
  faisca: number;
  brasa: number;
  labareda: number;
  fogoCosmico: number;
};

export function parseAcademiaConfig(raw: unknown): AcademiaConfig {
  const row = (raw ?? {}) as Record<string, unknown>;
  return {
    meta_coletiva_alvo_kg: Number(row.meta_coletiva_alvo_kg ?? DEFAULT_ACADEMIA_CONFIG.meta_coletiva_alvo_kg),
    phase_vtc_faisca: Number(row.phase_vtc_faisca ?? DEFAULT_ACADEMIA_CONFIG.phase_vtc_faisca),
    phase_vtc_brasa: Number(row.phase_vtc_brasa ?? DEFAULT_ACADEMIA_CONFIG.phase_vtc_brasa),
    phase_vtc_labareda: Number(row.phase_vtc_labareda ?? DEFAULT_ACADEMIA_CONFIG.phase_vtc_labareda),
    phase_vtc_fogo_cosmico: Number(
      row.phase_vtc_fogo_cosmico ?? DEFAULT_ACADEMIA_CONFIG.phase_vtc_fogo_cosmico,
    ),
    updated_at: row.updated_at ? String(row.updated_at) : null,
    mes_referencia: row.mes_referencia ? String(row.mes_referencia) : null,
    tonelagem_alvo_mes: Number(row.tonelagem_alvo_mes ?? row.meta_coletiva_alvo_kg ?? 0),
    tonelagem_atual_mes: Number(row.tonelagem_atual_mes ?? 0),
    progresso_pct: Number(row.progresso_pct ?? 0),
  };
}

export function resolvePhaseVtcThresholds(config?: Partial<AcademiaConfig> | null): PhaseVtcThresholds {
  return {
    faisca: config?.phase_vtc_faisca ?? DEFAULT_ACADEMIA_CONFIG.phase_vtc_faisca,
    brasa: config?.phase_vtc_brasa ?? DEFAULT_ACADEMIA_CONFIG.phase_vtc_brasa,
    labareda: config?.phase_vtc_labareda ?? DEFAULT_ACADEMIA_CONFIG.phase_vtc_labareda,
    fogoCosmico: config?.phase_vtc_fogo_cosmico ?? DEFAULT_ACADEMIA_CONFIG.phase_vtc_fogo_cosmico,
  };
}

/** Fase da linhagem derivada só do Volume de Carga Máxima(VTC) dos últimos 30 dias. */
export function resolvePhaseTierFromVtc30d(
  vtc30d: number,
  config?: Partial<AcademiaConfig> | null,
): PhaseTier {
  const t = resolvePhaseVtcThresholds(config);
  const v = Number.isFinite(vtc30d) && vtc30d > 0 ? vtc30d : 0;

  if (v >= t.fogoCosmico) return 5;
  if (v >= t.labareda) return 4;
  if (v >= t.brasa) return 3;
  if (v >= t.faisca) return 2;
  return 1;
}

export {
  formatCycleResetLabelPt,
  formatNextViradaDateShortPt,
  formatMonthLabelPt,
  isMetaSyncedForCurrentMonth,
  buildMetaSyncLockedMessagePt,
  buildMonthLengthHintPt,
  resolveCurrentMonthKeySp,
  resolveDaysUntilCycleResetSp,
} from "@/lib/meta-sync-calendar";
