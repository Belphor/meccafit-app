import { PHASE_TIER_LABELS, type PhaseTier } from "@/lib/dashboard-config";
import { VTC_DISPLAY_NAME } from "@/lib/vtc-labels";
import {
  FENIX_EVOLUTION_SYSTEMS,
  formatThermalLevelWithContext,
  IGNICAO_LEVEL_THRESHOLDS,
} from "@/lib/fenix-evolution-glossary";
import {
  CALOR_LEVEL_LABELS,
  MUSCLE_LABELS,
  MUSCLE_THERMAL_CEILINGS,
  SOVEREIGN_MUSCLES,
  type MuscleCalorLevel,
  type SovereignMuscleId,
} from "@/components/evolution/human-body-constants";
import { resolvePhaseVtcThresholds, type AcademiaConfig } from "@/lib/academia-config";

export type EvolutionPhaseLevelRow = {
  tier: PhaseTier;
  label: string;
  vtcRangeLabel: string;
  description: string;
};

export type EvolutionMuscleThermalRow = {
  muscle: SovereignMuscleId;
  label: string;
  cinzas: string;
  faisca: string;
  brasa: string;
  labareda: string;
  fogoCosmico: string;
};

export type EvolutionRitmoLevelRow = {
  level: MuscleCalorLevel;
  label: string;
  rangeLabel: string;
};

function formatKg(value: number): string {
  return Math.round(value).toLocaleString("pt-BR");
}

export function buildPhaseLevelRows(
  config?: Partial<AcademiaConfig> | null,
): EvolutionPhaseLevelRow[] {
  const t = resolvePhaseVtcThresholds(config);

  return [
    {
      tier: 1,
      label: PHASE_TIER_LABELS[1],
      vtcRangeLabel: `0 a ${formatKg(t.faisca - 1)} kg de ${VTC_DISPLAY_NAME}`,
      description: `A Fênix repousa nas cinzas. Pouco ${VTC_DISPLAY_NAME} acumulado no mês.`,
    },
    {
      tier: 2,
      label: PHASE_TIER_LABELS[2],
      vtcRangeLabel: `${formatKg(t.faisca)} a ${formatKg(t.brasa - 1)} kg de ${VTC_DISPLAY_NAME}`,
      description: "Primeira faísca. Volume mensal inicial.",
    },
    {
      tier: 3,
      label: PHASE_TIER_LABELS[3],
      vtcRangeLabel: `${formatKg(t.brasa)} a ${formatKg(t.labareda - 1)} kg de ${VTC_DISPLAY_NAME}`,
      description: "Brasa estável. Evolução visível no acúmulo.",
    },
    {
      tier: 4,
      label: PHASE_TIER_LABELS[4],
      vtcRangeLabel: `${formatKg(t.labareda)} a ${formatKg(t.fogoCosmico - 1)} kg de ${VTC_DISPLAY_NAME}`,
      description: `Labareda da linhagem. Alto ${VTC_DISPLAY_NAME} mensal.`,
    },
    {
      tier: 5,
      label: PHASE_TIER_LABELS[5],
      vtcRangeLabel: `${formatKg(t.fogoCosmico)} kg de ${VTC_DISPLAY_NAME} ou mais`,
      description: "Elite de volume. Máxima intensidade no período.",
    },
  ];
}

export function buildMuscleThermalRows(): EvolutionMuscleThermalRow[] {
  return SOVEREIGN_MUSCLES.map((muscle) => {
    const c = MUSCLE_THERMAL_CEILINGS[muscle];
    return {
      muscle,
      label: MUSCLE_LABELS[muscle],
      cinzas: `Sem ${VTC_DISPLAY_NAME} ou 0 kg`,
      faisca: `1 a ${formatKg(c.faisca)} kg`,
      brasa: `${formatKg(c.faisca + 1)} a ${formatKg(c.brasa)} kg`,
      labareda: `${formatKg(c.brasa + 1)} a ${formatKg(c.labareda)} kg`,
      fogoCosmico: `Acima de ${formatKg(c.labareda)} kg`,
    };
  });
}

export function buildRitmoLevelRows(): EvolutionRitmoLevelRow[] {
  return IGNICAO_LEVEL_THRESHOLDS.map((item) => ({
    level: item.level,
    label: CALOR_LEVEL_LABELS[item.level],
    rangeLabel: item.rangeLabel,
  }));
}

export const IGNICAO_LEVEL_HINTS = IGNICAO_LEVEL_THRESHOLDS.map((item) => ({
  level: item.level,
  threshold: item.rangeLabel,
}));

export const PHASE_LEVELS_TABLE_INTRO = FENIX_EVOLUTION_SYSTEMS.chama_acumulada.explanation;

export const MUSCLE_LEVELS_TABLE_INTRO = FENIX_EVOLUTION_SYSTEMS.brasas_musculares.explanation;

export const IGNICAO_LEVELS_TABLE_INTRO = FENIX_EVOLUTION_SYSTEMS.ritmo_fenix.explanation;

export const THERMAL_GRAVITY_LEVELS_INTRO =
  "Todo mês civil (horário de Brasília), suba de fase na Chama Acumulada com o VTC dos últimos 30 dias. Na virada do mês, se não passar, a linhagem desce uma fase.";

export const LINHAGEM_INACTIVITY_LEVELS_INTRO =
  "Função separada da Gravidade Térmica. Se ficar 30 dias sem entrar no app, a linhagem desce uma fase de forma definitiva. Ao voltar, você recebe um aviso. Conclua uma série de qualquer exercício para dispensar o alerta e continue evoluindo a partir da fase atual.";

export const THERMAL_LEVELS_UNIFIED_INTRO =
  "Todos os sistemas usam os mesmos cinco nomes térmicos: Cinzas, Faísca, Brasa, Labareda e Fogo Cósmico. O que muda é a janela de tempo e o recorte (corpo inteiro, músculo ou percentual).";

export function ignicaoLevelLabel(level: MuscleCalorLevel): string {
  return formatThermalLevelWithContext(level, "consistency");
}

/** @deprecated Use buildMuscleThermalRows */
export function buildMuscleLevelRows() {
  return buildMuscleThermalRows().map((row) => ({
    muscle: row.muscle,
    label: row.label,
    faisca: MUSCLE_THERMAL_CEILINGS[row.muscle].faisca,
    brasa: MUSCLE_THERMAL_CEILINGS[row.muscle].brasa,
    labareda: MUSCLE_THERMAL_CEILINGS[row.muscle].labareda,
  }));
}
