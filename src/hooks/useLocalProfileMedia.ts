"use client";

import { useEffect, useState } from "react";
import {
  EVOLUTION_AVATAR_UPDATED_EVENT,
  getLocalAvatarPath,
  type EvolutionAvatarUpdatedDetail,
} from "@/services/local-storage";
import {
  PROFILE_DISPLAY_NAME_UPDATED_EVENT,
  readLocalProfileDisplayName,
} from "@/lib/profile-display-name";

export function useLocalProfileAvatar(userId: string | undefined): string | null {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const refresh = async () => {
      const path = await getLocalAvatarPath(userId);
      if (!cancelled) setPhotoUrl(path);
    };

    void refresh();

    const onAvatarUpdated = (event: Event) => {
      const detail = (event as CustomEvent<EvolutionAvatarUpdatedDetail>).detail;
      if (detail?.userId && detail.userId !== userId) return;
      void refresh();
    };

    window.addEventListener(EVOLUTION_AVATAR_UPDATED_EVENT, onAvatarUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(EVOLUTION_AVATAR_UPDATED_EVENT, onAvatarUpdated);
    };
  }, [userId]);

  return userId ? photoUrl : null;
}

export function useResolvedProfileName(
  userId: string | undefined,
  serverName: string | null | undefined,
): string {
  const [name, setName] = useState(() => {
    if (!userId) return serverName?.trim() ?? "";
    return readLocalProfileDisplayName(userId) ?? serverName?.trim() ?? "";
  });

  useEffect(() => {
    if (!userId) return;

    const refresh = () => {
      setName(readLocalProfileDisplayName(userId) ?? serverName?.trim() ?? "");
    };

    window.addEventListener(PROFILE_DISPLAY_NAME_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(PROFILE_DISPLAY_NAME_UPDATED_EVENT, refresh);
  }, [serverName, userId]);

  return userId ? name : serverName?.trim() ?? "";
}
