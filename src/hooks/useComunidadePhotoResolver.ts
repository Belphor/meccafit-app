"use client";

import { useCallback, useMemo } from "react";
import type { RankingsThoth } from "@/lib/comunidade-data";
import {
  collectAvatarPathsFromRankings,
  resolveComunidadePhotoUrl,
  type ComunidadePhotoResolver,
} from "@/lib/comunidade-avatar";

export function useComunidadePhotoResolver(
  userId: string,
  selfLocalPhotoUrl?: string | null,
  rankings?: RankingsThoth | null,
): ComunidadePhotoResolver {
  const pathByAtletaId = useMemo(
    () => collectAvatarPathsFromRankings(rankings),
    [rankings],
  );

  return useCallback(
    (atletaId: string, serverPath?: string | null) =>
      resolveComunidadePhotoUrl({
        atletaId,
        selfUserId: userId,
        selfLocalPhotoUrl,
        serverPath,
        pathByAtletaId,
      }),
    [pathByAtletaId, selfLocalPhotoUrl, userId],
  );
}

export type { ComunidadePhotoResolver };
