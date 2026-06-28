"use client";

import { memo, useCallback } from "react";
import {
  FORJA_ATHLETE_CARD_BASE,
  FORJA_ATHLETE_CARD_COMUM,
  FORJA_ATHLETE_CARD_COMUM_SELECTED,
  FORJA_ATHLETE_CARD_VIP,
  FORJA_ATHLETE_CARD_VIP_SELECTED,
  FORJA_COMUM_BADGE,
  FORJA_VIP_BADGE,
} from "@/lib/forja-config";
import { FORJA_COPY } from "@/lib/forja-copy";
import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";
import { resolveForjaAthleteCardRing, resolveForjaChipClass, resolveForjaThermalStyle } from "@/lib/forja-phase-styles";

type ForjaAthleteCardProps = {
  athlete: ForjaBondedAthlete;
  isSelected: boolean;
  onSelect: (clientId: string) => void;
  /** Destaque visual para clientes VIP (painel exclusivo). */
  vipHighlight?: boolean;
};

function formatBondDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function ForjaAthleteCardComponent({
  athlete,
  isSelected,
  onSelect,
  vipHighlight = false,
}: ForjaAthleteCardProps) {
  const thermal = resolveForjaThermalStyle(athlete.phaseTier);
  const ringClass = resolveForjaAthleteCardRing(athlete.phaseTier, isSelected);
  const isVip = vipHighlight || athlete.hasVipBond;

  const handleClick = useCallback(() => {
    onSelect(athlete.clientId);
  }, [athlete.clientId, onSelect]);

  const surfaceClass = isVip
    ? isSelected
      ? FORJA_ATHLETE_CARD_VIP_SELECTED
      : FORJA_ATHLETE_CARD_VIP
    : isSelected
      ? FORJA_ATHLETE_CARD_COMUM_SELECTED
      : FORJA_ATHLETE_CARD_COMUM;

  const vtcLabel =
    typeof athlete.vtcToday === "number" && athlete.vtcToday > 0
      ? `${Math.round(athlete.vtcToday)} kg`
      : null;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isSelected}
      aria-label={`Selecionar ${athlete.displayName}`}
      className={[
        FORJA_ATHLETE_CARD_BASE,
        surfaceClass,
        ringClass,
        isVip
          ? "shadow-[inset_0_1px_0_rgba(251,191,36,0.08)]"
          : "shadow-[inset_0_1px_0_rgba(148,163,184,0.05)]",
        isVip
          ? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
          : "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/35",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={`truncate text-sm font-medium ${
              isVip ? "text-amber-50" : isSelected ? "text-zinc-50" : "text-zinc-200"
            }`}
          >
            {athlete.displayName}
          </p>
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

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
        {isVip ? (
          <span className={FORJA_VIP_BADGE}>{FORJA_COPY.athleteVipBadge}</span>
        ) : (
          <span className={FORJA_COMUM_BADGE}>{FORJA_COPY.athleteStandardBadge}</span>
        )}

        {athlete.forgerName ? (
          <span
            className={`rounded-md border px-1.5 py-0.5 ${
              isVip
                ? "border-zinc-800/80 bg-black/30 text-zinc-400"
                : "border-slate-800/80 bg-slate-950/40 text-slate-400"
            }`}
          >
            Personal · {athlete.forgerName}
          </span>
        ) : !isVip ? (
          <span className="text-zinc-600">Sem personal</span>
        ) : null}

        {vtcLabel ? (
          <span
            className={`tabular-nums font-medium ${
              isVip ? "text-amber-200/75" : "text-slate-400"
            }`}
          >
            VTC {vtcLabel}
          </span>
        ) : null}
      </div>

      {isVip && athlete.bondedAt ? (
        <p className="mt-2 text-[10px] text-emerald-400/75">
          Acompanhamento desde {formatBondDate(athlete.bondedAt)}
        </p>
      ) : !isVip && athlete.isGlobalListing === false ? (
        <p className="mt-2 text-[10px] text-slate-500">Plano da academia</p>
      ) : null}

      {athlete.statusAltar && athlete.statusAltar.toLowerCase() !== "ativo" ? (
        <p className="mt-2 text-[10px] font-medium text-red-400/90">{athlete.statusAltar}</p>
      ) : null}
    </button>
  );
}

export const ForjaAthleteCard = memo(ForjaAthleteCardComponent);
