"use client";

import { memo, useEffect, useState } from "react";
import { THERMAL_GRAVITY_RESTORATION_FLASH_MS } from "@/lib/dashboard-config";

type ThermalGravityRestorationFlashProps = {
  active: boolean;
  onComplete: () => void;
};

export const ThermalGravityRestorationFlash = memo(function ThermalGravityRestorationFlash({
  active,
  onComplete,
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
      className="thermal-gravity-restoration-flash pointer-events-none fixed inset-0 z-[90]"
      aria-hidden
      role="presentation"
    >
      <div className="thermal-gravity-restoration-flash__core" />
      <div className="thermal-gravity-restoration-flash__ring" />
      <div className="thermal-gravity-restoration-flash__embers" />
    </div>
  );
});
