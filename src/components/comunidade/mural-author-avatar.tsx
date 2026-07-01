"use client";

import { PlutusAvatar } from "@/components/comunidade/plutus-avatar";
import type { ComunidadeTitulos } from "@/lib/comunidade-data";

import type { ComunidadePhotoResolver } from "@/lib/comunidade-avatar";

type MuralAuthorAvatarProps = ComunidadeTitulos & {
  authorName?: string | null;
  authorId?: string;
  authorAvatarPath?: string | null;
  resolvePhotoUrl?: ComunidadePhotoResolver;
  size?: "sm" | "md";
  className?: string;
};

export function MuralAuthorAvatar({
  authorName,
  authorId,
  authorAvatarPath,
  resolvePhotoUrl,
  temCinturaoDuelo = false,
  isReiDasChamas = false,
  isPilarCooperativo = false,
  size = "md",
  className = "",
}: MuralAuthorAvatarProps) {
  return (
    <PlutusAvatar
      name={authorName}
      photoUrl={authorId ? resolvePhotoUrl?.(authorId, authorAvatarPath) : null}
      temCinturaoDuelo={temCinturaoDuelo}
      isReiDasChamas={isReiDasChamas}
      isPilarCooperativo={isPilarCooperativo}
      size={size}
      className={className}
    />
  );
}
