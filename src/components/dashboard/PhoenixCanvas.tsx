"use client";

import dynamic from "next/dynamic";
import { Suspense, memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PHOENIX_FLASH_FADE_MS,
  PHOENIX_FLASH_HOLD_MS,
  PHOENIX_GREETING_DELAY_MS,
  PHOENIX_GREETING_VISIBLE_MS,
  PHOENIX_IGNITION_DURATION_S,
  PHOENIX_REVEAL_TOTAL_S,
  PHOENIX_WING_CYCLE_S,
} from "@/components/dashboard/PhoenixModel";
import { ANYMA_ORB_GREETING } from "@/lib/phoenix-lore";

const PHOENIX_ANCHOR_STYLE = {
  position: "fixed",
  top: "auto",
  left: "auto",
  zIndex: 60,
} as const;

type PhoenixOrbPhase = "orb" | "igniting" | "revealing" | "awake";

/** Sem estágio intermediário — evita resize brigando com o clarão. */
function resolveOrbShellClass(phase: PhoenixOrbPhase, isHudOpen: boolean): string {
  if (isHudOpen || phase !== "orb") return "phoenix-orb-shell--awake";
  return "phoenix-orb-shell--compact";
}

function resolveFireballClass(
  phase: PhoenixOrbPhase,
  flashVisible: boolean,
  flashHidden: boolean,
  flashFading: boolean,
  showModel: boolean,
  modelReady: boolean,
): string {
  if (flashFading) return "phoenix-fireball-mask--flash-fade";
  if (flashHidden && showModel) return "phoenix-fireball-mask--open";
  if (flashVisible) return "phoenix-fireball-mask--flash";
  if (showModel) return "phoenix-fireball-mask--open";
  if (modelReady) return "phoenix-fireball-mask--idle";
  return "phoenix-fireball-mask--boot";
}

function resolveShellTransitionMs(phase: PhoenixOrbPhase): number {
  // Sem resize animado no clarão — evita luta visual e custo de layout.
  if (phase === "igniting" || phase === "revealing") return 0;
  if (phase === "awake") return 280;
  return 280;
}

const PhoenixCanvasDynamic = dynamic(
  () =>
    import("@/components/dashboard/PhoenixCanvasInner").then((mod) => mod.PhoenixCanvasInner),
  { ssr: false },
);

export type PhoenixCanvasProps = {
  isPunished?: boolean;
  isDeployed?: boolean;
  greetingCopy?: string;
  onEngage?: () => void;
  onPhoenixRevealed?: () => void;
  ariaLabel?: string;
  className?: string;
};

export const PhoenixCanvas = memo(function PhoenixCanvas({
  isPunished = false,
  isDeployed: isHudOpen = false,
  greetingCopy = ANYMA_ORB_GREETING,
  onEngage,
  onPhoenixRevealed,
  ariaLabel = "Despertar ANYMA FÊNIX",
  className = "",
}: PhoenixCanvasProps) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<PhoenixOrbPhase>("orb");
  const [modelReady, setModelReady] = useState(false);
  const [modelVisible, setModelVisible] = useState(false);
  const [flashFading, setFlashFading] = useState(false);
  const [flashHidden, setFlashHidden] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const revealCycleRef = useRef(0);
  const lastGreetedCycleRef = useRef(-1);
  const timersRef = useRef<number[]>([]);

  const showShellOpen = isHudOpen || phase === "revealing" || phase === "awake" || phase === "igniting";
  const flashVisible = !flashHidden && (phase === "igniting" || phase === "revealing");
  /** WebGL só depois do clarão — zero contexto 3D durante o flash. */
  const mountCanvas = isHudOpen || (flashHidden && (phase === "revealing" || phase === "awake"));
  const orbSettled = flashHidden && (modelVisible || isHudOpen);
  const shellClass = resolveOrbShellClass(phase, isHudOpen);
  const shellTransitionMs = resolveShellTransitionMs(phase);

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) {
      window.clearTimeout(timer);
    }
    timersRef.current = [];
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    // Prefetch do módulo/GLB sem criar contexto WebGL.
    void import("@/components/dashboard/PhoenixModel");
  }, []);

  const queueTimer = useCallback((fn: () => void, delayMs: number) => {
    const timer = window.setTimeout(fn, delayMs);
    timersRef.current.push(timer);
    return timer;
  }, []);

  const resetFlashState = useCallback(() => {
    setFlashFading(false);
    setFlashHidden(false);
  }, []);

  const handleModelLoaded = useCallback(() => {
    setModelReady(true);
  }, []);

  useEffect(() => {
    if (isPunished || !flashHidden || !modelVisible) return;
    if (phase !== "revealing" && phase !== "awake") return;
    if (lastGreetedCycleRef.current === revealCycleRef.current) return;

    lastGreetedCycleRef.current = revealCycleRef.current;

    const showTimer = window.setTimeout(() => {
      setShowGreeting(true);
      onPhoenixRevealed?.();
    }, PHOENIX_GREETING_DELAY_MS);

    const hideTimer = window.setTimeout(
      () => setShowGreeting(false),
      PHOENIX_GREETING_DELAY_MS + PHOENIX_GREETING_VISIBLE_MS,
    );

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [flashHidden, isPunished, modelVisible, onPhoenixRevealed, phase]);

  /** Clarão: hold → fade → gone. Sem WebGL neste intervalo. */
  useEffect(() => {
    if (phase !== "revealing" || flashFading || flashHidden) return;

    const dismissTimer = window.setTimeout(() => {
      setFlashFading(true);
    }, PHOENIX_FLASH_HOLD_MS);

    return () => window.clearTimeout(dismissTimer);
  }, [flashFading, flashHidden, phase]);

  useEffect(() => {
    if (!flashFading) return;

    const hideTimer = window.setTimeout(() => {
      setFlashHidden(true);
      setFlashFading(false);
    }, PHOENIX_FLASH_FADE_MS);

    return () => window.clearTimeout(hideTimer);
  }, [flashFading]);

  /** ANYMA aparece só após clarão — tamanho final, sem fade/scale. */
  useEffect(() => {
    if (isHudOpen) {
      queueMicrotask(() => setModelVisible(true));
      return;
    }

    if (flashHidden && (phase === "revealing" || phase === "awake")) {
      queueMicrotask(() => setModelVisible(true));
      return;
    }

    if (phase === "orb") {
      queueMicrotask(() => setModelVisible(false));
    }
  }, [flashHidden, isHudOpen, phase]);

  useEffect(() => {
    if (isHudOpen) return;
    if (phase !== "awake") return;

    clearTimers();
    queueMicrotask(() => {
      setShowGreeting(false);
      setPhase("orb");
      setModelVisible(false);
      resetFlashState();
    });
  }, [clearTimers, isHudOpen, phase, resetFlashState]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const handleEngage = useCallback(() => {
    if (isHudOpen) {
      onEngage?.();
      return;
    }

    if (phase === "igniting" || phase === "revealing") return;

    if (phase === "awake") {
      onEngage?.();
      return;
    }

    onEngage?.();

    setShowGreeting(false);
    revealCycleRef.current += 1;
    setModelVisible(false);
    resetFlashState();
    setPhase("igniting");

    queueTimer(() => {
      setPhase("revealing");
    }, PHOENIX_IGNITION_DURATION_S * 1000);

    queueTimer(() => {
      setPhase("awake");
    }, PHOENIX_REVEAL_TOTAL_S * 1000);
  }, [isHudOpen, onEngage, phase, queueTimer, resetFlashState]);

  const resolveModelLayerClass = (): string => {
    if (!mountCanvas) return "phoenix-orb-model-layer";
    const classes = ["phoenix-orb-model-layer"];
    if (modelVisible) {
      classes.push("phoenix-orb-model-layer--revealed");
      if (orbSettled) classes.push("phoenix-orb-model-layer--contoured");
    } else {
      classes.push("phoenix-orb-model-layer--camouflaged");
    }
    return classes.join(" ");
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className={`phoenix-anchor ${className}`}
      data-anima-phoenix-anchor
      style={PHOENIX_ANCHOR_STYLE}
    >
      {showGreeting && greetingCopy ? (
        <div
          className="phoenix-orb-greeting phoenix-orb-greeting--revealed pointer-events-none absolute z-[70]"
          role="status"
          aria-live="polite"
        >
          <p className="rounded-2xl border border-amber-400/30 bg-neutral-950/92 px-4 py-3 text-left text-xs leading-relaxed text-amber-50/95 shadow-[0_0_28px_rgba(255,255,255,0.18)]">
            {greetingCopy}
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleEngage}
        aria-label={ariaLabel}
        data-phoenix-deployed={orbSettled || isHudOpen ? "true" : "false"}
        data-phoenix-phase={phase}
        style={{
          transitionDuration: `${shellTransitionMs}ms`,
          ["--phoenix-flash-fade-ms" as string]: `${PHOENIX_FLASH_FADE_MS}ms`,
          ["--phoenix-pulse-cycle" as string]: `${PHOENIX_WING_CYCLE_S}s`,
        }}
        className={`phoenix-orb-shell ${shellClass} ${
          orbSettled || isHudOpen ? "phoenix-orb-shell--open phoenix-orb-shell--ascended" : "phoenix-orb-shell--lit"
        } focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60`}
      >
        <span
          aria-hidden="true"
          className={`phoenix-orb-cast-shadow ${
            orbSettled || isHudOpen
              ? "phoenix-orb-cast-shadow--awake"
              : "phoenix-orb-cast-shadow--idle"
          }`}
        />

        <span
          aria-hidden="true"
          className={`phoenix-orb-radiance ${
            showShellOpen ? "phoenix-orb-radiance--rim" : "phoenix-orb-radiance--idle"
          }`}
        />

        <span
          aria-hidden="true"
          className={`anima-fireball phoenix-fireball-mask absolute inset-0 z-[2] rounded-full${
            flashHidden && (orbSettled || isHudOpen) ? " anima-fireball--chamber" : ""
          } ${resolveFireballClass(
            phase,
            flashVisible,
            flashHidden,
            flashFading,
            modelVisible || isHudOpen,
            modelReady,
          )}`}
        />

        {/* Um único véu de clarão — só opacity, sem filter/scale/WebGL. */}
        {flashVisible ? (
          <span
            aria-hidden="true"
            className={`phoenix-flash-veil ${
              phase === "igniting"
                ? "phoenix-flash-veil--charge"
                : flashFading
                  ? "phoenix-flash-veil--fading"
                  : "phoenix-flash-veil--nova"
            }`}
          />
        ) : null}

        {mountCanvas ? (
          <div className={resolveModelLayerClass()} aria-hidden={!modelVisible}>
            {orbSettled || isHudOpen ? (
              <>
                <span
                  aria-hidden="true"
                  className="phoenix-orb-model-aura phoenix-orb-model-aura--glow pointer-events-none absolute inset-[8%] z-[0] rounded-full"
                />
                <span
                  aria-hidden="true"
                  className="phoenix-orb-model-aura phoenix-orb-model-aura--rim pointer-events-none absolute inset-[2%] z-[1] rounded-full"
                />
                <span
                  aria-hidden="true"
                  className="phoenix-orb-model-aura phoenix-orb-model-aura--edge pointer-events-none absolute inset-[-2%] z-[3] rounded-full"
                />
                <span
                  aria-hidden="true"
                  className="phoenix-orb-model-contact-shadow pointer-events-none absolute left-1/2 bottom-[2%] z-[0] h-[14%] w-[58%] -translate-x-1/2 rounded-full"
                />
              </>
            ) : null}
            <Suspense fallback={null}>
              <PhoenixCanvasDynamic
                isPunished={isPunished}
                isVisible={modelVisible || isHudOpen}
                isOpenOrb={isHudOpen || modelVisible}
                onLoaded={handleModelLoaded}
                onEngage={handleEngage}
              />
            </Suspense>
          </div>
        ) : null}

        {isPunished ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[6] rounded-full bg-[radial-gradient(circle,rgba(55,55,55,0.35)_0%,rgba(0,0,0,0.55)_72%)]"
          />
        ) : null}
      </button>
    </div>,
    document.body,
  );
});
