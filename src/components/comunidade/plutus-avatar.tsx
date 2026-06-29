"use client";

import { type ReactNode, useMemo } from "react";

/** IRIS · bordas concêntricas não misturadas */
export const IRIS_BORDER_CINTURAO = "#FF007F";
export const IRIS_BORDER_REI_CHAMAS = "#8B5CF6";
export const IRIS_BORDER_PILAR_COOP = "#FFD700";

export type PlutusProfileCardAccent = {
  borderColor: string;
  boxShadow: string;
  backgroundImage?: string;
};

export function resolvePlutusProfileCardAccent(input: {
  temCinturaoDuelo?: boolean;
  isReiDasChamas?: boolean;
  isReiChamasSuperiores?: boolean;
  isReiChamasInferiores?: boolean;
  isPilarCooperativo?: boolean;
}): PlutusProfileCardAccent {
  const hasCinturao = Boolean(input.temCinturaoDuelo);
  const hasRei =
    Boolean(input.isReiDasChamas) ||
    Boolean(input.isReiChamasSuperiores) ||
    Boolean(input.isReiChamasInferiores);
  const hasPilar = Boolean(input.isPilarCooperativo);
  const count = [hasCinturao, hasRei, hasPilar].filter(Boolean).length;

  if (count === 0) {
    return {
      borderColor: "rgba(245, 158, 11, 0.15)",
      boxShadow: "none",
    };
  }

  if (count >= 3) {
    return {
      borderColor: IRIS_BORDER_PILAR_COOP,
      boxShadow: `0 0 28px ${IRIS_BORDER_CINTURAO}44, 0 0 36px ${IRIS_BORDER_REI_CHAMAS}44, 0 0 44px ${IRIS_BORDER_PILAR_COOP}66`,
      backgroundImage: `linear-gradient(135deg, ${IRIS_BORDER_CINTURAO}10, ${IRIS_BORDER_REI_CHAMAS}10, ${IRIS_BORDER_PILAR_COOP}16)`,
    };
  }

  if (count === 1) {
    const color = hasCinturao
      ? IRIS_BORDER_CINTURAO
      : hasRei
        ? IRIS_BORDER_REI_CHAMAS
        : IRIS_BORDER_PILAR_COOP;
    return {
      borderColor: `${color}88`,
      boxShadow: `0 0 22px ${color}40`,
      backgroundImage: `linear-gradient(135deg, ${color}10, transparent)`,
    };
  }

  const colors: string[] = [];
  if (hasCinturao) colors.push(IRIS_BORDER_CINTURAO);
  if (hasRei) colors.push(IRIS_BORDER_REI_CHAMAS);
  if (hasPilar) colors.push(IRIS_BORDER_PILAR_COOP);

  return {
    borderColor: `${colors[colors.length - 1] ?? IRIS_BORDER_PILAR_COOP}77`,
    boxShadow: colors.map((color) => `0 0 18px ${color}35`).join(", "),
    backgroundImage: `linear-gradient(135deg, ${colors[0]}0C, ${colors[1] ?? colors[0]}0C)`,
  };
}

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
  sm: "h-9 w-9 xs:h-10 xs:w-10",
  md: "h-12 w-12 xs:h-14 xs:w-14",
  lg: "h-[4.5rem] w-[4.5rem] xs:h-20 xs:w-20 sm:h-24 sm:w-24",
} as const;

function resolveInitials(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return "MF";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function wrapRingLayers(content: ReactNode, ringColors: string[]): ReactNode {
  return ringColors.reduce<ReactNode>((node, color) => {
    return (
      <div
        className="rounded-full p-[2px] transition-shadow duration-300"
        style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}55` }}
      >
        {node}
      </div>
    );
  }, content);
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
  const ringColors = useMemo(() => {
    const layers: string[] = [];
    if (temCinturaoDuelo) layers.push(IRIS_BORDER_CINTURAO);
    if (isReiDasChamas) layers.push(IRIS_BORDER_REI_CHAMAS);
    if (isPilarCooperativo) layers.push(IRIS_BORDER_PILAR_COOP);
    return layers;
  }, [temCinturaoDuelo, isReiDasChamas, isPilarCooperativo]);

  const inner = (
    <div className={`relative overflow-hidden rounded-full bg-neutral-950 ${SIZE_CLASS[size]}`}>
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
  );

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full ${className} ${
        isPilarCooperativo ? "animate-[plutus-gold-pulse_2.4s_ease-in-out_infinite]" : ""
      }`}
      aria-label="Avatar do atleta com títulos da comunidade"
    >
      {wrapRingLayers(inner, ringColors)}
    </div>
  );
}
