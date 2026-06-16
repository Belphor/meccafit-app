"use client";

import { type ReactNode } from "react";
import {
  THERMAL_ACTIVE_FILTER,
  THERMAL_INACTIVE_FILTER,
} from "@/lib/evolution-thermal-styles";

type PhaseWrapperProps = {
  children: ReactNode;
  isInactive: boolean;
  isHydrated: boolean;
  className?: string;
};

/** Degradação visual quando gravidade térmica está activa (layout em cinzas). */
export function PhaseWrapper({
  children,
  isInactive,
  isHydrated,
  className = "",
}: PhaseWrapperProps) {
  const filterClass =
    isHydrated && isInactive ? THERMAL_INACTIVE_FILTER : THERMAL_ACTIVE_FILTER;

  return (
    <div
      className={`relative ${filterClass} ${className}`.trim()}
      data-thermal-inactive={isHydrated && isInactive ? "true" : undefined}
    >
      {children}
    </div>
  );
};
