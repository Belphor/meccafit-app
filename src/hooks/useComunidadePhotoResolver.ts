"use client";

import { useCallback } from "react";
import { resolveLocalComunidadePhotoUrl } from "@/lib/comunidade-avatar";

/** Resolve foto local apenas para o atleta logado (custo zero · sem Supabase Storage). */
export function useComunidadePhotoResolver(
  userId: string,
  selfLocalPhotoUrl?: string | null,
) {
  return useCallback(
    (atletaId: string) =>
      resolveLocalComunidadePhotoUrl({
        atletaId,
        selfUserId: userId,
        selfLocalPhotoUrl,
      }),
    [selfLocalPhotoUrl, userId],
  );
}
