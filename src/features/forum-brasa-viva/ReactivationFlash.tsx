"use client";

import { memo, useEffect, useRef, useState } from "react";
import { THERMAL_GRAVITY_RESTORATION_FLASH_MS } from "@/lib/dashboard-config";
import { emitChronosEvent } from "@/lib/chronos-telemetry";

type ReactivationFlashProps = {
  active: boolean;
  userId: string;
  sessionVtcKg: number;
  phaseLayout: string;
  onComplete: () => void;
};

/**
 * IRIS — flash de reativação de exatamente 1,4s; limpa filtro grayscale do PhaseWrapper.
 */
export const ReactivationFlash = memo(function ReactivationFlash({
  active,
  userId,
  sessionVtcKg,
  phaseLayout,
  onComplete,
}: ReactivationFlashProps) {
  const [visible, setVisible] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      firedRef.current = false;
      return;
    }
    if (firedRef.current) return;
    firedRef.current = true;

    setVisible(true);
    emitChronosEvent({
      type: "reactivation_flash",
      at: new Date().toISOString(),
      userId,
      durationMs: THERMAL_GRAVITY_RESTORATION_FLASH_MS,
      sessionVtcKg,
      phaseLayout,
    });

    const timer = window.setTimeout(() => {
      setVisible(false);
      onComplete();
    }, THERMAL_GRAVITY_RESTORATION_FLASH_MS);

    return () => window.clearTimeout(timer);
  }, [active, onComplete, phaseLayout, sessionVtcKg, userId]);

  if (!visible) return null;

  return (
    <div
      className="forum-reactivation-flash pointer-events-none fixed inset-0 z-[88]"
      aria-hidden
      role="presentation"
      data-duration-ms={THERMAL_GRAVITY_RESTORATION_FLASH_MS}
    >
      <div className="forum-reactivation-flash__core" />
      <div className="forum-reactivation-flash__ring" />
      <div className="forum-reactivation-flash__embers" />
    </div>
  );
});
