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

/** Placeholder do map de perfil — não é nome real para a ANYMA. */
const SERVER_NAME_PLACEHOLDER = "Membro da Linhagem";

function normalizeServerDisplayName(serverName: string | null | undefined): string {
  const trimmed = serverName?.trim() ?? "";
  if (!trimmed || trimmed === SERVER_NAME_PLACEHOLDER) return "";
  return trimmed;
}

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

/**
 * Nome para UI e voz da ANYMA: localStorage (selo) → full_name do servidor.
 * Derivado no render para não armar "Bem-vindo, Nova Chama" antes do perfil carregar.
 */
export function useResolvedProfileName(
  userId: string | undefined,
  serverName: string | null | undefined,
): string {
  const normalizedServer = normalizeServerDisplayName(serverName);
  const [localName, setLocalName] = useState<string | null>(() => {
    if (!userId || typeof window === "undefined") return null;
    return readLocalProfileDisplayName(userId);
  });

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalName(null);
      return;
    }

    const refresh = () => {
      setLocalName(readLocalProfileDisplayName(userId));
    };

    // Sincroniza o nome local (selo) com o localStorage do dispositivo — leitura client-only.
    refresh();
    window.addEventListener(PROFILE_DISPLAY_NAME_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(PROFILE_DISPLAY_NAME_UPDATED_EVENT, refresh);
  }, [userId]);

  if (!userId) return normalizedServer;
  return localName?.trim() || normalizedServer;
}
