"use client";

import { memo, useEffect, useState } from "react";
import { THERMAL_GRAVITY_RESTORATION_FLASH_MS } from "@/lib/dashboard-config";

type ThermalGravityRestorationFlashProps = {
  active: boolean;
  onComplete: () => void;
  /** Destaque para testes QA */
  prominent?: boolean;
};

export const ThermalGravityRestorationFlash = memo(function ThermalGravityRestorationFlash({
  active,
  onComplete,
  prominent = false,
}: ThermalGravityRestorationFlashProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) return;

    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      onComplete();
    }, THERMAL_GRAVITY_RESTORATION_FLASH_MS);

    return () => window.clearTimeout(timer);
  }, [active, onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`thermal-gravity-restoration-flash fixed inset-0 z-[125] ${
        prominent ? "bg-black/75" : "bg-black/35"
      }`}
      role="status"
      aria-live="assertive"
      aria-label="Restauração térmica — fase reativada"
    >
      <div className="thermal-gravity-restoration-flash__core" />
      <div className="thermal-gravity-restoration-flash__ring" />
      <div className="thermal-gravity-restoration-flash__embers" />
      {prominent ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] text-center text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/90">
          Restauração térmica
        </p>
      ) : null}
    </div>
  );
});
