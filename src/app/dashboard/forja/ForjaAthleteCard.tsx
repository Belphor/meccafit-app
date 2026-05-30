"use client";

import { memo, useCallback } from "react";
import {
  FORJA_ATHLETE_CARD_BASE,
  FORJA_ATHLETE_CARD_IDLE,
  FORJA_ATHLETE_CARD_SELECTED,
} from "@/lib/forja-config";
import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";
import { resolveForjaThermalStyle } from "@/lib/forja-phase-styles";

type ForjaAthleteCardProps = {
  athlete: ForjaBondedAthlete;
  isSelected: boolean;
  onSelect: (clientId: string) => void;
};

function ForjaAthleteCardComponent({ athlete, isSelected, onSelect }: ForjaAthleteCardProps) {
  const thermal = resolveForjaThermalStyle(athlete.phaseTier);

  const handleClick = useCallback(() => {
    onSelect(athlete.clientId);
  }, [athlete.clientId, onSelect]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isSelected}
      aria-label={`Selecionar ${athlete.displayName}`}
      className={[
        FORJA_ATHLETE_CARD_BASE,
        isSelected ? FORJA_ATHLETE_CARD_SELECTED : FORJA_ATHLETE_CARD_IDLE,
        isSelected ? thermal.selectedRing : thermal.pulseRing,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-sm text-zinc-100">{athlete.displayName}</p>
          {athlete.lineageName ? (
            <p className="mt-0.5 truncate text-[11px] text-zinc-500">{athlete.lineageName}</p>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] ${thermal.chipClass}`}
        >
          {thermal.label}
        </span>
      </div>
      {athlete.forgerName ? (
        <p className="mt-2 truncate text-[10px] uppercase tracking-[0.16em] text-zinc-600">
          Personal · {athlete.forgerName}
        </p>
      ) : null}
    </button>
  );
}

export const ForjaAthleteCard = memo(ForjaAthleteCardComponent);
