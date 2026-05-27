"use client";

import { type ReactNode } from "react";
import {
  FORUM_PHASE_ACTIVE_FILTER,
  FORUM_PHASE_INACTIVE_FILTER,
} from "@/features/forum-brasa-viva/forum-phase-styles";

type PhaseWrapperProps = {
  children: ReactNode;
  isInactive: boolean;
  isHydrated: boolean;
  className?: string;
};

/**
 * IRIS — aplica degradação de 70% (saturate 30%) apenas após hidratação (NEMESIS-safe).
 */
export function PhaseWrapper({
  children,
  isInactive,
  isHydrated,
  className = "",
}: PhaseWrapperProps) {
  const filterClass =
    isHydrated && isInactive ? FORUM_PHASE_INACTIVE_FILTER : FORUM_PHASE_ACTIVE_FILTER;

  return (
    <div
      className={`forum-phase-wrapper relative ${filterClass} ${className}`.trim()}
      data-forum-phase-inactive={isHydrated && isInactive ? "true" : undefined}
      data-forum-phase-hydrated={isHydrated ? "true" : undefined}
    >
      {children}
    </div>
  );
}
