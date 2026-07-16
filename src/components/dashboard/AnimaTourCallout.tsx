"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { resolveTourTargetElement } from "@/lib/anima-perfil-identity-beats";

const CALLOUT_GAP = 20;
const HIGHLIGHT_PAD = 10;
const VIEWPORT_MARGIN = 14;
const TARGET_EDGE_INSET = 10;
const EMPTY_HIGHLIGHTS: readonly string[] = [];

export type AnimaTourCalloutPlacement = "left" | "right" | "top" | "bottom" | "auto";
/** Alias de marca — mesmo tipo. */
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
};

type ResolvedPlacement = Exclude<AnimaTourCalloutPlacement, "auto">;

const OPPOSITE_PLACEMENT: Record<ResolvedPlacement, ResolvedPlacement> = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

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

function placementSpace(
  placement: ResolvedPlacement,
  target: DOMRect,
  calloutW: number,
  calloutH: number,
  vw: number,
  vh: number,
): number {
  switch (placement) {
    case "left":
      return target.left - VIEWPORT_MARGIN;
    case "right":
      return vw - target.right - VIEWPORT_MARGIN;
    case "top":
      return target.top - VIEWPORT_MARGIN;
    case "bottom":
      return vh - target.bottom - VIEWPORT_MARGIN;
  }
}

function placementFits(
  placement: ResolvedPlacement,
  target: DOMRect,
  calloutW: number,
  calloutH: number,
  vw: number,
  vh: number,
): boolean {
  const space = placementSpace(placement, target, calloutW, calloutH, vw, vh);
  const needed =
    placement === "left" || placement === "right"
      ? calloutW + CALLOUT_GAP
      : calloutH + CALLOUT_GAP;
  return space >= needed;
}

function pickAutoPlacement(
  target: DOMRect,
  calloutW: number,
  calloutH: number,
  vw: number,
  vh: number,
): ResolvedPlacement {
  const candidates: ResolvedPlacement[] = ["bottom", "top", "right", "left"];
  let best: ResolvedPlacement = "bottom";
  let bestSpace = -1;

  for (const candidate of candidates) {
    const space = placementSpace(candidate, target, calloutW, calloutH, vw, vh);
    const needed =
      candidate === "left" || candidate === "right"
        ? calloutW + CALLOUT_GAP
        : calloutH + CALLOUT_GAP;
    if (space >= needed && space > bestSpace) {
      best = candidate;
      bestSpace = space;
    }
  }

  if (bestSpace >= 0) return best;

  return candidates.reduce((winner, candidate) =>
    placementSpace(candidate, target, calloutW, calloutH, vw, vh) >
    placementSpace(winner, target, calloutW, calloutH, vw, vh)
      ? candidate
      : winner,
  );
}

function pickPlacement(
  target: DOMRect,
  calloutW: number,
  calloutH: number,
  preferred: AnimaTourCalloutPlacement,
): ResolvedPlacement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (preferred === "auto") {
    return pickAutoPlacement(target, calloutW, calloutH, vw, vh);
  }

  if (placementFits(preferred, target, calloutW, calloutH, vw, vh)) {
    return preferred;
  }

  const opposite = OPPOSITE_PLACEMENT[preferred];
  if (placementFits(opposite, target, calloutW, calloutH, vw, vh)) {
    return opposite;
  }

  return pickAutoPlacement(target, calloutW, calloutH, vw, vh);
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
      return { x: calloutLeft + calloutW, y: lineEnd.y };
    case "right":
      return { x: calloutLeft, y: lineEnd.y };
    case "top":
      return { x: lineEnd.x, y: calloutTop + calloutH };
    case "bottom":
      return { x: lineEnd.x, y: calloutTop };
  }
}

function computeGeometry(
  targetRect: DOMRect,
  targetElement: Element,
  calloutRect: DOMRect,
  extraHoles: HighlightHole[],
  preferred: AnimaTourCalloutPlacement,
): PointerGeometry {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const placement = pickPlacement(targetRect, calloutRect.width, calloutRect.height, preferred);

  const tcx = targetRect.left + targetRect.width / 2;
  const tcy = targetRect.top + targetRect.height / 2;
  const cw = calloutRect.width;
  const ch = calloutRect.height;

  let calloutLeft = 0;
  let calloutTop = 0;

  switch (placement) {
    case "left":
      calloutLeft = targetRect.left - CALLOUT_GAP - cw;
      calloutTop = tcy - ch / 2;
      break;
    case "right":
      calloutLeft = targetRect.right + CALLOUT_GAP;
      calloutTop = tcy - ch / 2;
      break;
    case "top":
      calloutLeft = tcx - cw / 2;
      calloutTop = targetRect.top - CALLOUT_GAP - ch;
      break;
    case "bottom":
      calloutLeft = tcx - cw / 2;
      calloutTop = targetRect.bottom + CALLOUT_GAP;
      break;
  }

  calloutLeft = clamp(calloutLeft, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, vw - cw - VIEWPORT_MARGIN));
  calloutTop = clamp(calloutTop, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, vh - ch - VIEWPORT_MARGIN));

  // Se o card ainda cobrir o alvo após o clamp, empurra para a zona com mais espaço livre.
  const overlapsTarget =
    calloutLeft < targetRect.right + CALLOUT_GAP &&
    calloutLeft + cw > targetRect.left - CALLOUT_GAP &&
    calloutTop < targetRect.bottom + CALLOUT_GAP &&
    calloutTop + ch > targetRect.top - CALLOUT_GAP;

  if (overlapsTarget) {
    const spaceBelow = vh - targetRect.bottom - VIEWPORT_MARGIN;
    const spaceAbove = targetRect.top - VIEWPORT_MARGIN;
    if (spaceBelow >= ch + CALLOUT_GAP || spaceBelow >= spaceAbove) {
      calloutTop = clamp(
        targetRect.bottom + CALLOUT_GAP,
        VIEWPORT_MARGIN,
        Math.max(VIEWPORT_MARGIN, vh - ch - VIEWPORT_MARGIN),
      );
      calloutLeft = clamp(
        tcx - cw / 2,
        VIEWPORT_MARGIN,
        Math.max(VIEWPORT_MARGIN, vw - cw - VIEWPORT_MARGIN),
      );
    } else if (spaceAbove >= ch + CALLOUT_GAP) {
      calloutTop = clamp(
        targetRect.top - CALLOUT_GAP - ch,
        VIEWPORT_MARGIN,
        Math.max(VIEWPORT_MARGIN, vh - ch - VIEWPORT_MARGIN),
      );
      calloutLeft = clamp(
        tcx - cw / 2,
        VIEWPORT_MARGIN,
        Math.max(VIEWPORT_MARGIN, vw - cw - VIEWPORT_MARGIN),
      );
    }
  }

  const calloutCenterX = calloutLeft + cw / 2;
  const calloutCenterY = calloutTop + ch / 2;
  const lineEnd = resolveTargetAnchor(targetRect, placement, calloutCenterX, calloutCenterY);
  const lineStart = resolveLineStart(calloutLeft, calloutTop, cw, ch, placement, lineEnd);

  const holes = [domRectToHole(targetRect, targetElement, HIGHLIGHT_PAD), ...extraHoles];

  return { holes, calloutLeft, calloutTop, lineStart, lineEnd, placement };
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

function pointNear(
  a: { x: number; y: number },
  b: { x: number; y: number },
): boolean {
  return near(a.x, b.x) && near(a.y, b.y);
}

function geometryEqual(a: PointerGeometry | null, b: PointerGeometry | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.placement !== b.placement) return false;
  if (a.holes.length !== b.holes.length) return false;
  if (!near(a.calloutLeft, b.calloutLeft)) return false;
  if (!near(a.calloutTop, b.calloutTop)) return false;
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
    commitGeometry(computeGeometry(targetRect, target, calloutRect, extraHoles, placement));
    setTargetReady((prev) => (prev ? prev : true));
  }, [active, commitGeometry, highlightKey, placement, targetSelector]);

  useLayoutEffect(() => {
    if (!active) {
      geometryRef.current = null;
      return;
    }

    let raf = 0;
    const runSync = () => {
      syncGeometry();
    };
    raf = window.requestAnimationFrame(runSync);
    return () => window.cancelAnimationFrame(raf);
  }, [active, syncGeometry]);

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

    if (target instanceof HTMLElement) {
      target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    }

    let rafId = 0;
    const scheduleSync = () => {
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(syncGeometry);
    };

    scheduleSync();
    const recenterTimer = window.setTimeout(() => {
      const latest = resolveTourTargetElement(targetSelector);
      if (latest instanceof HTMLElement) {
        latest.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      }
      scheduleSync();
    }, 360);

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

    return () => {
      window.clearTimeout(recenterTimer);
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
  }, [active, highlightKey, syncGeometry, targetSelector, zIndex]);

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
        className="anima-tour-callout pointer-events-auto fixed w-[min(100vw-1.75rem,24rem)] max-h-[min(58vh,26rem)]"
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

/** Alias canônico de marca — mesmo componente. */
export const AnymaTourCallout = AnimaTourCallout;
export type AnymaTourCalloutProps = AnimaTourCalloutProps;
