"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CardioIgnitionBar } from "@/components/dashboard/CardioIgnitionBar";
import type { CardioThermalBand } from "@/lib/cardio-voo-cinzas";
import { EXERCISE_VIDEO_BUTTON } from "@/lib/dashboard-config";

type HermeticFocusOverlayProps = {
  percent: number;
  band: CardioThermalBand;
  thermalLabel: string;
  validatedLabel: string;
  goalLabel: string;
  onExit: () => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  showPrimaryAction: boolean;
};

const RING_RADIUS = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function HermeticIgnitionRing({
  percent,
  band,
}: {
  percent: number;
  band: CardioThermalBand;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const strokeOffset = RING_CIRCUMFERENCE - (clamped / 100) * RING_CIRCUMFERENCE;
  const strokeClass =
    band === "elite"
      ? "hermetic-focus-ring-stroke-elite"
      : band === "active"
        ? "hermetic-focus-ring-stroke-active"
        : "hermetic-focus-ring-stroke-latent";

  return (
    <div className="hermetic-focus-ring">
      <div className={`hermetic-focus-ring-halo hermetic-focus-ring-halo--${band}`} aria-hidden="true" />
      <svg viewBox="0 0 120 120" className="hermetic-focus-ring-svg" aria-hidden="true">
        <circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          className="hermetic-focus-ring-track"
          fill="none"
          strokeWidth="5"
        />
        <circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          className={`hermetic-focus-ring-stroke ${strokeClass}`}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={strokeOffset}
        />
      </svg>
      <p
        className={`hermetic-focus-ring-value font-mono tabular-nums ${
          band === "elite" ? "text-[#FFD700]/95" : "text-amber-50"
        }`}
        aria-live="polite"
      >
        {clamped}
        <span className="text-[0.45em] font-normal text-amber-200/70">%</span>
      </p>
    </div>
  );
}

function useHermeticBodyLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const scrollY = window.scrollY;
    const bodyStyle = document.body.style;
    const previous = {
      position: bodyStyle.position,
      top: bodyStyle.top,
      left: bodyStyle.left,
      right: bodyStyle.right,
      width: bodyStyle.width,
      overflow: bodyStyle.overflow,
    };

    bodyStyle.position = "fixed";
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.left = "0";
    bodyStyle.right = "0";
    bodyStyle.width = "100%";
    bodyStyle.overflow = "hidden";

    return () => {
      bodyStyle.position = previous.position;
      bodyStyle.top = previous.top;
      bodyStyle.left = previous.left;
      bodyStyle.right = previous.right;
      bodyStyle.width = previous.width;
      bodyStyle.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}

function subscribeNoop() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function HermeticFocusOverlay({
  percent,
  band,
  thermalLabel,
  validatedLabel,
  goalLabel,
  onExit,
  onPrimaryAction,
  primaryActionLabel,
  showPrimaryAction,
}: HermeticFocusOverlayProps) {
  const mounted = useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);

  useHermeticBodyLock(true);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onExit();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onExit]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`hermetic-focus-screen hermetic-focus-screen--${band}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Foco Hermético · ${thermalLabel}`}
    >
      <div className="hermetic-focus-ambient" aria-hidden="true" />
      <div className="hermetic-focus-ash-field" aria-hidden="true" />
      <div className="hermetic-focus-vignette" aria-hidden="true" />
      <div className="hermetic-focus-rim" aria-hidden="true" />

      <header className="hermetic-focus-header">
        <span className="w-[4.5rem]" aria-hidden="true" />
        <button
          type="button"
          onClick={onExit}
          className="hermetic-focus-exit"
        >
          Sair · Esc
        </button>
      </header>

      <main className="hermetic-focus-main">
        <div className="hermetic-focus-stage">
          <h1 className="hermetic-focus-title">Foco Hermético</h1>
          <div className="hermetic-focus-divider" aria-hidden="true" />
          <span className={`hermetic-focus-thermal hermetic-focus-thermal--${band}`}>
            {thermalLabel}
          </span>

          <div className="hermetic-focus-ring-wrap">
            <HermeticIgnitionRing percent={percent} band={band} />
          </div>

          <CardioIgnitionBar
            percent={percent}
            band={band}
            emphasized
            calm
            className="hermetic-focus-bar w-full max-w-sm"
          />

          <div className="hermetic-focus-metrics">
            <p className="hermetic-focus-metrics-primary">{validatedLabel}</p>
            <p className="hermetic-focus-metrics-secondary">Meta {goalLabel}</p>
          </div>

          {band === "active" ? (
            <p className="hermetic-focus-hint">Matéria térmica em carga</p>
          ) : null}
        </div>
      </main>

      <footer className="hermetic-focus-footer">
        {showPrimaryAction && onPrimaryAction && primaryActionLabel ? (
          <button
            type="button"
            onClick={onPrimaryAction}
            className={`${EXERCISE_VIDEO_BUTTON} mx-auto w-full max-w-sm justify-center py-3`}
          >
            {primaryActionLabel}
          </button>
        ) : null}
      </footer>
    </div>,
    document.body,
  );
}
