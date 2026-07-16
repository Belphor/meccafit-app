import type { DashboardTabId } from "@/lib/dashboard-tabs";
import { ANYMA_EYEBROW_PREFIX } from "@/lib/anyma-copy";
import {
  ANYMA_SPEECH_COMUNIDADE_ABA,
  ANYMA_SPEECH_COMUNIDADE_ARENA,
  ANYMA_SPEECH_COMUNIDADE_MURAL,
  ANYMA_SPEECH_COMUNIDADE_RANKINGS,
  ANYMA_SPEECH_COMUNIDADE_TITULOS,
  ANYMA_SPEECH_DIETA_PLANO,
  ANYMA_SPEECH_EVOLUCAO_ABA,
  ANYMA_SPEECH_EVOLUCAO_BRASAS,
  ANYMA_SPEECH_EVOLUCAO_CHAMA,
  ANYMA_SPEECH_EVOLUCAO_ESPELHO,
  ANYMA_SPEECH_EVOLUCAO_GRAVIDADE,
  ANYMA_SPEECH_EVOLUCAO_META,
  ANYMA_SPEECH_EVOLUCAO_RITMO,
  ANYMA_SPEECH_TREINO_ABA,
  ANYMA_SPEECH_TREINO_CALENDARIO,
  ANYMA_SPEECH_TREINO_CHAMA_ALTAR,
  ANYMA_SPEECH_TREINO_DIA,
  ANYMA_SPEECH_TREINO_VOO,
} from "@/lib/anyma-explanations";
import { resolveAnymaSpeechText } from "@/lib/anima-speech";
import type { PhaseTier } from "@/lib/dashboard-config";
import {
  ANYMA_DEBT_SOFT_GREETING,
  ANYMA_EXIT_COPY,
  ANYMA_FENIX_SPOTLIGHT_SPEECH,
  CODIGO_DO_RENASCIMENTO,
  PHOENIX_PUNISHMENT_LORE,
  PHOENIX_TIER_META,
} from "@/lib/phoenix-lore";

export const ECOSSISTEMA_TOUR_STORAGE_PREFIX = "meccafit:ecossistema-tour:v1:";
export const ECOSSISTEMA_TOUR_STEP_PREFIX = "meccafit:ecossistema-tour-step:v1:";
export const ECOSSISTEMA_TOUR_BEAT_PREFIX = "meccafit:ecossistema-tour-beat:v1:";
/** Só true após selar identidade na 1ª vez — autoriza o tour nesta sessão ou reload imediato. */
export const ECOSSISTEMA_TOUR_PENDING_PREFIX = "meccafit:ecossistema-tour-pending:v1:";
/**
 * Tour reduzido "só meta" — após "Pular apresentação" e selar identidade,
 * mostra apenas "Defina sua meta de treino" e conclui. Persiste até o fim.
 */
export const ECOSSISTEMA_TOUR_META_ONLY_PREFIX = "meccafit:ecossistema-tour-meta-only:v1:";

export type EcossistemaTourStepId = "treino" | "evolucao" | "comunidade" | "dieta";

export type EcossistemaTourBeat = {
  title: string;
  speech: string;
  continueLabel: string;
  targetSelector: string;
  highlightSelectors?: readonly string[];
  calloutPlacement: "left" | "right" | "top" | "bottom" | "auto";
  /** Exige meta de treino sincronizada no mês civil atual. */
  advanceGate?: "meta-sync";
};

export type EcossistemaTourStep = {
  id: EcossistemaTourStepId;
  tab: DashboardTabId;
  eyebrow: string;
  title: string;
  speech: string;
  continueLabel: string;
  targetSelector: string;
  navTargetSelector: string;
  calloutPlacement: "left" | "right" | "top" | "bottom" | "auto";
  /** Passos internos dentro da mesma aba — linha aponta cada altar guiado. */
  beats?: readonly EcossistemaTourBeat[];
  /** Só entra no tour quando o atleta tem vínculo VIP (Dieta). */
  requiresVip?: boolean;
};

const TREINO_TOUR_BEATS: readonly EcossistemaTourBeat[] = [
  {
    title: "Aba Treino",
    speech: ANYMA_SPEECH_TREINO_ABA,
    continueLabel: "Ver Voo de Cinzas",
    targetSelector: '[data-tour-tab="treino"]',
    highlightSelectors: ['[data-tour-tab="treino"]'],
    calloutPlacement: "bottom",
  },
  {
    title: "Voo de Cinzas",
    speech: ANYMA_SPEECH_TREINO_VOO,
    continueLabel: "Ver calendário",
    targetSelector: '[data-tour-target="treino-voo-cinzas"]',
    highlightSelectors: ['[data-tour-tab="treino"]'],
    calloutPlacement: "auto",
  },
  {
    title: "Calendário da planilha",
    speech: ANYMA_SPEECH_TREINO_CALENDARIO,
    continueLabel: "Ver Treino do Dia",
    targetSelector: '[data-tour-target="treino-calendario"]',
    highlightSelectors: ['[data-tour-tab="treino"]'],
    calloutPlacement: "auto",
  },
  {
    title: "Treino do Dia",
    speech: ANYMA_SPEECH_TREINO_DIA,
    continueLabel: "Ver Chama do Altar",
    targetSelector: '[data-tour-target="treino-dia"]',
    highlightSelectors: ['[data-tour-tab="treino"]'],
    calloutPlacement: "auto",
  },
  {
    title: "Chama do Altar",
    speech: ANYMA_SPEECH_TREINO_CHAMA_ALTAR,
    continueLabel: "Continuar para Evolução",
    targetSelector: '[data-tour-target="treino-chama-altar"]',
    highlightSelectors: ['[data-tour-tab="treino"]'],
    calloutPlacement: "auto",
  },
] as const;

const EVOLUCAO_TOUR_BEATS: readonly EcossistemaTourBeat[] = [
  {
    title: "Aba Evolução",
    speech: ANYMA_SPEECH_EVOLUCAO_ABA,
    continueLabel: "Definir meta de treino",
    targetSelector: '[data-tour-tab="evolucao"]',
    highlightSelectors: ['[data-tour-tab="evolucao"]'],
    calloutPlacement: "bottom",
  },
  {
    title: "Defina sua meta de treino",
    speech: ANYMA_SPEECH_EVOLUCAO_META,
    continueLabel: "Ver Ritmo da Fênix",
    targetSelector: '[data-tour-target="evolucao-meta"]',
    highlightSelectors: ['[data-tour-tab="evolucao"]'],
    calloutPlacement: "auto",
    advanceGate: "meta-sync",
  },
  {
    title: "Ritmo da Fênix",
    speech: ANYMA_SPEECH_EVOLUCAO_RITMO,
    continueLabel: "Ver Brasas Musculares",
    targetSelector: '[data-tour-target="evolucao-ritmo"]',
    highlightSelectors: ['[data-tour-tab="evolucao"]'],
    calloutPlacement: "auto",
  },
  {
    title: "Brasas Musculares",
    speech: ANYMA_SPEECH_EVOLUCAO_BRASAS,
    continueLabel: "Ver Chama Acumulada",
    targetSelector: '[data-tour-target="evolucao-brasas"]',
    highlightSelectors: ['[data-tour-tab="evolucao"]'],
    calloutPlacement: "auto",
  },
  {
    title: "Chama Acumulada",
    speech: ANYMA_SPEECH_EVOLUCAO_CHAMA,
    continueLabel: "Ver Gravidade Térmica",
    targetSelector: '[data-tour-target="evolucao-chama"]',
    highlightSelectors: ['[data-tour-target="evolucao-chama"]'],
    calloutPlacement: "top",
  },
  {
    title: "Gravidade Térmica",
    speech: ANYMA_SPEECH_EVOLUCAO_GRAVIDADE,
    continueLabel: "Ver Espelho do Ciclo",
    targetSelector: '[data-tour-target="evolucao-gravidade"]',
    highlightSelectors: ['[data-tour-tab="evolucao"]'],
    calloutPlacement: "auto",
  },
  {
    title: "Espelho do Ciclo",
    speech: ANYMA_SPEECH_EVOLUCAO_ESPELHO,
    continueLabel: "Continuar para Comunidade",
    targetSelector: '[data-tour-target="evolucao-espelho"]',
    highlightSelectors: ['[data-tour-tab="evolucao"]'],
    calloutPlacement: "auto",
  },
] as const;

const COMUNIDADE_TOUR_BEATS_BASE: readonly EcossistemaTourBeat[] = [
  {
    title: "Aba Comunidade",
    speech: ANYMA_SPEECH_COMUNIDADE_ABA,
    continueLabel: "Ver Arena e Termômetro",
    targetSelector: '[data-tour-tab="comunidade"]',
    highlightSelectors: ['[data-tour-tab="comunidade"]'],
    calloutPlacement: "bottom",
  },
  {
    title: "Arena e Termômetro",
    speech: ANYMA_SPEECH_COMUNIDADE_ARENA,
    continueLabel: "Ver Títulos",
    targetSelector: '[data-tour-target="comunidade-arena"]',
    highlightSelectors: ['[data-tour-tab="comunidade"]'],
    calloutPlacement: "auto",
  },
  {
    title: "Títulos e Reis",
    speech: ANYMA_SPEECH_COMUNIDADE_TITULOS,
    continueLabel: "Ver rankings",
    targetSelector: '[data-tour-target="comunidade-titulos"]',
    highlightSelectors: ['[data-tour-tab="comunidade"]'],
    calloutPlacement: "auto",
  },
  {
    title: "rankings",
    speech: ANYMA_SPEECH_COMUNIDADE_RANKINGS,
    continueLabel: "Ver Mural",
    targetSelector: '[data-tour-target="comunidade-rankings"]',
    highlightSelectors: ['[data-tour-tab="comunidade"]'],
    calloutPlacement: "auto",
  },
  {
    title: "Mural de Ascensões",
    speech: ANYMA_SPEECH_COMUNIDADE_MURAL,
    continueLabel: "Entrar no Portal de Brasa",
    targetSelector: '[data-tour-target="comunidade-mural"]',
    highlightSelectors: ['[data-tour-tab="comunidade"]'],
    calloutPlacement: "auto",
  },
] as const;

const DIETA_TOUR_BEATS: readonly EcossistemaTourBeat[] = [
  {
    title: "Aba Dieta",
    speech: ANYMA_SPEECH_DIETA_PLANO,
    continueLabel: "Entrar no Portal de Brasa",
    targetSelector: '[data-tour-tab="dieta"]',
    highlightSelectors: ['[data-tour-tab="dieta"]'],
    calloutPlacement: "bottom",
  },
] as const;

/** Ordem canônica após selar identidade: Treino → Evolução → Comunidade → Dieta (VIP). */
export const ECOSSISTEMA_TOUR_STEPS: readonly EcossistemaTourStep[] = [
  {
    id: "treino",
    tab: "treino",
    eyebrow: `${ANYMA_EYEBROW_PREFIX}Treino`,
    title: "O altar onde a chama nasce",
    speech: TREINO_TOUR_BEATS[TREINO_TOUR_BEATS.length - 1].speech,
    continueLabel: "Continuar para Evolução",
    targetSelector: TREINO_TOUR_BEATS[0].targetSelector,
    navTargetSelector: '[data-tour-tab="treino"]',
    calloutPlacement: "auto",
    beats: TREINO_TOUR_BEATS,
  },
  {
    id: "evolucao",
    tab: "evolucao",
    eyebrow: `${ANYMA_EYEBROW_PREFIX}Evolução`,
    title: "Leitura da chama acumulada",
    speech: EVOLUCAO_TOUR_BEATS[EVOLUCAO_TOUR_BEATS.length - 1].speech,
    continueLabel: "Continuar para Comunidade",
    targetSelector: EVOLUCAO_TOUR_BEATS[0].targetSelector,
    navTargetSelector: '[data-tour-tab="evolucao"]',
    calloutPlacement: "auto",
    beats: EVOLUCAO_TOUR_BEATS,
  },
  {
    id: "comunidade",
    tab: "comunidade",
    eyebrow: `${ANYMA_EYEBROW_PREFIX}Comunidade`,
    title: "Arena, duelos e rankings",
    speech: COMUNIDADE_TOUR_BEATS_BASE[COMUNIDADE_TOUR_BEATS_BASE.length - 1].speech,
    continueLabel: "Entrar no Portal de Brasa",
    targetSelector: COMUNIDADE_TOUR_BEATS_BASE[0].targetSelector,
    navTargetSelector: '[data-tour-tab="comunidade"]',
    calloutPlacement: "auto",
    beats: COMUNIDADE_TOUR_BEATS_BASE,
  },
  {
    id: "dieta",
    tab: "dieta",
    eyebrow: `${ANYMA_EYEBROW_PREFIX}Dieta`,
    title: "Plano alimentar da linhagem",
    speech: ANYMA_SPEECH_DIETA_PLANO,
    continueLabel: "Entrar no Portal de Brasa",
    targetSelector: DIETA_TOUR_BEATS[0].targetSelector,
    navTargetSelector: '[data-tour-tab="dieta"]',
    calloutPlacement: "auto",
    beats: DIETA_TOUR_BEATS,
    requiresVip: true,
  },
] as const;

/** Resolve os passos do tour conforme vínculo VIP (Dieta). */
export function resolveEcossistemaTourSteps(hasPersonalBond: boolean): EcossistemaTourStep[] {
  const steps = ECOSSISTEMA_TOUR_STEPS.filter((step) => !step.requiresVip || hasPersonalBond);

  return steps.map((step) => {
    if (step.id !== "comunidade" || !step.beats?.length) return step;

    const beats = step.beats.map((beat, index) => {
      if (index < step.beats!.length - 1) return beat;
      return {
        ...beat,
        continueLabel: hasPersonalBond
          ? "Continuar para Dieta"
          : "Entrar no Portal de Brasa",
      };
    });

    return {
      ...step,
      beats,
      continueLabel: hasPersonalBond
        ? "Continuar para Dieta"
        : "Entrar no Portal de Brasa",
    };
  });
}

/**
 * Tour reduzido de "Pular apresentação": só o beat "Defina sua meta de treino"
 * na aba Evolução. Ao concluir, o ecossistema é liberado sem o tour completo.
 */
export function resolveMetaOnlyTourSteps(): EcossistemaTourStep[] {
  const evolucaoStep = ECOSSISTEMA_TOUR_STEPS.find((step) => step.id === "evolucao");
  const metaBeat = evolucaoStep?.beats?.find((beat) => beat.advanceGate === "meta-sync");

  if (!evolucaoStep || !metaBeat) return [];

  const beat: EcossistemaTourBeat = { ...metaBeat, continueLabel: "Concluir" };

  return [
    {
      ...evolucaoStep,
      title: beat.title,
      speech: beat.speech,
      continueLabel: beat.continueLabel,
      targetSelector: beat.targetSelector,
      beats: [beat],
    },
  ];
}

/** Aguarda a aba destino renderizar antes da narrativa da ANYMA. */
export const ECOSSISTEMA_TOUR_NAV_DELAY_MS = 420;

export type FenixNarrativeCatalogEntry = {
  id: string;
  label: string;
  speech: string;
  tier?: PhaseTier;
  group: "fase" | "ritual" | "tour" | "alerta" | "onboarding";
};

export const FENIX_NARRATIVE_CATALOG: readonly FenixNarrativeCatalogEntry[] = [
  ...([1, 2, 3, 4, 5] as const).map((tier) => ({
    id: `fase-${tier}`,
    label: `${PHOENIX_TIER_META[tier].name} · ${PHOENIX_TIER_META[tier].epithet}`,
    speech: CODIGO_DO_RENASCIMENTO[tier],
    tier,
    group: "fase" as const,
  })),
  {
    id: "onboarding-spotlight",
    label: "Apresentação da ANYMA",
    speech: ANYMA_FENIX_SPOTLIGHT_SPEECH,
    group: "onboarding",
  },
  {
    id: "ritual-exilio",
    label: "Exílio das Chamas",
    speech: PHOENIX_PUNISHMENT_LORE,
    group: "ritual",
  },
  {
    id: "ritual-saida",
    label: "Ritual de encerramento",
    speech: ANYMA_EXIT_COPY,
    group: "ritual",
  },
  {
    id: "alerta-negligencia",
    label: "Alerta de negligência",
    speech: ANYMA_DEBT_SOFT_GREETING,
    group: "alerta",
  },
  ...ECOSSISTEMA_TOUR_STEPS.flatMap((step) => {
    const beats = resolveTourBeats(step);
    return beats.map((beat, index) => ({
      id: `tour-${step.id}${beats.length > 1 ? `-${index + 1}` : ""}`,
      label: `Tour · ${beat.title}`,
      speech: beat.speech,
      group: "tour" as const,
    }));
  }),
];

export function resolveTourBeats(step: EcossistemaTourStep): readonly EcossistemaTourBeat[] {
  if (step.beats?.length) return step.beats;
  return [
    {
      title: step.title,
      speech: step.speech,
      continueLabel: step.continueLabel,
      targetSelector: step.targetSelector,
      highlightSelectors: [step.navTargetSelector],
      calloutPlacement: step.calloutPlacement,
    },
  ];
}

export function readEcossistemaTourComplete(userId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(`${ECOSSISTEMA_TOUR_STORAGE_PREFIX}${userId}`) === "done";
  } catch {
    return true;
  }
}

export function writeEcossistemaTourComplete(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${ECOSSISTEMA_TOUR_STORAGE_PREFIX}${userId}`, "done");
    window.localStorage.removeItem(`${ECOSSISTEMA_TOUR_STEP_PREFIX}${userId}`);
    window.localStorage.removeItem(`${ECOSSISTEMA_TOUR_BEAT_PREFIX}${userId}`);
    window.localStorage.removeItem(`${ECOSSISTEMA_TOUR_PENDING_PREFIX}${userId}`);
    window.localStorage.removeItem(`${ECOSSISTEMA_TOUR_META_ONLY_PREFIX}${userId}`);
  } catch {
    // quota / private mode
  }
}

/** Ativa o tour reduzido "só meta" — Evolução → Defina sua meta → concluir. */
export function markEcossistemaTourMetaOnly(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${ECOSSISTEMA_TOUR_META_ONLY_PREFIX}${userId}`, "1");
  } catch {
    // quota / private mode
  }
}

export function readEcossistemaTourMetaOnly(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.localStorage.getItem(`${ECOSSISTEMA_TOUR_META_ONLY_PREFIX}${userId}`) === "1"
    );
  } catch {
    return false;
  }
}

export function clearEcossistemaTourMetaOnly(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${ECOSSISTEMA_TOUR_META_ONLY_PREFIX}${userId}`);
  } catch {
    // quota / private mode
  }
}

export function markEcossistemaTourPending(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${ECOSSISTEMA_TOUR_PENDING_PREFIX}${userId}`, "1");
  } catch {
    // quota / private mode
  }
}

export function readEcossistemaTourPending(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(`${ECOSSISTEMA_TOUR_PENDING_PREFIX}${userId}`) === "1";
  } catch {
    return false;
  }
}

export function clearEcossistemaTourPending(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${ECOSSISTEMA_TOUR_PENDING_PREFIX}${userId}`);
  } catch {
    // quota / private mode
  }
}

/** Conta já passou do fluxo de 1ª visita — tour não deve mais rodar. */
export function skipEcossistemaTourForReturningAccount(userId: string): void {
  writeEcossistemaTourComplete(userId);
  clearEcossistemaTourPending(userId);
}

/** Remove todo progresso local do tour — 1º login / reteste. */
export function clearEcossistemaTourLocalState(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${ECOSSISTEMA_TOUR_STORAGE_PREFIX}${userId}`);
    window.localStorage.removeItem(`${ECOSSISTEMA_TOUR_STEP_PREFIX}${userId}`);
    window.localStorage.removeItem(`${ECOSSISTEMA_TOUR_BEAT_PREFIX}${userId}`);
    window.localStorage.removeItem(`${ECOSSISTEMA_TOUR_PENDING_PREFIX}${userId}`);
    window.localStorage.removeItem(`${ECOSSISTEMA_TOUR_META_ONLY_PREFIX}${userId}`);
  } catch {
    // quota / private mode
  }
}

export function readEcossistemaTourStepIndex(
  userId: string,
  stepCount = ECOSSISTEMA_TOUR_STEPS.length,
): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${ECOSSISTEMA_TOUR_STEP_PREFIX}${userId}`);
    if (raw === null) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed >= stepCount) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeEcossistemaTourStepIndex(userId: string, stepIndex: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${ECOSSISTEMA_TOUR_STEP_PREFIX}${userId}`, String(stepIndex));
  } catch {
    // quota / private mode
  }
}

export function readEcossistemaTourBeatIndex(userId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(`${ECOSSISTEMA_TOUR_BEAT_PREFIX}${userId}`);
    if (raw === null) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
  } catch {
    return 0;
  }
}

export function writeEcossistemaTourBeatIndex(userId: string, beatIndex: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${ECOSSISTEMA_TOUR_BEAT_PREFIX}${userId}`, String(beatIndex));
  } catch {
    // quota / private mode
  }
}

export function resolveEcossistemaTourSpeech(speech: string, profileName: string): string {
  return resolveAnymaSpeechText(speech, profileName);
}

export function resolveAllowedTourTabs(
  stepIndex: number,
  hasPersonalBond = false,
  stepsOverride?: readonly EcossistemaTourStep[],
): DashboardTabId[] {
  const steps = stepsOverride ?? resolveEcossistemaTourSteps(hasPersonalBond);
  const allowed: DashboardTabId[] = [];
  for (let index = 0; index <= stepIndex && index < steps.length; index += 1) {
    const tab = steps[index]?.tab;
    if (tab && !allowed.includes(tab)) allowed.push(tab);
  }
  return allowed;
}

export function isTabEnabledDuringTour(
  tab: DashboardTabId,
  stepIndex: number,
  hasPersonalBond = false,
  stepsOverride?: readonly EcossistemaTourStep[],
): boolean {
  return resolveAllowedTourTabs(stepIndex, hasPersonalBond, stepsOverride).includes(tab);
}

export function resolveDisabledTabsDuringTour(
  stepIndex: number,
  hasPersonalBond: boolean,
  stepsOverride?: readonly EcossistemaTourStep[],
): ReadonlySet<DashboardTabId> {
  const disabled = new Set<DashboardTabId>();
  const allowed = new Set(resolveAllowedTourTabs(stepIndex, hasPersonalBond, stepsOverride));

  const allTabs: DashboardTabId[] = ["treino", "evolucao", "comunidade", "perfil"];
  if (hasPersonalBond) allTabs.push("dieta");

  for (const tab of allTabs) {
    if (!allowed.has(tab)) disabled.add(tab);
  }

  return disabled;
}
