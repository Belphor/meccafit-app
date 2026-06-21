"use client";

import { memo, useCallback } from "react";
import {
  FORJA_ATHLETE_CARD_BASE,
  FORJA_ATHLETE_CARD_IDLE,
  FORJA_ATHLETE_CARD_SELECTED,
} from "@/lib/forja-config";
import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";
import { resolveForjaAthleteCardRing, resolveForjaChipClass, resolveForjaThermalStyle } from "@/lib/forja-phase-styles";

type ForjaAthleteCardProps = {
  athlete: ForjaBondedAthlete;
  isSelected: boolean;
  onSelect: (clientId: string) => void;
};

function ForjaAthleteCardComponent({ athlete, isSelected, onSelect }: ForjaAthleteCardProps) {
  const thermal = resolveForjaThermalStyle(athlete.phaseTier);
  const ringClass = resolveForjaAthleteCardRing(athlete.phaseTier, isSelected);

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
        ringClass,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-100">{athlete.displayName}</p>
          {athlete.lineageName ? (
            <p className="mt-0.5 truncate text-xs text-zinc-500">{athlete.lineageName}</p>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium ${resolveForjaChipClass(athlete.phaseTier)}`}
        >
          {thermal.label}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-zinc-600">
        {athlete.hasVipBond ? (
          <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-zinc-400">VIP</span>
        ) : (
          <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-500">Comum</span>
        )}
        {athlete.forgerName ? <span>Personal · {athlete.forgerName}</span> : null}
      </div>
      {athlete.statusAltar && athlete.statusAltar.toLowerCase() !== "ativo" ? (
        <p className="mt-2 text-[10px] font-medium text-red-400/90">{athlete.statusAltar}</p>
      ) : null}
    </button>
  );
}

export const ForjaAthleteCard = memo(ForjaAthleteCardComponent);
