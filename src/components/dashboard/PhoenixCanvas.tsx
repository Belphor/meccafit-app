"use client";

import dynamic from "next/dynamic";
import { Suspense, memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PHOENIX_CORE_FLASH_BLOOM_MS,
  PHOENIX_DEPLOY_DURATION_S,
  PHOENIX_FLASH_FADE_MS,
  PHOENIX_FLASH_HOLD_MS,
  PHOENIX_GREETING_DELAY_MS,
  PHOENIX_GREETING_VISIBLE_MS,
  PHOENIX_IGNITION_DURATION_S,
  PHOENIX_MODEL_FADE_IN_MS,
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

function resolveOrbShellClass(phase: PhoenixOrbPhase, isHudOpen: boolean): string {
  if (isHudOpen || phase === "revealing" || phase === "awake") {
    return "phoenix-orb-shell--awake";
  }
  if (phase === "igniting") return "phoenix-orb-shell--igniting";
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
  if (flashFading) return "phoenix-fireball-mask--nova-fading";
  if (flashHidden && showModel) return "phoenix-fireball-mask--open";
  if (phase === "igniting") return "phoenix-fireball-mask--ignited";
  if (flashVisible && phase === "revealing") {
    return "phoenix-fireball-mask--nova";
  }
  if (showModel) return "phoenix-fireball-mask--radiant";
  if (modelReady) return "phoenix-fireball-mask--idle";
  return "phoenix-fireball-mask--boot";
}

function resolveShellTransitionMs(phase: PhoenixOrbPhase): number {
  if (phase === "igniting") return PHOENIX_IGNITION_DURATION_S * 1000;
  if (phase === "revealing" || phase === "awake") return PHOENIX_DEPLOY_DURATION_S * 1000;
  return PHOENIX_DEPLOY_DURATION_S * 1000;
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
  const [modelEmerging, setModelEmerging] = useState(false);
  const [modelRevealed, setModelRevealed] = useState(false);
  const [flashFading, setFlashFading] = useState(false);
  const [flashHidden, setFlashHidden] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const revealCycleRef = useRef(0);
  const lastGreetedCycleRef = useRef(-1);
  const timersRef = useRef<number[]>([]);

  const showModel = isHudOpen || phase === "revealing" || phase === "awake";
  /** Canvas monta no ignite (preload) mas só pinta a malha depois do clarão. */
  const mountCanvas = phase === "igniting" || showModel;
  const modelSceneVisible =
    isHudOpen || modelEmerging || modelRevealed || (phase === "awake" && flashHidden);
  const flashVisible =
    !flashHidden && (phase === "igniting" || (phase === "revealing" && !flashHidden));
  const orbGlowActive = showModel && (modelEmerging || modelRevealed || isHudOpen);
  /** Corona/rim só após o clarão — evita blur+blend empilhado com WebGL no pico. */
  const sphereAuraActive = orbGlowActive && flashHidden;
  const openFlameRings = orbGlowActive && flashHidden;
  const modelContourGlow =
    (modelRevealed || isHudOpen) && flashHidden;
  const coreFlashVisible =
    !flashHidden && (phase === "igniting" || phase === "revealing");
  const shellClass = resolveOrbShellClass(phase, isHudOpen);
  const shellTransitionMs = resolveShellTransitionMs(phase);

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) {
      window.clearTimeout(timer);
    }
    timersRef.current = [];
  }, []);

  useEffect(() => {
    // Guarda de hidratação SSR: só marca montado no cliente (canvas 3D não renderiza no servidor).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
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

  const beginModelEmerging = useCallback(() => {
    if (!modelReady) return;
    setModelEmerging(true);
  }, [modelReady]);

  const handleModelLoaded = useCallback(() => {
    setModelReady(true);
  }, []);

  useEffect(() => {
    if (isPunished || !flashHidden || !modelRevealed) return;
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
  }, [flashHidden, isPunished, modelRevealed, onPhoenixRevealed, phase]);

  /** Clarão some no próprio tempo — modelo ainda oculto. */
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

  /** ANYMA só emerge depois do clarão sumir por completo. */
  useEffect(() => {
    if (isHudOpen) {
      queueMicrotask(() => {
        setModelEmerging(true);
        setModelRevealed(true);
      });
      return;
    }

    if (flashHidden && (phase === "revealing" || phase === "awake") && modelReady) {
      queueMicrotask(() => beginModelEmerging());
      return;
    }

    if (phase === "orb") {
      queueMicrotask(() => {
        setModelEmerging(false);
        setModelRevealed(false);
      });
    }
  }, [beginModelEmerging, flashHidden, isHudOpen, modelReady, phase]);

  useEffect(() => {
    if (!modelEmerging) {
      queueMicrotask(() => setModelRevealed(false));
      return;
    }

    if (PHOENIX_MODEL_FADE_IN_MS <= 0) {
      queueMicrotask(() => setModelRevealed(true));
      return;
    }

    const revealTimer = window.setTimeout(() => {
      setModelRevealed(true);
    }, PHOENIX_MODEL_FADE_IN_MS);

    return () => window.clearTimeout(revealTimer);
  }, [modelEmerging]);

  useEffect(() => {
    if (isHudOpen) return;
    if (phase !== "awake") return;

    clearTimers();
    queueMicrotask(() => {
      setShowGreeting(false);
      setPhase("orb");
      setModelEmerging(false);
      setModelRevealed(false);
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

    // Abre o painel e dispara a voz no gesto do toque (necessário para TTS no browser).
    onEngage?.();

    setShowGreeting(false);
    revealCycleRef.current += 1;
    setModelEmerging(false);
    setModelRevealed(false);
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
    if (modelRevealed || isHudOpen) {
      classes.push("phoenix-orb-model-layer--emerging");
      classes.push("phoenix-orb-model-layer--revealed");
    } else if (modelEmerging && flashHidden) {
      classes.push("phoenix-orb-model-layer--emerging");
      classes.push("phoenix-orb-model-layer--fading-in");
    } else if (phase === "revealing" || phase === "igniting") {
      classes.push("phoenix-orb-model-layer--camouflaged");
    } else {
      classes.push("phoenix-orb-model-layer--preloading");
    }
    if (modelContourGlow) {
      classes.push("phoenix-orb-model-layer--contoured");
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
          <p className="rounded-2xl border border-amber-400/30 bg-neutral-950/92 px-4 py-3 text-left text-xs leading-relaxed text-amber-50/95 shadow-[0_0_28px_rgba(255,255,255,0.18)] backdrop-blur-md">
            {greetingCopy}
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleEngage}
        aria-label={ariaLabel}
        data-phoenix-deployed={showModel ? "true" : "false"}
        data-phoenix-phase={phase}
        style={{
          transitionDuration: `${shellTransitionMs}ms`,
          ["--phoenix-model-fade-ms" as string]: `${PHOENIX_MODEL_FADE_IN_MS}ms`,
          ["--phoenix-flash-fade-ms" as string]: `${PHOENIX_FLASH_FADE_MS}ms`,
          ["--phoenix-core-flash-bloom-ms" as string]: `${PHOENIX_CORE_FLASH_BLOOM_MS}ms`,
          ["--phoenix-pulse-cycle" as string]: `${PHOENIX_WING_CYCLE_S}s`,
        }}
        className={`phoenix-orb-shell ${shellClass} ${
          orbGlowActive
            ? `phoenix-orb-shell--open${
                modelContourGlow ? " phoenix-orb-shell--ascended" : ""
              }`
            : "phoenix-orb-shell--lit"
        } focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60`}
      >
        <span
          aria-hidden="true"
          className={`phoenix-orb-cast-shadow ${
            orbGlowActive ? "phoenix-orb-cast-shadow--awake" : "phoenix-orb-cast-shadow--idle"
          }`}
        />

        <span
          aria-hidden="true"
          className={`phoenix-orb-radiance ${
            showModel ? "phoenix-orb-radiance--rim" : "phoenix-orb-radiance--idle"
          }`}
        />

        {sphereAuraActive ? (
          <span
            aria-hidden="true"
            className="phoenix-orb-sphere-rim pointer-events-none absolute inset-[-4%] z-[4] rounded-full"
          />
        ) : null}

        <span
          aria-hidden="true"
          className={`anima-fireball phoenix-fireball-mask absolute inset-0 z-[2] rounded-full${
            flashHidden && showModel ? " anima-fireball--chamber" : ""
          } ${resolveFireballClass(
            phase,
            flashVisible,
            flashHidden,
            flashFading,
            showModel,
            modelReady,
          )}`}
        />

        {openFlameRings ? (
          <span
            aria-hidden="true"
            className="phoenix-flame-ring phoenix-flame-ring--ambient phoenix-flame-ring--one"
          />
        ) : null}

        {mountCanvas ? (
          <div className={resolveModelLayerClass()} aria-hidden={!modelEmerging}>
            {modelContourGlow ? (
              <span
                aria-hidden="true"
                className="phoenix-orb-model-contact-shadow pointer-events-none absolute left-1/2 bottom-[2%] z-[0] h-[14%] w-[58%] -translate-x-1/2 rounded-full"
              />
            ) : null}
            <Suspense fallback={null}>
              <PhoenixCanvasDynamic
                isPunished={isPunished}
                isVisible={modelSceneVisible}
                isOpenOrb={showModel && flashHidden}
                onLoaded={handleModelLoaded}
                onEngage={handleEngage}
              />
            </Suspense>
          </div>
        ) : null}

        {coreFlashVisible ? (
          <span
            aria-hidden="true"
            className={`phoenix-core-flash ${
              flashFading
                ? "phoenix-core-flash--fading"
                : phase === "revealing"
                  ? "phoenix-core-flash--hold"
                  : "phoenix-core-flash--bloom"
            }`}
          />
        ) : null}

        {flashVisible ? (
          <span
            aria-hidden="true"
            className={`phoenix-flash-veil ${
              phase === "igniting" ? "phoenix-flash-veil--charge" : "phoenix-flash-veil--nova"
            } ${flashFading ? "phoenix-flash-veil--fading" : ""}`}
          />
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
