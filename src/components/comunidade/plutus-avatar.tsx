"use client";

import { useMemo } from "react";

/** IRIS · bordas concêntricas não misturadas */
export const IRIS_BORDER_CINTURAO = "#FF007F";
export const IRIS_BORDER_REI_CHAMAS = "#8B5CF6";
export const IRIS_BORDER_PILAR_COOP = "#FFD700";

export type PlutusAvatarProps = {
  name?: string | null;
  photoUrl?: string | null;
  temCinturaoDuelo?: boolean;
  isReiDasChamas?: boolean;
  isPilarCooperativo?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASS = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-20 w-20 sm:h-24 sm:w-24",
} as const;

function resolveInitials(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return "MF";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function buildConcentricShadow(
  cinturao: boolean,
  rei: boolean,
  pilar: boolean,
): string | undefined {
  const layers: string[] = [];
  if (cinturao) layers.push(`0 0 0 2px ${IRIS_BORDER_CINTURAO}`);
  if (rei) layers.push(`0 0 0 ${cinturao ? 4 : 2}px ${IRIS_BORDER_REI_CHAMAS}`);
  if (pilar) {
    const offset = (cinturao ? 2 : 0) + (rei ? 2 : 0) + 2;
    layers.push(`0 0 0 ${offset}px ${IRIS_BORDER_PILAR_COOP}`);
  }
  return layers.length ? layers.join(", ") : undefined;
}

export function PlutusAvatar({
  name,
  photoUrl,
  temCinturaoDuelo = false,
  isReiDasChamas = false,
  isPilarCooperativo = false,
  size = "md",
  className = "",
}: PlutusAvatarProps) {
  const initials = useMemo(() => resolveInitials(name), [name]);
  const ringStyle = useMemo(
    () =>
      buildConcentricShadow(temCinturaoDuelo, isReiDasChamas, isPilarCooperativo),
    [temCinturaoDuelo, isReiDasChamas, isPilarCooperativo],
  );
  const hasOuterGold = isPilarCooperativo;

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full ${className}`}
      aria-label="Avatar do atleta com títulos da comunidade"
    >
      <div
        className={`relative rounded-full p-[2px] transition-shadow duration-300 ${
          hasOuterGold ? "animate-[plutus-gold-pulse_2.4s_ease-in-out_infinite]" : ""
        }`}
        style={ringStyle ? { boxShadow: ringStyle } : undefined}
      >
        <div
          className={`relative overflow-hidden rounded-full bg-neutral-950 ${SIZE_CLASS[size]}`}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={name?.trim() ? `Foto de ${name.trim()}` : "Foto de perfil"}
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-950 to-amber-950/30">
              <span className="font-mono text-xs font-bold tracking-[0.1em] text-amber-100/90 sm:text-sm">
                {initials}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
