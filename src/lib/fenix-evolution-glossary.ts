/**
 * Glossário de evolução · Volume de Carga Máxima (VTC) unificado
 */

import type { MuscleCalorLevel, SovereignMuscleId } from "@/components/evolution/human-body-constants";
import {
  CALOR_LEVEL_LABELS,
  MUSCLE_THERMAL_CEILINGS,
  PURITY_PENALTY_THRESHOLD,
  resolveThermalCeilingProgress,
} from "@/components/evolution/human-body-constants";
import type { PhaseTier } from "@/lib/dashboard-config";
import { PHASE_TIER_LABELS } from "@/lib/dashboard-config";
import { resolvePhaseVtcThresholds, type AcademiaConfig } from "@/lib/academia-config";
import {
  EVOLUTION_AVATAR_NOTE,
  VTC_DEFINITION,
  VTC_DISPLAY_NAME,
} from "@/lib/vtc-labels";

export { VTC_DEFINITION, VTC_DISPLAY_NAME, EVOLUTION_AVATAR_NOTE };

export type FenixEvolutionSystemId =
  | "chama_altar"
  | "chama_acumulada"
  | "brasas_musculares"
  | "ritmo_fenix"
  | "gravidade_termica"
  | "ascensao";

export type FenixEvolutionSystem = {
  id: FenixEvolutionSystemId;
  loreName: string;
  metricName: string;
  unit: string;
  period: string;
  explanation: string;
  chip: string;
};

export const FENIX_EVOLUTION_SYSTEMS: Record<FenixEvolutionSystemId, FenixEvolutionSystem> = {
  chama_altar: {
    id: "chama_altar",
    loreName: "Chama do Altar",
    metricName: `${VTC_DISPLAY_NAME} do dia`,
    unit: "kg",
    period: "Hoje, zera à meia-noite em São Paulo",
    explanation:
      `Soma do ${VTC_DISPLAY_NAME} de cada exercício concluído hoje. Mede só o seu treino individual.`,
    chip: `Chama do Altar · ${VTC_DISPLAY_NAME} hoje`,
  },
  chama_acumulada: {
    id: "chama_acumulada",
    loreName: "Chama Acumulada da Linhagem",
    metricName: `${VTC_DISPLAY_NAME} acumulado`,
    unit: "kg",
    period: "Últimos 30 dias · virada mensal civil",
    explanation:
      `Soma do ${VTC_DISPLAY_NAME} dos últimos 30 dias. Define a fase da linhagem e o anel do avatar.`,
    chip: `Chama Acumulada · ${VTC_DISPLAY_NAME} 30 dias`,
  },
  brasas_musculares: {
    id: "brasas_musculares",
    loreName: "Brasas Musculares",
    metricName: `${VTC_DISPLAY_NAME} por grupo muscular`,
    unit: "kg",
    period: "Últimos 14 dias",
    explanation:
      `Mesmo ${VTC_DISPLAY_NAME}, filtrado por músculo. Define a cor de cada região no mapa corporal.`,
    chip: `Brasas Musculares · ${VTC_DISPLAY_NAME} 14 dias`,
  },
  ritmo_fenix: {
    id: "ritmo_fenix",
    loreName: "Ritmo da Fênix",
    metricName: `Consistência de ${VTC_DISPLAY_NAME}`,
    unit: "%",
    period: "Últimos 30 dias",
    explanation:
      `Mostra quanto do seu ${VTC_DISPLAY_NAME} dos últimos 30 dias já atingiu a meta mensal definida pelos dias planejados. Nos primeiros 20 dias da linhagem, o mapa mantém cores vivas. Depois, Ritmo abaixo de 50 por cento deixa o mapa mais suave.`,
    chip: `Ritmo da Fênix · meta ${VTC_DISPLAY_NAME}`,
  },
  gravidade_termica: {
    id: "gravidade_termica",
    loreName: "Gravidade Térmica",
    metricName: `${VTC_DISPLAY_NAME} do mês civil`,
    unit: "kg",
    period: "Virada mensal civil · Brasília",
    explanation: "Suba de fase até a virada do mês ou desça um nível na linhagem.",
    chip: "Gravidade Térmica · prova mensal",
  },
  ascensao: {
    id: "ascensao",
    loreName: "Ascensão",
    metricName: `Recorde pessoal de ${VTC_DISPLAY_NAME}`,
    unit: "kg",
    period: "No instante do registro",
    explanation:
      `Celebração quando você supera seu próprio ${VTC_DISPLAY_NAME} naquele exercício. Não altera fase, mapa nem Ritmo.`,
    chip: `Ascensão · recorde ${VTC_DISPLAY_NAME}`,
  },
};

export const FENIX_THERMAL_LEVEL_CONTEXT = {
  phase: "Fase da Linhagem",
  muscle: "Brasas Musculares",
  consistency: "Ritmo da Fênix",
} as const;

export function formatThermalLevelWithContext(
  level: MuscleCalorLevel | string,
  context: keyof typeof FENIX_THERMAL_LEVEL_CONTEXT,
): string {
  const label =
    typeof level === "string" && level in CALOR_LEVEL_LABELS
      ? CALOR_LEVEL_LABELS[level as MuscleCalorLevel]
      : String(level);
  return `${label}: ${FENIX_THERMAL_LEVEL_CONTEXT[context]}`;
}

export function formatPhaseTierWithContext(tier: PhaseTier): string {
  return `${PHASE_TIER_LABELS[tier]}: ${FENIX_THERMAL_LEVEL_CONTEXT.phase}`;
}

export const SUPERACAO_LORE_FOOTNOTE = "Marco registrado neste exercício.";

export function resolveLinhagemTransmutationCopy(tier: PhaseTier): {
  subline: string;
  copy: string;
} {
  const tierLabel = PHASE_TIER_LABELS[tier].toUpperCase();
  const tierCopy = PHASE_TIER_LEVEL_UP_COPY[tier];
  return {
    subline: `DESPERTOU O NÍVEL ${tierLabel}`,
    copy: tierCopy.headline,
  };
}

export const EVOLUTION_SYSTEMS_OVERVIEW =
  `Existe um único número de carga: o ${VTC_DISPLAY_NAME}, em quilogramas. A Evolução mede o seu treino individual. A Comunidade mede a soma de todos os atletas no termômetro global.`;

export const IGNICAO_LEVEL_THRESHOLDS: ReadonlyArray<{
  level: MuscleCalorLevel;
  rangeLabel: string;
}> = [
  { level: "CINZAS", rangeLabel: "0 a 24 por cento do Ritmo da Fênix" },
  { level: "FAISCA", rangeLabel: "25 a 49 por cento do Ritmo da Fênix" },
  { level: "BRASA", rangeLabel: "50 a 69 por cento do Ritmo da Fênix" },
  { level: "LABAREDA", rangeLabel: "70 a 89 por cento do Ritmo da Fênix" },
  { level: "FOGO CÓSMICO", rangeLabel: "90 a 100 por cento do Ritmo da Fênix" },
];

export function resolveIgnicaoNextLevel(indiceIgnicao: number): {
  nextLevel: MuscleCalorLevel | null;
  minPercent: number | null;
  remainingPercent: number | null;
} {
  const steps = [
    { level: "FAISCA" as MuscleCalorLevel, min: 25 },
    { level: "BRASA" as MuscleCalorLevel, min: 50 },
    { level: "LABAREDA" as MuscleCalorLevel, min: 70 },
    { level: "FOGO CÓSMICO" as MuscleCalorLevel, min: 90 },
  ];

  for (const step of steps) {
    if (indiceIgnicao < step.min) {
      return {
        nextLevel: step.level,
        minPercent: step.min,
        remainingPercent: Math.max(0, step.min - indiceIgnicao),
      };
    }
  }
  return { nextLevel: null, minPercent: null, remainingPercent: null };
}

export type PhaseVtcProgress = {
  currentTier: PhaseTier;
  floorKg: number;
  ceilingKg: number | null;
  progressPercent: number;
  remainingKg: number | null;
  nextTier: PhaseTier | null;
};

function resolveConqueredTierFloor(tier: PhaseTier, t: ReturnType<typeof resolvePhaseVtcThresholds>): number {
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

function resolveConqueredTierCeiling(tier: PhaseTier, t: ReturnType<typeof resolvePhaseVtcThresholds>): number | null {
  if (tier >= 5) return null;
  return resolveConqueredTierFloor((tier + 1) as PhaseTier, t);
}

/**
 * Progresso da Chama Acumulada até o próximo patamar.
 * Quando `conqueredTier` é informado, usa a fase conquistada no perfil (anel) — alinhado à tabela de limiares.
 */
export function resolvePhaseVtcProgress(
  vtc30d: number,
  config?: Partial<AcademiaConfig> | null,
  conqueredTier?: PhaseTier,
): PhaseVtcProgress {
  const t = resolvePhaseVtcThresholds(config);
  const v = Number.isFinite(vtc30d) && vtc30d > 0 ? vtc30d : 0;

  if (conqueredTier != null) {
    const currentTier = Math.min(5, Math.max(1, Math.round(conqueredTier))) as PhaseTier;
    const floorKg = resolveConqueredTierFloor(currentTier, t);
    const ceilingKg = resolveConqueredTierCeiling(currentTier, t);

    if (currentTier >= 5 || ceilingKg === null) {
      const progressPercent =
        t.fogoCosmico > 0 ? Math.min(100, Math.round((v / t.fogoCosmico) * 100)) : 100;
      return {
        currentTier: 5,
        floorKg: t.fogoCosmico,
        ceilingKg: null,
        progressPercent,
        remainingKg: v < t.fogoCosmico ? Math.max(0, t.fogoCosmico - v) : null,
        nextTier: null,
      };
    }

    // Progresso absoluto até o próximo patamar (0 → ceiling), para a barra refletir o VTC real
    // mesmo quando o volume cai abaixo do piso da fase já conquistada no anel.
    const progressPercent =
      ceilingKg > 0 ? Math.min(100, Math.max(0, Math.round((v / ceilingKg) * 100))) : 0;

    return {
      currentTier,
      floorKg,
      ceilingKg,
      progressPercent,
      remainingKg: Math.max(0, ceilingKg - v),
      nextTier: (currentTier + 1) as PhaseTier,
    };
  }

  const steps: Array<{ tier: PhaseTier; floor: number; ceiling: number }> = [
    { tier: 1, floor: 0, ceiling: t.faisca },
    { tier: 2, floor: t.faisca, ceiling: t.brasa },
    { tier: 3, floor: t.brasa, ceiling: t.labareda },
    { tier: 4, floor: t.labareda, ceiling: t.fogoCosmico },
    { tier: 5, floor: t.fogoCosmico, ceiling: t.fogoCosmico },
  ];

  for (const step of steps) {
    if (v < step.ceiling || step.tier === 5) {
      const span = step.ceiling - step.floor;
      const progressPercent =
        step.tier === 5 ? 100 : span > 0 ? Math.min(100, Math.max(0, ((v - step.floor) / span) * 100)) : 0;
      const nextTier = step.tier < 5 ? ((step.tier + 1) as PhaseTier) : null;
      const remainingKg = step.tier < 5 ? Math.max(0, step.ceiling - v) : null;

      return {
        currentTier: step.tier,
        floorKg: step.floor,
        ceilingKg: step.tier < 5 ? step.ceiling : null,
        progressPercent,
        remainingKg,
        nextTier,
      };
    }
  }

  return {
    currentTier: 5,
    floorKg: t.fogoCosmico,
    ceilingKg: null,
    progressPercent: 100,
    remainingKg: null,
    nextTier: null,
  };
}

export const PHASE_TIER_LEVEL_UP_COPY: Record<PhaseTier, { headline: string; subline: string }> = {
  1: {
    headline: "Início da jornada",
    subline: "Cada treino acende a primeira brasa da sua linhagem.",
  },
  2: {
    headline: "Faísca desperta",
    subline: `Seu ${VTC_DISPLAY_NAME} dos últimos 30 dias cruzou o patamar de Faísca. A linhagem responde.`,
  },
  3: {
    headline: "Brasa consolidada",
    subline: "Volume consistente. O anel da linhagem ganhou mais uma camada de fogo.",
  },
  4: {
    headline: "Labareda ascendente",
    subline: "Carga acumulada em alta. Você está entre os que sustentam chama forte.",
  },
  5: {
    headline: "Fogo Cósmico Sagrado",
    subline: "Patamar máximo da linhagem. Sua chama acumulada brilha no topo.",
  },
};

export function resolvePhaseVtcNextTier(
  vtc30d: number,
  config?: Partial<AcademiaConfig> | null,
): {
  nextTier: PhaseTier | null;
  thresholdKg: number | null;
  remainingKg: number | null;
} {
  const t = resolvePhaseVtcThresholds(config);
  const v = Number.isFinite(vtc30d) && vtc30d > 0 ? vtc30d : 0;

  const steps: Array<{ tier: PhaseTier; threshold: number }> = [
    { tier: 2, threshold: t.faisca },
    { tier: 3, threshold: t.brasa },
    { tier: 4, threshold: t.labareda },
    { tier: 5, threshold: t.fogoCosmico },
  ];

  for (const step of steps) {
    if (v < step.threshold) {
      return {
        nextTier: step.tier,
        thresholdKg: step.threshold,
        remainingKg: Math.max(0, step.threshold - v),
      };
    }
  }

  return { nextTier: null, thresholdKg: null, remainingKg: null };
}

export type MuscleProgressHint = {
  nextLevelLabel: string | null;
  ceilingLabel: string | null;
  remainingLabel: string | null;
};

export function buildMuscleProgressHint(
  muscleId: SovereignMuscleId,
  metrica: number | undefined,
  level: MuscleCalorLevel,
): MuscleProgressHint {
  const progress = resolveThermalCeilingProgress(muscleId, metrica, level);

  if (!progress.nextLevel || progress.ceiling === null || progress.remaining === null) {
    return { nextLevelLabel: null, ceilingLabel: null, remainingLabel: null };
  }

  return {
    nextLevelLabel: formatThermalLevelWithContext(progress.nextLevel, "muscle"),
    ceilingLabel: `${Math.round(progress.ceiling).toLocaleString("pt-BR")} kg`,
    remainingLabel: `${Math.round(progress.remaining).toLocaleString("pt-BR")} kg`,
  };
}

export function buildMuscleCeilingSummary(muscleId: SovereignMuscleId): string {
  const c = MUSCLE_THERMAL_CEILINGS[muscleId];
  return `Faísca até ${c.faisca} kg, Brasa até ${c.brasa} kg, Labareda até ${c.labareda} kg de ${VTC_DISPLAY_NAME}`;
}

export const PURITY_PENALTY_EXPLANATION = `Ritmo da Fênix abaixo de ${PURITY_PENALTY_THRESHOLD} por cento, após os 20 dias de acolhimento. O mapa corporal fica com cores mais suaves.`;

/** Camadas do anel do avatar da Evolução (tons âmbar e ouro, sem lilás) */
export const EVOLUTION_TIER_RING_LEGEND = [
  { tier: 1 as PhaseTier, color: "#6b7280", label: "Cinzas. Uma camada cinza. Início da linhagem." },
  { tier: 2 as PhaseTier, color: "#fb923c", label: "Faísca. Segunda camada laranja clara." },
  { tier: 3 as PhaseTier, color: "#f97316", label: "Brasa. Terceira camada laranja." },
  { tier: 4 as PhaseTier, color: "#ef4444", label: "Labareda. Quarta camada vermelha." },
  { tier: 5 as PhaseTier, color: "#FFD700", label: "Fogo Cósmico. Quinta camada dourada." },
] as const;
