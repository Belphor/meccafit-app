import type { DashboardTabId } from "@/lib/dashboard-tabs";
import { ANYMA_EYEBROW_PREFIX, ANYMA_VTC_PHRASE } from "@/lib/anyma-copy";
import { formatAnimaSpeech } from "@/lib/anima-speech";
import { injectRegisteredName } from "@/lib/profile-display-name";
import type { PhaseTier } from "@/lib/dashboard-config";
import {
  ANIMA_DEBT_SOFT_GREETING,
  ANIMA_EXIT_COPY,
  ANIMA_FENIX_SPOTLIGHT_SPEECH,
  CODIGO_DO_RENASCIMENTO,
  PHOENIX_PUNISHMENT_LORE,
  PHOENIX_TIER_META,
} from "@/lib/phoenix-lore";

export const ECOSSISTEMA_TOUR_STORAGE_PREFIX = "meccafit:ecossistema-tour:v1:";
export const ECOSSISTEMA_TOUR_STEP_PREFIX = "meccafit:ecossistema-tour-step:v1:";
export const ECOSSISTEMA_TOUR_BEAT_PREFIX = "meccafit:ecossistema-tour-beat:v1:";
/** Só true após selar identidade na 1ª vez — autoriza o tour nesta sessão ou reload imediato. */
export const ECOSSISTEMA_TOUR_PENDING_PREFIX = "meccafit:ecossistema-tour-pending:v1:";

export type EcossistemaTourStepId = "treino" | "evolucao" | "comunidade";

export type EcossistemaTourBeat = {
  title: string;
  speech: string;
  continueLabel: string;
  targetSelector: string;
  highlightSelectors?: readonly string[];
  calloutPlacement: "left" | "right" | "top" | "bottom" | "auto";
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
};

const TREINO_TOUR_BEATS: readonly EcossistemaTourBeat[] = [
  {
    title: "Voo de Cinzas",
    speech:
      "[Nome], o Voo de Cinzas aquece o altar energético. O cardio consciente do dia soma minutos validados e sincroniza sua chama antes do ferro.",
    continueLabel: "Ver calendário",
    targetSelector: '[data-tour-target="treino-voo-cinzas"]',
    highlightSelectors: ['[data-tour-tab="treino"]'],
    calloutPlacement: "bottom",
  },
  {
    title: "Calendário da planilha",
    speech:
      "[Nome], o calendário de segunda a sábado mostra sua planilha semanal. Escolha o dia para ver qual grupo muscular será forjado naquela sessão.",
    continueLabel: "Ver Treino do Dia",
    targetSelector: '[data-tour-target="treino-calendario"]',
    highlightSelectors: ['[data-tour-tab="treino"]'],
    calloutPlacement: "top",
  },
  {
    title: "Treino do Dia",
    speech:
      `[Nome], aqui vive o Treino do Dia. Cada série alimenta a Chama do Altar com ${ANYMA_VTC_PHRASE}. Registre o pico de cada exercício com verdade. Cada registro acende ascensões no mural e move toda a linhagem FENYXIA.`,
    continueLabel: "Continuar para Evolução",
    targetSelector: '[data-tour-target="treino-dia"]',
    highlightSelectors: ['[data-tour-target="treino-altar"]', '[data-tour-tab="treino"]'],
    calloutPlacement: "right",
  },
] as const;

/** Ordem canônica após selar identidade: Treino → Evolução → Comunidade. */
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
    calloutPlacement: "bottom",
    beats: TREINO_TOUR_BEATS,
  },
  {
    id: "evolucao",
    tab: "evolucao",
    eyebrow: `${ANYMA_EYEBROW_PREFIX}Evolução`,
    title: "Leitura da chama acumulada",
    speech:
      "[Nome], em Evolução você lê a Chama Acumulada, o Ritmo da Fênix, as Brasas Musculares e a Gravidade Térmica. Cada métrica revela se sua linhagem avança, mantém o fogo ou esfria, sem repetir o juramento das Cinzas.",
    continueLabel: "Continuar para Comunidade",
    targetSelector: '[data-tour-target="evolucao-chama"]',
    navTargetSelector: '[data-tour-tab="evolucao"]',
    calloutPlacement: "top",
  },
  {
    id: "comunidade",
    tab: "comunidade",
    eyebrow: `${ANYMA_EYEBROW_PREFIX}Comunidade`,
    title: "Arena, duelos e rankings",
    speech:
      "[Nome], na Comunidade, duelos, rankings e o Mural celebram quem forja de verdade. Sua arena, masculina ou feminina, mostra quem lidera o mês. O termômetro coletivo une a linhagem em torno de uma meta comum.",
    continueLabel: "Entrar no Portal de Brasa",
    targetSelector: '[data-tour-target="comunidade-arena"]',
    navTargetSelector: '[data-tour-tab="comunidade"]',
    calloutPlacement: "bottom",
  },
] as const;

/** Aguarda a aba destino renderizar antes da narrativa da ANYMA. */
export const ECOSSISTEMA_TOUR_NAV_DELAY_MS = 720;

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
    speech: ANIMA_FENIX_SPOTLIGHT_SPEECH,
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
    speech: ANIMA_EXIT_COPY,
    group: "ritual",
  },
  {
    id: "alerta-negligencia",
    label: "Alerta de negligência",
    speech: ANIMA_DEBT_SOFT_GREETING,
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

export function readEcossistemaTourStepIndex(userId: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${ECOSSISTEMA_TOUR_STEP_PREFIX}${userId}`);
    if (raw === null) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed >= ECOSSISTEMA_TOUR_STEPS.length) {
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
  return formatAnimaSpeech(injectRegisteredName(speech, profileName));
}

export function resolveAllowedTourTabs(stepIndex: number): DashboardTabId[] {
  const allowed: DashboardTabId[] = [];
  for (let index = 0; index <= stepIndex && index < ECOSSISTEMA_TOUR_STEPS.length; index += 1) {
    const tab = ECOSSISTEMA_TOUR_STEPS[index]?.tab;
    if (tab && !allowed.includes(tab)) allowed.push(tab);
  }
  return allowed;
}

export function isTabEnabledDuringTour(tab: DashboardTabId, stepIndex: number): boolean {
  return resolveAllowedTourTabs(stepIndex).includes(tab);
}

export function resolveDisabledTabsDuringTour(
  stepIndex: number,
  hasPersonalBond: boolean,
): ReadonlySet<DashboardTabId> {
  const disabled = new Set<DashboardTabId>();
  const allowed = new Set(resolveAllowedTourTabs(stepIndex));

  const allTabs: DashboardTabId[] = ["treino", "evolucao", "comunidade", "perfil"];
  if (hasPersonalBond) allTabs.push("dieta");

  for (const tab of allTabs) {
    if (!allowed.has(tab)) disabled.add(tab);
  }

  return disabled;
}
