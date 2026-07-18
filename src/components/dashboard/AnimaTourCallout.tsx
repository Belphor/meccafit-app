"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { resolveTourTargetElement } from "@/lib/anima-perfil-identity-beats";

const CALLOUT_GAP = 14;
const HIGHLIGHT_PAD = 10;
const VIEWPORT_MARGIN = 14;
const TARGET_EDGE_INSET = 10;
/** Alvos altos — limita só o buraco visual do spotlight; colisão usa o card inteiro. */
const TALL_TARGET_VH = 0.42;
const TALL_HOLE_VH = 0.38;
const EMPTY_HIGHLIGHTS: readonly string[] = [];
/** Scroll mínimo considerado significativo. */
const SCROLL_EPSILON = 6;

function isTallTargetRect(rect: DOMRect, vh: number): boolean {
  return rect.height > vh * TALL_TARGET_VH;
}

function prefersFullSpotlight(element: Element): boolean {
  return element instanceof HTMLElement && element.dataset.tourSpotlight === "full";
}

/**
 * Recorta o retângulo do alvo alto só para o buraco visual do spotlight.
 * `data-tour-spotlight="full"` força o card inteiro (ex.: meta de treino + slider).
 */
function resolveSpotlightTargetRect(rect: DOMRect, vh: number, element: Element): DOMRect {
  if (prefersFullSpotlight(element)) return rect;
  if (!isTallTargetRect(rect, vh)) return rect;
  const maxHeight = Math.max(140, vh * TALL_HOLE_VH);
  if (rect.height <= maxHeight) return rect;
  return new DOMRect(rect.left, rect.top, rect.width, maxHeight);
}

function resolveViewportBottomMargin(vh: number, vw: number): number {
  if (vw >= 640) return VIEWPORT_MARGIN;
  const navReserve = Math.min(vh * 0.28, 120);
  return Math.max(VIEWPORT_MARGIN + navReserve, 108);
}

function resolveViewportTopMargin(vw: number): number {
  if (vw >= 640) return VIEWPORT_MARGIN;
  return Math.max(VIEWPORT_MARGIN, 56);
}

export type AnimaTourCalloutPlacement = "left" | "right" | "top" | "bottom" | "auto";
export type AnymaTourCalloutPlacement = AnimaTourCalloutPlacement;

type Rect = { top: number; left: number; width: number; height: number };
type HighlightHole = Rect & { borderRadius: string };

type PointerGeometry = {
  holes: HighlightHole[];
  calloutLeft: number;
  calloutTop: number;
  lineStart: { x: number; y: number };
  lineEnd: { x: number; y: number };
  placement: Exclude<AnimaTourCalloutPlacement, "auto">;
  scrollDelta: number;
};

type ResolvedPlacement = Exclude<AnimaTourCalloutPlacement, "auto">;

function domRectToRect(rect: DOMRect, pad = 0): Rect {
  return {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

function resolveHoleBorderRadius(element: Element): string {
  if (!(element instanceof HTMLElement)) return "16px";
  const radius = window.getComputedStyle(element).borderRadius?.trim();
  return radius && radius !== "0px" ? radius : "16px";
}

function parseBorderRadius(borderRadius: string, height: number): number {
  const first = borderRadius.split(/\s+/)[0] ?? "16px";
  if (first.endsWith("%")) {
    const pct = parseFloat(first);
    return Number.isFinite(pct) ? (height * pct) / 200 : 16;
  }
  const px = parseFloat(first);
  if (!Number.isFinite(px)) return 16;
  return Math.min(px, height / 2);
}

function domRectToHole(rect: DOMRect, element: Element, pad = 0): HighlightHole {
  return {
    ...domRectToRect(rect, pad),
    borderRadius: resolveHoleBorderRadius(element),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function overlapsTarget(
  calloutLeft: number,
  calloutTop: number,
  calloutW: number,
  calloutH: number,
  target: DOMRect,
  gap = CALLOUT_GAP,
): boolean {
  return (
    calloutLeft < target.right + gap &&
    calloutLeft + calloutW > target.left - gap &&
    calloutTop < target.bottom + gap &&
    calloutTop + calloutH > target.top - gap
  );
}

function clampHorizontal(left: number, calloutW: number, vw: number): number {
  return clamp(left, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, vw - calloutW - VIEWPORT_MARGIN));
}

/**
 * Posiciona o callout colado ao card real (acima ou abaixo).
 * Colisão sempre usa o retângulo completo — nunca o buraco truncado.
 * Se não cabe no viewport atual, pede scroll e mantém a posição colada
 * (mesmo que fique parcialmente fora) até o scroll abrir espaço.
 */
function resolveAdjacentPlacement(
  fullTarget: DOMRect,
  calloutW: number,
  calloutH: number,
  preferred: AnimaTourCalloutPlacement,
  vw: number,
  vh: number,
  topMargin: number,
  bottomMargin: number,
): {
  placement: "top" | "bottom";
  calloutLeft: number;
  calloutTop: number;
  scrollDelta: number;
} {
  const needed = calloutH + CALLOUT_GAP;
  const spaceAbove = fullTarget.top - topMargin;
  const spaceBelow = vh - bottomMargin - fullTarget.bottom;
  const usableH = vh - topMargin - bottomMargin;

  const navChip =
    fullTarget.height < 96 &&
    fullTarget.top > vh * 0.55 &&
    fullTarget.bottom > vh - bottomMargin - 24;

  let side: "top" | "bottom";
  if (navChip) {
    side = "top";
  } else if (preferred === "top") {
    side = spaceAbove >= needed || spaceAbove >= spaceBelow ? "top" : "bottom";
  } else if (preferred === "bottom") {
    side = spaceBelow >= needed || spaceBelow >= spaceAbove ? "bottom" : "top";
  } else if (spaceBelow >= needed && spaceAbove >= needed) {
    side = spaceBelow >= spaceAbove ? "bottom" : "top";
  } else if (spaceBelow >= needed) {
    side = "bottom";
  } else if (spaceAbove >= needed) {
    side = "top";
  } else if (fullTarget.height >= usableH * 0.7) {
    // Card muito alto: callout acima do topo do card + scroll para abrir faixa.
    side = "top";
  } else {
    side = spaceBelow >= spaceAbove ? "bottom" : "top";
  }

  const centerLeft = clampHorizontal(
    fullTarget.left + fullTarget.width / 2 - calloutW / 2,
    calloutW,
    vw,
  );

  const idealTop = (placement: "top" | "bottom") =>
    placement === "top"
      ? fullTarget.top - CALLOUT_GAP - calloutH
      : fullTarget.bottom + CALLOUT_GAP;

  let calloutTop = idealTop(side);
  let scrollDelta = 0;

  if (side === "top") {
    // Precisa que o topo do card fique abaixo da faixa do callout.
    const minTargetTop = topMargin + needed;
    if (fullTarget.top < minTargetTop) {
      scrollDelta = fullTarget.top - minTargetTop;
    } else if (fullTarget.top > vh - bottomMargin - 80) {
      // Card quase fora abaixo — sobe um pouco para manter contexto.
      scrollDelta = fullTarget.top - (vh - bottomMargin - Math.min(fullTarget.height, usableH * 0.55));
    }
  } else {
    // Precisa de espaço abaixo do card até a margem inferior.
    const maxTargetBottom = vh - bottomMargin - needed;
    if (fullTarget.bottom > maxTargetBottom) {
      scrollDelta = fullTarget.bottom - maxTargetBottom;
    } else if (fullTarget.bottom < topMargin + 80) {
      scrollDelta = fullTarget.bottom - (topMargin + Math.min(fullTarget.height, usableH * 0.55));
    }
  }

  // Nunca clamp sobre o alvo: se o ideal estiver fora do viewport, mantém colado
  // (o scroll corrige). Só limita horizontalmente.
  const minTop = topMargin;
  const maxTop = Math.max(topMargin, vh - calloutH - bottomMargin);
  const fitsInViewport = calloutTop >= minTop && calloutTop <= maxTop;

  if (fitsInViewport && overlapsTarget(centerLeft, calloutTop, calloutW, calloutH, fullTarget)) {
    // Ideal ainda sobrepõe (edge case) — força o lado oposto colado.
    const alt: "top" | "bottom" = side === "top" ? "bottom" : "top";
    const altTop = idealTop(alt);
    if (!overlapsTarget(centerLeft, altTop, calloutW, calloutH, fullTarget)) {
      side = alt;
      calloutTop = altTop;
      if (alt === "top") {
        const minTargetTop = topMargin + needed;
        scrollDelta = fullTarget.top < minTargetTop ? fullTarget.top - minTargetTop : 0;
      } else {
        const maxTargetBottom = vh - bottomMargin - needed;
        scrollDelta =
          fullTarget.bottom > maxTargetBottom ? fullTarget.bottom - maxTargetBottom : 0;
      }
    }
  }

  // Se após scroll pretendido ainda precisamos de clamp visual, só aplica se NÃO sobrepor.
  if (!fitsInViewport) {
    const clamped = clamp(calloutTop, minTop, maxTop);
    if (!overlapsTarget(centerLeft, clamped, calloutW, calloutH, fullTarget)) {
      calloutTop = clamped;
    }
    // Senão: deixa fora do viewport até o scroll abrir espaço (evita cobrir o card).
  }

  return {
    placement: side,
    calloutLeft: centerLeft,
    calloutTop,
    scrollDelta,
  };
}

function resolveTargetAnchor(
  targetRect: DOMRect,
  placement: ResolvedPlacement,
  calloutCenterX: number,
  calloutCenterY: number,
): { x: number; y: number } {
  switch (placement) {
    case "left":
      return {
        x: targetRect.left,
        y: clamp(
          calloutCenterY,
          targetRect.top + TARGET_EDGE_INSET,
          targetRect.bottom - TARGET_EDGE_INSET,
        ),
      };
    case "right":
      return {
        x: targetRect.right,
        y: clamp(
          calloutCenterY,
          targetRect.top + TARGET_EDGE_INSET,
          targetRect.bottom - TARGET_EDGE_INSET,
        ),
      };
    case "top":
      return {
        x: clamp(
          calloutCenterX,
          targetRect.left + TARGET_EDGE_INSET,
          targetRect.right - TARGET_EDGE_INSET,
        ),
        y: targetRect.top,
      };
    case "bottom":
      return {
        x: clamp(
          calloutCenterX,
          targetRect.left + TARGET_EDGE_INSET,
          targetRect.right - TARGET_EDGE_INSET,
        ),
        y: targetRect.bottom,
      };
  }
}

function resolveLineStart(
  calloutLeft: number,
  calloutTop: number,
  calloutW: number,
  calloutH: number,
  placement: ResolvedPlacement,
  lineEnd: { x: number; y: number },
): { x: number; y: number } {
  switch (placement) {
    case "left":
      return {
        x: calloutLeft + calloutW,
        y: clamp(lineEnd.y, calloutTop + 8, calloutTop + calloutH - 8),
      };
    case "right":
      return {
        x: calloutLeft,
        y: clamp(lineEnd.y, calloutTop + 8, calloutTop + calloutH - 8),
      };
    case "top":
      return {
        x: clamp(lineEnd.x, calloutLeft + 8, calloutLeft + calloutW - 8),
        y: calloutTop + calloutH,
      };
    case "bottom":
      return {
        x: clamp(lineEnd.x, calloutLeft + 8, calloutLeft + calloutW - 8),
        y: calloutTop,
      };
  }
}

function computeGeometry(
  rawTargetRect: DOMRect,
  targetElement: Element,
  calloutRect: DOMRect,
  extraHoles: HighlightHole[],
  preferred: AnimaTourCalloutPlacement,
): PointerGeometry {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const topMargin = resolveViewportTopMargin(vw);
  const bottomMargin = resolveViewportBottomMargin(vh, vw);
  const cw = calloutRect.width;
  const ch = calloutRect.height;

  // Spotlight visual pode ser truncado; âncora/colisão usam o card inteiro.
  // `data-tour-spotlight="full"` ilumina o card completo (meta + barra de dias).
  const fullSpotlight = prefersFullSpotlight(targetElement);
  const spotlightRect = resolveSpotlightTargetRect(rawTargetRect, vh, targetElement);

  const preferredSide: AnimaTourCalloutPlacement =
    preferred === "left" || preferred === "right"
      ? "auto"
      : fullSpotlight && preferred === "auto"
        ? "top"
        : preferred;

  const resolved = resolveAdjacentPlacement(
    rawTargetRect,
    cw,
    ch,
    preferredSide,
    vw,
    vh,
    topMargin,
    bottomMargin,
  );

  const calloutLeft = resolved.calloutLeft;
  const calloutTop = resolved.calloutTop;
  const placement: ResolvedPlacement = resolved.placement;
  let scrollDelta =
    Math.abs(resolved.scrollDelta) > SCROLL_EPSILON ? resolved.scrollDelta : 0;

  // Card inteiro: se a base (slider/ações) ficou abaixo da margem, sobe o scroll
  // sem empurrar o topo por cima da faixa do callout.
  if (fullSpotlight && placement === "top") {
    const usableBottom = vh - bottomMargin;
    const minTargetTop = topMargin + ch + CALLOUT_GAP;
    if (rawTargetRect.bottom > usableBottom + SCROLL_EPSILON) {
      const needUp = rawTargetRect.bottom - usableBottom;
      const maxUp = Math.max(0, rawTargetRect.top - minTargetTop);
      const extra = Math.min(needUp, maxUp);
      if (extra > SCROLL_EPSILON) {
        scrollDelta = (scrollDelta || 0) + extra;
      }
    }
  }

  const calloutCenterX = calloutLeft + cw / 2;
  const calloutCenterY = calloutTop + ch / 2;
  // Card completo: linha aponta o centro do alvo. Truncado: borda do buraco.
  const lineEnd = fullSpotlight
    ? {
        x: clamp(
          calloutCenterX,
          rawTargetRect.left + TARGET_EDGE_INSET,
          rawTargetRect.right - TARGET_EDGE_INSET,
        ),
        y: clamp(
          calloutCenterY,
          rawTargetRect.top + TARGET_EDGE_INSET,
          rawTargetRect.bottom - TARGET_EDGE_INSET,
        ),
      }
    : resolveTargetAnchor(
        placement === "top" || placement === "bottom" ? spotlightRect : rawTargetRect,
        placement,
        calloutCenterX,
        calloutCenterY,
      );
  const lineStart = resolveLineStart(calloutLeft, calloutTop, cw, ch, placement, lineEnd);
  const holes = [domRectToHole(spotlightRect, targetElement, HIGHLIGHT_PAD), ...extraHoles];

  return { holes, calloutLeft, calloutTop, lineStart, lineEnd, placement, scrollDelta };
}

function near(a: number, b: number, tolerance = 0.5): boolean {
  return Math.abs(a - b) <= tolerance;
}

function rectNear(a: Rect, b: Rect): boolean {
  return near(a.top, b.top) && near(a.left, b.left) && near(a.width, b.width) && near(a.height, b.height);
}

function holeNear(a: HighlightHole, b: HighlightHole): boolean {
  return rectNear(a, b) && a.borderRadius === b.borderRadius;
}

function pointNear(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return near(a.x, b.x) && near(a.y, b.y);
}

function geometryEqual(a: PointerGeometry | null, b: PointerGeometry | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.placement !== b.placement) return false;
  if (a.holes.length !== b.holes.length) return false;
  if (!near(a.calloutLeft, b.calloutLeft)) return false;
  if (!near(a.calloutTop, b.calloutTop)) return false;
  if (!near(a.scrollDelta, b.scrollDelta, 1)) return false;
  if (!pointNear(a.lineStart, b.lineStart)) return false;
  if (!pointNear(a.lineEnd, b.lineEnd)) return false;
  for (let index = 0; index < a.holes.length; index += 1) {
    if (!holeNear(a.holes[index], b.holes[index])) return false;
  }
  return true;
}

export type AnimaTourCalloutProps = {
  active: boolean;
  targetSelector: string;
  highlightSelectors?: readonly string[];
  placement?: AnimaTourCalloutPlacement;
  zIndex?: number;
  children: React.ReactNode;
};

export function AnimaTourCallout({
  active,
  targetSelector,
  highlightSelectors = EMPTY_HIGHLIGHTS,
  placement = "auto",
  zIndex = 120,
  children,
}: AnimaTourCalloutProps) {
  const gradientId = useId().replace(/:/g, "");
  const calloutRef = useRef<HTMLDivElement>(null);
  const geometryRef = useRef<PointerGeometry | null>(null);
  const lastScrollAtRef = useRef(0);
  const [geometry, setGeometry] = useState<PointerGeometry | null>(null);
  const [targetReady, setTargetReady] = useState(false);
  const highlightKey = highlightSelectors.join("|");

  const commitGeometry = useCallback((next: PointerGeometry | null) => {
    if (geometryEqual(geometryRef.current, next)) return;
    geometryRef.current = next;
    setGeometry(next);
  }, []);

  const syncGeometry = useCallback(() => {
    if (!active) return;

    const target = resolveTourTargetElement(targetSelector);
    const callout = calloutRef.current;
    if (!target || !callout) {
      if (geometryRef.current !== null) commitGeometry(null);
      setTargetReady((prev) => (prev ? false : prev));
      return;
    }

    const targetRect = target.getBoundingClientRect();
    if (targetRect.width < 2 || targetRect.height < 2) {
      if (geometryRef.current !== null) commitGeometry(null);
      setTargetReady((prev) => (prev ? false : prev));
      return;
    }

    const extraHoles = highlightKey
      .split("|")
      .filter(Boolean)
      .map((selector) => resolveTourTargetElement(selector))
      .filter((node): node is Element => Boolean(node && node !== target))
      .map((node) => {
        const rect = node.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return null;
        return domRectToHole(rect, node, HIGHLIGHT_PAD);
      })
      .filter((hole): hole is HighlightHole => Boolean(hole));

    const calloutRect = callout.getBoundingClientRect();
    const next = computeGeometry(targetRect, target, calloutRect, extraHoles, placement);

    if (Math.abs(next.scrollDelta) > 10) {
      const now = Date.now();
      if (now - lastScrollAtRef.current > 420) {
        lastScrollAtRef.current = now;
        window.scrollBy({ top: next.scrollDelta, behavior: "smooth" });
      }
    }

    commitGeometry(next);
    setTargetReady((prev) => (prev ? prev : true));
  }, [active, commitGeometry, highlightKey, placement, targetSelector]);

  useLayoutEffect(() => {
    if (!active) {
      geometryRef.current = null;
      lastScrollAtRef.current = 0;
      return;
    }

    lastScrollAtRef.current = 0;
    let raf = 0;
    raf = window.requestAnimationFrame(() => syncGeometry());
    return () => window.cancelAnimationFrame(raf);
  }, [active, syncGeometry, targetSelector, placement]);

  useEffect(() => {
    if (!active) return;

    const target = resolveTourTargetElement(targetSelector);
    const interactiveTargets: HTMLElement[] = [];

    const elevate = (node: Element | null) => {
      if (!(node instanceof HTMLElement)) return;
      interactiveTargets.push(node);
      node.dataset.animaTourInteractive = "true";
      node.style.setProperty("position", node.style.position || "relative");
      node.style.setProperty("z-index", String(zIndex + 2));
      node.style.setProperty("pointer-events", "auto");
    };

    elevate(target);
    for (const selector of highlightKey.split("|").filter(Boolean)) {
      const node = resolveTourTargetElement(selector);
      if (node && node !== target) elevate(node);
    }

    let rafId = 0;
    const scheduleSync = () => {
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(syncGeometry);
    };

    scheduleSync();
    const resyncTimer = window.setTimeout(scheduleSync, 420);
    const resyncTimer2 = window.setTimeout(scheduleSync, 900);

    window.addEventListener("resize", scheduleSync);
    window.addEventListener("scroll", scheduleSync, true);

    const observed = new Set<Element>();
    if (target) observed.add(target);
    for (const selector of highlightKey.split("|").filter(Boolean)) {
      const node = resolveTourTargetElement(selector);
      if (node) observed.add(node);
    }

    const observer = new ResizeObserver(scheduleSync);
    observed.forEach((node) => observer.observe(node));
    if (calloutRef.current) observer.observe(calloutRef.current);

    return () => {
      window.clearTimeout(resyncTimer);
      window.clearTimeout(resyncTimer2);
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("scroll", scheduleSync, true);
      observer.disconnect();
      for (const node of interactiveTargets) {
        delete node.dataset.animaTourInteractive;
        node.style.removeProperty("z-index");
        node.style.removeProperty("pointer-events");
      }
    };
  }, [active, highlightKey, placement, syncGeometry, targetSelector, zIndex]);

  if (!active) return null;

  const maskId = `${gradientId}-dim`;

  return (
    <div className="anima-tour-callout-root pointer-events-none fixed inset-0" style={{ zIndex }}>
      {geometry && geometry.holes.length > 0 ? (
        <svg
          className="anima-tour-spotlight-dim pointer-events-none fixed inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <mask id={maskId}>
              <rect width="100%" height="100%" fill="white" />
              {geometry.holes.map((hole, index) => (
                <rect
                  key={`mask-${hole.left}-${hole.top}-${index}`}
                  x={hole.left}
                  y={hole.top}
                  width={hole.width}
                  height={hole.height}
                  rx={parseBorderRadius(hole.borderRadius, hole.height)}
                  fill="black"
                />
              ))}
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.84)" mask={`url(#${maskId})`} />
        </svg>
      ) : null}

      {geometry?.holes.map((hole, index) => (
        <div
          key={`ring-${hole.left}-${hole.top}-${index}`}
          className="anima-tour-spotlight-ring pointer-events-none fixed border-2 border-amber-400/75"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
            borderRadius: hole.borderRadius,
          }}
          aria-hidden="true"
        />
      ))}

      {geometry && targetReady ? (
        <svg
          className="anima-tour-pointer-line pointer-events-none fixed inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={gradientId}
              gradientUnits="userSpaceOnUse"
              x1={geometry.lineStart.x}
              y1={geometry.lineStart.y}
              x2={geometry.lineEnd.x}
              y2={geometry.lineEnd.y}
            >
              <stop offset="0%" stopColor="#fde68a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.85" />
            </linearGradient>
          </defs>
          <line
            x1={geometry.lineStart.x}
            y1={geometry.lineStart.y}
            x2={geometry.lineEnd.x}
            y2={geometry.lineEnd.y}
            stroke={`url(#${gradientId})`}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <circle cx={geometry.lineEnd.x} cy={geometry.lineEnd.y} r={4} fill="#fbbf24" />
        </svg>
      ) : null}

      <div
        ref={calloutRef}
        className="anima-tour-callout pointer-events-auto fixed flex w-[min(100vw-1.5rem,24rem)]"
        style={
          geometry
            ? { top: geometry.calloutTop, left: geometry.calloutLeft, transform: "none" }
            : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
        }
      >
        {children}
      </div>
    </div>
  );
}

export const AnymaTourCallout = AnimaTourCallout;
export type AnymaTourCalloutProps = AnimaTourCalloutProps;
