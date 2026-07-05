"use client";

import { memo, useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import {
  MAGMA_SPECTRUM,
  PHASE_TRANSMUTATION_COPY,
  PHASE_TRANSMUTATION_FADE_MS,
  PHASE_TRANSMUTATION_HOLD_MS,
  PHASE_TRANSMUTATION_MS,
  PHASE_TRANSMUTATION_REVEAL_MS,
  PHASE_TRANSMUTATION_SKIP_AFTER_MS,
  PHASE_TRANSMUTATION_SUBLINE,
  PHASE_TRANSMUTATION_IRIS,
  PHASE_TIER_LABELS,
  PLASMA_TITLE,
  type PhaseTier,
} from "@/lib/dashboard-config";

type PhaseTransmutationProps = {
  phaseTier: PhaseTier;
  onDismiss: () => void;
  subline?: string;
  copy?: string;
  ariaLabel?: string;
};

type TransmutationAct = "pulse" | "reveal" | "hold" | "fade";

const FLAME_EMBER_COUNT = 8;
const IRIS_FIBER_COUNT = 14;
const IRIS_WAVE_COUNT = 3;

function phaseIrisCssVars(phaseTier: PhaseTier): CSSProperties {
  return {
    "--phase-magma-core": PHASE_TRANSMUTATION_IRIS.magmaCore,
    "--phase-solar-gold": PHASE_TRANSMUTATION_IRIS.solarGold,
    "--phase-plasma-hot": PHASE_TRANSMUTATION_IRIS.plasmaHot,
    "--phase-plasma-amber": PHASE_TRANSMUTATION_IRIS.plasmaAmber,
    "--phase-ember-deep": PHASE_TRANSMUTATION_IRIS.emberDeep,
    "--phase-obsidian": PHASE_TRANSMUTATION_IRIS.obsidian,
    "--phase-magma-rgb": "255, 69, 0",
    "--phase-solar-rgb": "255, 184, 0",
    "--phase-portal-rgb": "249, 115, 22",
    "--phase-tier-intensity": String(0.55 + phaseTier * 0.12),
    "--phase-genesis-ms": `${PHASE_TRANSMUTATION_IRIS.genesisMs}ms`,
    "--phase-transmutation-ms": `${PHASE_TRANSMUTATION_MS}ms`,
    "--phase-transmutation-fade-ms": `${PHASE_TRANSMUTATION_FADE_MS}ms`,
    "--phase-transmutation-reveal-ms": `${PHASE_TRANSMUTATION_REVEAL_MS}ms`,
    "--phase-eye-size": PHASE_TRANSMUTATION_IRIS.eyeSize,
  } as CSSProperties;
}

const PHOENIX_EYE_PATH =
  "M14 44 C14 16, 100 6, 186 44 C100 82, 14 72, 14 44 Z";

function PhoenixEyeNucleus({ act }: { act: TransmutationAct }) {
  const uid = useId().replace(/:/g, "");
  const irisPlasma = `phoenix-iris-plasma-${uid}`;
  const irisCore = `phoenix-iris-core-${uid}`;
  const scleraGrad = `phoenix-sclera-${uid}`;
  const pupilGrad = `phoenix-pupil-${uid}`;
  const rimGrad = `phoenix-rim-${uid}`;
  const pupilNeonFilter = `phoenix-pupil-neon-${uid}`;
  const lidNeonFilter = `phoenix-lid-neon-${uid}`;

  const IRIS_RX = 10;
  const IRIS_RY = 11;
  const IRIS_RING_RX = 11.2;
  const IRIS_RING_RY = 13.8;

  const fibers = Array.from({ length: IRIS_FIBER_COUNT }, (_, i) => {
    const deg = (i / IRIS_FIBER_COUNT) * 160 - 80;
    const rad = (deg * Math.PI) / 180;
    return {
      x2: 100 + Math.cos(rad) * (IRIS_RX - 1.5),
      y2: 44 + Math.sin(rad) * (IRIS_RY - 1.2),
      opacity: 0.08 + (i % 3) * 0.04,
    };
  });

  return (
    <svg
      viewBox="0 0 200 88"
      className={`phase-phoenix-eye phase-phoenix-eye--${act}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={scleraGrad} cx="50%" cy="50%" r="58%">
          <stop offset="0%" stopColor="#141414" />
          <stop offset="55%" stopColor="#0a0a0a" />
          <stop offset="100%" stopColor="#030303" />
        </radialGradient>
        <radialGradient id={irisPlasma} cx="44%" cy="46%" r="52%">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="18%" stopColor="#fde68a" />
          <stop offset="38%" stopColor="#f59e0b" />
          <stop offset="58%" stopColor="#ea580c" />
          <stop offset="78%" stopColor="#c2410c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </radialGradient>
        <radialGradient id={irisCore} cx="46%" cy="44%" r="38%">
          <stop offset="0%" stopColor="#fffef5" />
          <stop offset="35%" stopColor={MAGMA_SPECTRUM.solarGold} />
          <stop offset="70%" stopColor={MAGMA_SPECTRUM.magmaCore} />
          <stop offset="100%" stopColor="#7c2d12" />
        </radialGradient>
        <linearGradient id={pupilGrad} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#fffbeb" />
          <stop offset="100%" stopColor={MAGMA_SPECTRUM.solarGold} />
        </linearGradient>
        <linearGradient id={rimGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c2d12" stopOpacity="0.5" />
          <stop offset="35%" stopColor="#f59e0b" stopOpacity="0.85" />
          <stop offset="68%" stopColor="#fde68a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ea580c" stopOpacity="0.55" />
        </linearGradient>
        <filter id={pupilNeonFilter} x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1.05 0 0 0 0  0 0.38 0 0 0  0 0 0 0 0  0 0 0 0.62 0"
            result="orangeBlur"
          />
          <feMerge>
            <feMergeNode in="orangeBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={lidNeonFilter} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path d={PHOENIX_EYE_PATH} fill={`url(#${scleraGrad})`} className="phase-phoenix-sclera" />
      <path
        d={PHOENIX_EYE_PATH}
        fill="none"
        stroke={`url(#${rimGrad})`}
        strokeWidth="1.1"
        className="phase-phoenix-rim"
      />
      <path
        d={PHOENIX_EYE_PATH}
        fill="none"
        stroke="#fbbf24"
        strokeOpacity="0.12"
        strokeWidth="0.5"
      />

      <g className="phase-phoenix-iris-group">
        <ellipse cx="100" cy="44" rx={IRIS_RX} ry={IRIS_RY} fill={`url(#${irisPlasma})`} opacity="0.95" />
        {fibers.map((fiber, i) => (
          <line
            key={i}
            x1="100"
            y1="44"
            x2={fiber.x2}
            y2={fiber.y2}
            stroke="#fde68a"
            strokeOpacity={fiber.opacity}
            strokeWidth="0.45"
            strokeLinecap="round"
          />
        ))}
        <ellipse cx="100" cy="44" rx="7.5" ry="6.5" fill={`url(#${irisCore})`} opacity="0.55" className="phase-phoenix-iris-core" />
        <ellipse
          cx="100"
          cy="44"
          rx={IRIS_RING_RX - 1.8}
          ry={IRIS_RING_RY - 2}
          fill="none"
          stroke={MAGMA_SPECTRUM.magmaCore}
          strokeOpacity="0.16"
          strokeWidth="0.45"
          className="phase-phoenix-iris-inner-ring"
        />
        <ellipse
          cx="100"
          cy="44"
          rx={IRIS_RING_RX}
          ry={IRIS_RING_RY}
          fill="none"
          stroke={MAGMA_SPECTRUM.solarGold}
          strokeWidth="0.75"
          className="phase-phoenix-iris-ring"
        />
        <g className="phase-phoenix-pupil-group" filter={`url(#${pupilNeonFilter})`}>
          <ellipse
            cx="100"
            cy="44"
            rx="6.5"
            ry="12.5"
            fill={MAGMA_SPECTRUM.magmaCore}
            opacity="0.3"
            className="phase-phoenix-pupil-neon-halo"
          />
          <ellipse cx="100" cy="44" rx="2.2" ry="8.5" fill={`url(#${pupilGrad})`} className="phase-phoenix-pupil" />
          <ellipse cx="100" cy="44" rx="0.65" ry="3.8" fill="#ffffff" opacity="0.95" className="phase-phoenix-pupil-core" />
        </g>
      </g>

      <ellipse cx="112" cy="34" rx="4" ry="5.5" fill="#ffffff" fillOpacity="0.82" />
      <ellipse cx="106" cy="37" rx="1.8" ry="2.2" fill="#fde68a" fillOpacity="0.45" />

      <g className="phase-phoenix-lids">
        <path
          d="M26 38 Q100 14, 174 38"
          fill="none"
          stroke="#f97316"
          strokeOpacity="0.22"
          strokeWidth="2.4"
          strokeLinecap="round"
          filter={`url(#${lidNeonFilter})`}
          className="phase-phoenix-lid-upper-glow"
        />
        <path
          d="M32 52 Q100 68, 168 52"
          fill="none"
          stroke="#ea580c"
          strokeOpacity="0.16"
          strokeWidth="2"
          strokeLinecap="round"
          filter={`url(#${lidNeonFilter})`}
          className="phase-phoenix-lid-lower-glow"
        />
        <path
          d="M26 38 Q100 14, 174 38"
          fill="none"
          stroke="#f59e0b"
          strokeOpacity="0.55"
          strokeWidth="1.15"
          strokeLinecap="round"
          className="phase-phoenix-lid-upper"
        />
        <path
          d="M32 52 Q100 68, 168 52"
          fill="none"
          stroke="#ea580c"
          strokeOpacity="0.28"
          strokeWidth="0.85"
          strokeLinecap="round"
          className="phase-phoenix-lid-lower"
        />
      </g>
    </svg>
  );
}

function IrisPulseWaves({ act }: { act: TransmutationAct }) {
  if (act === "fade") return null;

  return (
    <div className={`phase-iris-waves phase-iris-waves--${act}`} aria-hidden="true">
      {Array.from({ length: IRIS_WAVE_COUNT }, (_, index) => (
        <span
          key={index}
          className="phase-iris-wave"
          style={{ "--wave-i": index } as CSSProperties}
        />
      ))}
    </div>
  );
}

function IrisFocalBloom({ act }: { act: TransmutationAct }) {
  const bloomClass =
    act === "pulse"
      ? "phase-iris-bloom-awaken"
      : act === "reveal" || act === "hold"
        ? "phase-iris-bloom-settle"
        : "phase-iris-bloom-fade";

  return <div className={`phase-iris-bloom ${bloomClass}`} aria-hidden="true" />;
}

function FlameEmber({ index }: { index: number }) {
  const spread = 92;
  const angle = -spread / 2 + (index / FLAME_EMBER_COUNT) * spread;
  const delay = 120 + index * 56;
  const distance = 52 + (index % 5) * 14;

  return (
    <span
      className="phase-flame-ember absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2"
      style={
        {
          "--ember-angle": `${angle}deg`,
          "--ember-delay": `${delay}ms`,
          "--ember-distance": `${distance}px`,
        } as CSSProperties
      }
      aria-hidden="true"
    />
  );
}

function PhoenixEyeStage({ act, phaseTier }: { act: TransmutationAct; phaseTier: PhaseTier }) {
  const eyeAnchor = act === "pulse" ? "awaken" : "open";
  const showEmbers = act === "reveal" || act === "hold";

  return (
    <div
      className="phase-phoenix-stage relative"
      data-act={act}
      data-tier={phaseTier}
      style={phaseIrisCssVars(phaseTier)}
    >
      <div className="phase-iris-field pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2">
        <IrisFocalBloom act={act} />
        <IrisPulseWaves act={act} />
      </div>

      <div className={`phase-phoenix-eye-anchor phase-phoenix-eye-anchor-${eyeAnchor}`}>
        <div
          className={`phase-eye-atmosphere pointer-events-none absolute inset-0 ${act !== "fade" ? "phase-eye-atmosphere-visible" : ""} ${act === "reveal" || act === "hold" ? "phase-eye-atmosphere-recede" : ""}`}
          aria-hidden="true"
        />
        <div className="phase-flame-core" aria-hidden="true">
          <PhoenixEyeNucleus act={act} />
        </div>
      </div>

      {showEmbers
        ? Array.from({ length: FLAME_EMBER_COUNT }, (_, index) => (
            <FlameEmber key={index} index={index} />
          ))
        : null}
    </div>
  );
}

export const PhaseTransmutation = memo(function PhaseTransmutation({
  phaseTier,
  onDismiss,
  subline = PHASE_TRANSMUTATION_SUBLINE,
  copy = PHASE_TRANSMUTATION_COPY,
  ariaLabel = "Transmutação da linhagem",
}: PhaseTransmutationProps) {
  const [act, setAct] = useState<TransmutationAct>("pulse");
  const [canSkip, setCanSkip] = useState(false);
  const dismissedRef = useRef(false);
  const tierLabel = PHASE_TIER_LABELS[phaseTier] ?? PHASE_TIER_LABELS[1];

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    const revealAt = PHASE_TRANSMUTATION_IRIS.awakenMs;
    const holdAt = revealAt + PHASE_TRANSMUTATION_REVEAL_MS;
    const fadeAt = holdAt + PHASE_TRANSMUTATION_HOLD_MS;

    const timers = [
      window.setTimeout(() => setAct("reveal"), revealAt),
      window.setTimeout(() => setAct("hold"), holdAt),
      window.setTimeout(() => setAct("fade"), fadeAt),
      window.setTimeout(() => dismiss(), PHASE_TRANSMUTATION_MS),
      window.setTimeout(() => setCanSkip(true), PHASE_TRANSMUTATION_SKIP_AFTER_MS),
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [dismiss]);

  const showCopy = act === "reveal" || act === "hold" || act === "fade";

  return (
    <div
      className={`phase-transmutation-screen fixed inset-0 z-[120] min-h-dvh w-full bg-black px-[max(1rem,env(safe-area-inset-left))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] ${act === "fade" ? "phase-transmutation-fading" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      data-act={act}
      data-tier={phaseTier}
      style={phaseIrisCssVars(phaseTier)}
    >
      <div className="phase-transmutation-vignette pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="phase-transmutation-iris-anchor pointer-events-none absolute inset-0">
        <div className="phase-phoenix-stage-wrap pointer-events-auto">
          <PhoenixEyeStage act={act} phaseTier={phaseTier} />
          <div className="phase-iris-genesis-flash-wrap" aria-hidden="true">
            <div className="phase-iris-genesis-flash" />
          </div>
        </div>
      </div>

      <div
        className={`phase-transmutation-copy-stack pointer-events-none absolute inset-x-0 z-[2] flex flex-col items-center gap-3 px-4 transition-opacity duration-[900ms] ease-out ${showCopy ? "opacity-100" : "opacity-0"}`}
      >
        <p
          className={`${PLASMA_TITLE} phase-transmutation-tier text-[clamp(1.75rem,8vw,3.25rem)] font-semibold tracking-[0.18em] sm:tracking-[0.24em]`}
        >
          {tierLabel}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-[0.38em] text-amber-500/75">
          {subline}
        </p>
        <p className="phase-transmutation-copy mt-2 max-w-2xl text-center font-serif text-[clamp(0.62rem,2.2vw,0.82rem)] font-semibold uppercase leading-relaxed tracking-[0.2em] text-amber-100/90 sm:tracking-[0.26em]">
          {copy}
        </p>
      </div>

      <div
        className="phase-transmutation-progress pointer-events-none absolute inset-x-[max(1.5rem,env(safe-area-inset-left))] bottom-[max(1rem,env(safe-area-inset-bottom))] h-px overflow-hidden rounded-full bg-white/5"
        aria-hidden="true"
      >
        <div className="phase-transmutation-progress-bar h-full origin-left bg-gradient-to-r from-orange-600/60 via-amber-400/80 to-amber-200/90" />
      </div>

      {canSkip ? (
        <button
          type="button"
          onClick={dismiss}
          className="absolute bottom-[max(2.25rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[3] rounded-full border border-orange-500/25 bg-black/60 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/80 backdrop-blur-sm transition hover:border-amber-400/40 hover:text-amber-50"
        >
          Continuar
        </button>
      ) : null}
    </div>
  );
});
