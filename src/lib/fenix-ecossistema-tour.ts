import type { DashboardTabId } from "@/lib/dashboard-tabs";
import type { PhaseTier } from "@/lib/dashboard-config";
import {
  ANIMA_DEBT_SOFT_GREETING,
  ANIMA_EXIT_COPY,
  CODIGO_DO_RENASCIMENTO,
  PHOENIX_PUNISHMENT_LORE,
  PHOENIX_TIER_META,
} from "@/lib/phoenix-lore";

export const ECOSSISTEMA_TOUR_STORAGE_PREFIX = "meccafit:ecossistema-tour:v1:";
export const ECOSSISTEMA_TOUR_STEP_PREFIX = "meccafit:ecossistema-tour-step:v1:";

export type EcossistemaTourStepId = "perfil" | "treino" | "evolucao" | "comunidade";

export type EcossistemaTourStep = {
  id: EcossistemaTourStepId;
  tab: DashboardTabId;
  eyebrow: string;
  title: string;
  speech: string;
  continueLabel: string;
};

/** Ordem canônica: Perfil (após identidade) → Treino → Evolução (Cinzas) → Comunidade. */
export const ECOSSISTEMA_TOUR_STEPS: readonly EcossistemaTourStep[] = [
  {
    id: "perfil",
    tab: "perfil",
    eyebrow: "Anima Fênix · Perfil",
    title: "Identidade da linhagem",
    speech:
      "[Nome], você selou nome e gênero na linhagem. O anel reflete sua Chama Acumulada e define sua arena na comunidade.",
    continueLabel: "Continuar para o Treino",
  },
  {
    id: "treino",
    tab: "treino",
    eyebrow: "Anima Fênix · Treino",
    title: "O altar onde a chama nasce",
    speech:
      "[Nome], no Treino cada série alimenta o altar. Registre pesos com verdade: o VTC de hoje acende a Chama do Altar, alimenta ascensões no mural e move todo o ecossistema FENYXIA.",
    continueLabel: "Continuar para Evolução",
  },
  {
    id: "evolucao",
    tab: "evolucao",
    eyebrow: "Anima Fênix · Evolução",
    title: "Cinzas · O Mármore Frio",
    speech: CODIGO_DO_RENASCIMENTO[1],
    continueLabel: "Continuar para Comunidade",
  },
  {
    id: "comunidade",
    tab: "comunidade",
    eyebrow: "Anima Fênix · Comunidade",
    title: "Arena, duelos e rankings",
    speech:
      "[Nome], na Comunidade duelos, rankings e o Mural celebram quem forja de verdade. Sua arena, masculina ou feminina, mostra quem lidera o mês. O termômetro coletivo une a linhagem em torno de uma meta comum.",
    continueLabel: "Entrar no Portal de Brasa",
  },
] as const;

/** Aguarda a aba destino renderizar antes da narrativa da Anima. */
export const ECOSSISTEMA_TOUR_NAV_DELAY_MS = 520;

export type FenixNarrativeCatalogEntry = {
  id: string;
  label: string;
  speech: string;
  tier?: PhaseTier;
  group: "fase" | "ritual" | "tour" | "alerta";
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
  ...ECOSSISTEMA_TOUR_STEPS.map((step) => ({
    id: `tour-${step.id}`,
    label: `Tour · ${step.title}`,
    speech: step.speech,
    group: "tour" as const,
  })),
];

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
  } catch {
    // quota / private mode
  }
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
