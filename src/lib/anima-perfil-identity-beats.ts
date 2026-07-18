import type { AnimaTourCalloutPlacement } from "@/components/dashboard/AnimaTourCallout";
import {
  ANYMA_ORB_PRESENCE_SPEECH,
  ANYMA_PERFIL_CONFIRMA_SPEECH,
  ANYMA_PERFIL_FOTO_SPEECH,
  ANYMA_PERFIL_GENERO_SPEECH,
  ANYMA_PERFIL_NOME_SPEECH,
  ANYMA_PERFIL_TAB_SPEECH,
} from "@/lib/anyma-copy";

export type PerfilIdentityAdvanceGate = "nome" | "genero" | "foto";

export type PerfilIdentityBeat = {
  id: string;
  speech: string;
  targetSelector: string;
  highlightSelectors: readonly string[];
  placement: AnimaTourCalloutPlacement;
  title: string;
  continueLabel: string;
  waitForTarget?: boolean;
  /** Exige nome ou gênero preenchido antes de avançar. */
  advanceGate?: PerfilIdentityAdvanceGate;
  /** Último passo — conclui o onboarding ao continuar. Sem botão de continue no card. */
  completesTour?: boolean;
  /** Oculta o botão Continuar e aponta só para o alvo iluminado. */
  hideContinueButton?: boolean;
};

export const PERFIL_TAB_SELECTOR = '[data-tour-tab="perfil"]';
export const PERFIL_IDENTIDADE_SELECTOR = '[data-tour-target="perfil-identidade"]';

export const PERFIL_TAB_BEAT: PerfilIdentityBeat = {
  id: "perfil-tab",
  speech: ANYMA_PERFIL_TAB_SPEECH,
  targetSelector: PERFIL_TAB_SELECTOR,
  highlightSelectors: [PERFIL_TAB_SELECTOR],
  placement: "top",
  title: "Aba Perfil",
  continueLabel: "Continuar para o nome",
  waitForTarget: true,
};

export const PERFIL_NOME_BEAT: PerfilIdentityBeat = {
  id: "perfil-nome",
  speech: ANYMA_PERFIL_NOME_SPEECH,
  targetSelector: '[data-tour-target="perfil-nome"]',
  highlightSelectors: ['[data-tour-target="perfil-nome"]'],
  placement: "auto",
  title: "Seu nome",
  continueLabel: "Continuar para o gênero",
  waitForTarget: true,
  advanceGate: "nome",
};

export const PERFIL_GENERO_BEAT: PerfilIdentityBeat = {
  id: "perfil-genero",
  speech: ANYMA_PERFIL_GENERO_SPEECH,
  targetSelector: '[data-tour-target="perfil-genero"]',
  highlightSelectors: ['[data-tour-target="perfil-genero"]'],
  placement: "auto",
  title: "Gênero na arena",
  continueLabel: "Continuar para a foto",
  waitForTarget: true,
  advanceGate: "genero",
};

export const PERFIL_FOTO_BEAT: PerfilIdentityBeat = {
  id: "perfil-foto",
  speech: ANYMA_PERFIL_FOTO_SPEECH,
  targetSelector: '[data-tour-target="perfil-foto"]',
  highlightSelectors: ['[data-tour-target="perfil-foto"]'],
  placement: "auto",
  title: "Inserir foto do dispositivo",
  continueLabel: "Continuar para selar",
  waitForTarget: true,
  advanceGate: "foto",
};

export const PERFIL_CONFIRMA_BEAT: PerfilIdentityBeat = {
  id: "perfil-confirmar",
  speech: ANYMA_PERFIL_CONFIRMA_SPEECH,
  targetSelector: '[data-tour-target="perfil-confirmar"]',
  highlightSelectors: ['[data-tour-target="perfil-confirmar"]'],
  placement: "auto",
  title: "Selar identidade",
  continueLabel: "Confirmar nome e gênero",
  waitForTarget: true,
  completesTour: true,
  /** Só aponta ao botão real do Perfil — sem CTA duplicado no card da ANYMA. */
  hideContinueButton: true,
};

/** Beats dos campos — guia pós-onboarding (identidade ainda pendente). */
export const PERFIL_IDENTITY_FIELD_BEATS: readonly PerfilIdentityBeat[] = [
  PERFIL_NOME_BEAT,
  PERFIL_GENERO_BEAT,
  PERFIL_FOTO_BEAT,
  PERFIL_CONFIRMA_BEAT,
] as const;

/** Sequência completa do onboarding spotlight (orb + perfil). Sem card/voz de identidade genérica. */
export const ONBOARDING_SPOTLIGHT_BEATS: readonly PerfilIdentityBeat[] = [
  {
    id: "orb",
    speech: ANYMA_ORB_PRESENCE_SPEECH,
    targetSelector: "[data-anima-phoenix-anchor]",
    highlightSelectors: ["[data-anima-phoenix-anchor]"],
    placement: "auto",
    title: "Onde eu permaneço",
    continueLabel: "Continuar para a aba Perfil",
  },
  PERFIL_TAB_BEAT,
  PERFIL_NOME_BEAT,
  PERFIL_GENERO_BEAT,
  {
    ...PERFIL_FOTO_BEAT,
    completesTour: true,
  },
] as const;

export function resolvePerfilIdentityBeat(index: number): PerfilIdentityBeat {
  return PERFIL_IDENTITY_FIELD_BEATS[Math.min(index, PERFIL_IDENTITY_FIELD_BEATS.length - 1)];
}

export function resolveSpotlightBeatIndex(beatId: string): number {
  return ONBOARDING_SPOTLIGHT_BEATS.findIndex((beat) => beat.id === beatId);
}

function queryVisibleTourTarget(selector: string): Element | null {
  const nodes = document.querySelectorAll(selector);
  for (const node of nodes) {
    if (isTourTargetVisible(node)) return node;
  }
  return nodes[0] ?? null;
}

function isTourTargetVisible(node: Element): boolean {
  if (!(node instanceof HTMLElement)) return false;

  const rect = node.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;

  const style = window.getComputedStyle(node);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }

  let parent = node.parentElement;
  while (parent) {
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.display === "none" || parentStyle.visibility === "hidden") {
      return false;
    }
    parent = parent.parentElement;
  }

  return true;
}

export function waitForTourTarget(
  selector: string,
  onReady: (target: Element | null) => void,
  options?: { initialDelayMs?: number; maxAttempts?: number; intervalMs?: number },
): () => void {
  const initialDelayMs = options?.initialDelayMs ?? 120;
  const maxAttempts = options?.maxAttempts ?? 50;
  const intervalMs = options?.intervalMs ?? 120;

  let attempts = 0;
  let cancelled = false;
  let timer: number | undefined;

  const tryResolve = () => {
    if (cancelled) return;

    const node = queryVisibleTourTarget(selector);
    if (node && isTourTargetVisible(node)) {
      // nearest evita centralizar alvos altos (isso empurrava o callout para cima do card).
      node.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      onReady(node);
      return;
    }

    attempts += 1;
    if (attempts >= maxAttempts) {
      onReady(node);
      return;
    }

    timer = window.setTimeout(tryResolve, intervalMs);
  };

  timer = window.setTimeout(tryResolve, initialDelayMs);

  return () => {
    cancelled = true;
    if (timer !== undefined) window.clearTimeout(timer);
  };
}

const SPOTLIGHT_PROGRESS_PREFIX = "anima-spotlight-beat:";

export function readSpotlightBeatProgress(userId: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`${SPOTLIGHT_PROGRESS_PREFIX}${userId}`);
    if (raw === null) return null;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return Math.min(parsed, ONBOARDING_SPOTLIGHT_BEATS.length - 1);
  } catch {
    return null;
  }
}

export function writeSpotlightBeatProgress(userId: string, beatIndex: number): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${SPOTLIGHT_PROGRESS_PREFIX}${userId}`, String(beatIndex));
  } catch {
    // quota / private mode
  }
}

export function resolveTourTargetElement(selector: string): Element | null {
  return queryVisibleTourTarget(selector);
}

export function clearSpotlightBeatProgress(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(`${SPOTLIGHT_PROGRESS_PREFIX}${userId}`);
  } catch {
    // quota / private mode
  }
}
