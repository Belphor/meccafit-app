"use client";

import { useMemo } from "react";

export type PlutusAvatarProps = {
  name?: string | null;
  photoUrl?: string | null;
  detemCinturaoDuelo?: boolean;
  isPilarFogoCosmico?: boolean;
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

export function PlutusAvatar({
  name,
  photoUrl,
  detemCinturaoDuelo = false,
  isPilarFogoCosmico = false,
  size = "md",
  className = "",
}: PlutusAvatarProps) {
  const initials = useMemo(() => resolveInitials(name), [name]);
  const hasCinturao = detemCinturaoDuelo;
  const hasPilar = isPilarFogoCosmico;
  const dualRing = hasCinturao && hasPilar;

  const ringStyle = useMemo(() => {
    if (!dualRing) {
      if (hasCinturao) {
        return { boxShadow: "0 0 0 2px #FF007F" };
      }
      if (hasPilar) {
        return { boxShadow: "0 0 0 2px #FFD700" };
      }
      return undefined;
    }
    return {
      boxShadow: "0 0 0 2px #FF007F, 0 0 0 5px #FFD700",
    };
  }, [dualRing, hasCinturao, hasPilar]);

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full ${className}`}
      aria-label={
        dualRing
          ? "Avatar com cinturão de duelo e pilar fogo cósmico"
          : hasCinturao
            ? "Avatar com cinturão de duelo"
            : hasPilar
              ? "Avatar pilar fogo cósmico"
              : "Avatar do atleta"
      }
    >
      <div
        className={`relative rounded-full p-[2px] transition-shadow duration-300 ${
          hasPilar && !dualRing ? "animate-pulse" : ""
        } ${dualRing ? "animate-[plutus-gold-pulse_2.4s_ease-in-out_infinite]" : ""}`}
        style={ringStyle}
      >
        <div
          className={`relative overflow-hidden rounded-full bg-neutral-950 ${SIZE_CLASS[size]}`}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob/capacitor/local
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
