import type { ComunidadeMuralFocusDetail } from "@/lib/dashboard-tab-navigation";

export const COMUNIDADE_MURAL_SECTION_ID = "comunidade-mural";
export const COMUNIDADE_MURAL_PANEL_SELECTOR = "[data-comunidade-mural-panel]";

const FOCUS_MAX_ATTEMPTS = 30;
const FOCUS_RETRY_MS = 100;
const FOCUS_REFINE_MS = 400;
const FOCUS_HIGHLIGHT_MS = 2800;
const FOCUS_SCROLL_PADDING_PX = 20;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function resolveMuralScrollOffset(): number {
  if (typeof window === "undefined") return 96;

  const stickyNav = document.querySelector<HTMLElement>("[data-dashboard-tab-nav]");
  const stickyTop = stickyNav
    ? Number.parseFloat(getComputedStyle(stickyNav).top || "0") || 0
    : 8;
  const navHeight = stickyNav?.offsetHeight ?? 52;

  return Math.max(96, stickyTop + navHeight + FOCUS_SCROLL_PADDING_PX);
}

function resolveMuralTargets(): {
  section: HTMLElement | null;
  anchor: HTMLElement | null;
  panel: HTMLElement | null;
} {
  const section = document.getElementById(COMUNIDADE_MURAL_SECTION_ID);
  const anchor =
    document.getElementById("comunidade-mural-title") ??
    section?.querySelector<HTMLElement>("h3") ??
    section;
  const panel = section?.querySelector<HTMLElement>(COMUNIDADE_MURAL_PANEL_SELECTOR) ?? section;

  return { section, anchor, panel };
}

function scrollMuralIntoView(anchor: HTMLElement, behavior: ScrollBehavior): void {
  const offset = resolveMuralScrollOffset();
  const top = anchor.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior });
}

function syncMuralLocationHash(): void {
  if (typeof window === "undefined") return;

  const nextHash = `#${COMUNIDADE_MURAL_SECTION_ID}`;
  if (window.location.hash === nextHash) return;

  const url = `${window.location.pathname}${window.location.search}${nextHash}`;
  window.history.replaceState(window.history.state, "", url);
}

function pulseMuralPanel(panel: HTMLElement | null, section: HTMLElement | null): () => void {
  const target = panel ?? section;
  if (!target) return () => undefined;

  target.classList.add("comunidade-mural-focus-pulse");
  target.setAttribute("data-mural-focused", "true");

  const timer = window.setTimeout(() => {
    target.classList.remove("comunidade-mural-focus-pulse");
    target.removeAttribute("data-mural-focused");
  }, FOCUS_HIGHLIGHT_MS);

  return () => {
    window.clearTimeout(timer);
    target.classList.remove("comunidade-mural-focus-pulse");
    target.removeAttribute("data-mural-focused");
  };
}

export type FocusComunidadeMuralOptions = ComunidadeMuralFocusDetail & {
  behavior?: ScrollBehavior;
};

/** Scroll preciso até o mural, com retry enquanto a aba Comunidade monta. */
export function focusComunidadeMural(options: FocusComunidadeMuralOptions = {}): () => void {
  if (typeof window === "undefined") return () => undefined;

  let cancelled = false;
  let attempts = 0;
  let refineTimer: number | undefined;
  let cleanupHighlight: (() => void) | undefined;

  const behavior = options.behavior ?? (prefersReducedMotion() ? "auto" : "smooth");

  const finishFocus = (section: HTMLElement, anchor: HTMLElement, panel: HTMLElement | null) => {
    syncMuralLocationHash();
    scrollMuralIntoView(anchor, behavior);

    if (options.exerciseName) {
      section.setAttribute("aria-label", `Mural · ascensão em ${options.exerciseName}`);
    }

    cleanupHighlight?.();
    cleanupHighlight = pulseMuralPanel(panel, section);

    refineTimer = window.setTimeout(() => {
      if (cancelled) return;
      scrollMuralIntoView(anchor, prefersReducedMotion() ? "auto" : "smooth");
    }, FOCUS_REFINE_MS);
  };

  const attempt = () => {
    if (cancelled) return;

    const { section, anchor, panel } = resolveMuralTargets();
    if (!section || !anchor) {
      attempts += 1;
      if (attempts < FOCUS_MAX_ATTEMPTS) {
        window.setTimeout(attempt, FOCUS_RETRY_MS);
      }
      return;
    }

    finishFocus(section, anchor, panel);
  };

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(attempt);
  });

  return () => {
    cancelled = true;
    if (refineTimer) window.clearTimeout(refineTimer);
    cleanupHighlight?.();
  };
}
