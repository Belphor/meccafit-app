"use client";

import { PlutusAvatar } from "@/components/comunidade/plutus-avatar";
import type { ComunidadeTitulos } from "@/lib/comunidade-data";

type MuralAuthorAvatarProps = ComunidadeTitulos & {
  authorName?: string | null;
  size?: "sm" | "md";
  className?: string;
};

export function MuralAuthorAvatar({
  authorName,
  temCinturaoDuelo = false,
  isReiDasChamas = false,
  isPilarCooperativo = false,
  size = "md",
  className = "",
}: MuralAuthorAvatarProps) {
  return (
    <PlutusAvatar
      name={authorName}
      temCinturaoDuelo={temCinturaoDuelo}
      isReiDasChamas={isReiDasChamas}
      isPilarCooperativo={isPilarCooperativo}
      size={size}
      className={className}
    />
  );
}
