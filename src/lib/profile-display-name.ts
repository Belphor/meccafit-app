import { ANYMA_NAME_FALLBACK } from "@/lib/anyma-copy";
import { supabase } from "@/lib/supabase";

const DISPLAY_NAME_PREFIX = "meccafit:profile-display-name:";

export { ANYMA_NAME_FALLBACK };

/** @deprecated Use ANYMA_NAME_FALLBACK — marca canônica é ANYMA. */
export const ANIMA_NAME_FALLBACK = ANYMA_NAME_FALLBACK;

/** Primeiro nome de profiles.full_name — usado pela ANYMA FÊNIX (TTS e cards). */
export function resolveProfileFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  return trimmed.length > 0 ? trimmed.split(/\s+/)[0] ?? trimmed : ANYMA_NAME_FALLBACK;
}

/** Substitui [Nome] pelo primeiro nome. Sem nome, usa Nova Chama. */
export function injectName(text: string, fullName: string): string {
  return text.replaceAll("[Nome]", resolveProfileFirstName(fullName));
}

/**
 * Mesma regra da voz e dos cards: [Nome] vira o primeiro nome ou Nova Chama.
 * Mantém TTS e texto escrito sempre iguais.
 */
export function injectRegisteredName(text: string, fullName: string): string {
  return injectName(text, fullName);
}

export function readLocalProfileDisplayName(userId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${DISPLAY_NAME_PREFIX}${userId}`);
    const trimmed = raw?.trim();
    return trimmed ? trimmed : null;
  } catch {
    return null;
  }
}

export function writeLocalProfileDisplayName(userId: string, name: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = name.trim();
    if (!trimmed) {
      window.localStorage.removeItem(`${DISPLAY_NAME_PREFIX}${userId}`);
      return;
    }
    window.localStorage.setItem(`${DISPLAY_NAME_PREFIX}${userId}`, trimmed);
  } catch {
    // quota / private mode
  }
}

export const PROFILE_DISPLAY_NAME_UPDATED_EVENT = "meccafit:profile-display-name-updated";

export function notifyProfileDisplayNameUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PROFILE_DISPLAY_NAME_UPDATED_EVENT));
}

let syncInFlight: Promise<void> | null = null;
let lastSyncedName = "";

/** Propaga nome para o servidor (duelos, rankings) — debounce no chamador. */
export async function syncProfileDisplayNameToServer(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return null;
  if (trimmed === lastSyncedName) return trimmed;

  if (syncInFlight) {
    await syncInFlight;
    if (trimmed === lastSyncedName) return trimmed;
  }

  syncInFlight = (async () => {
    const { data, error } = await supabase.rpc("client_update_display_name", {
      p_full_name: trimmed,
    });

    if (error) {
      if (error.code === "PGRST202") return;
      throw new Error(error.message);
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) return;

    const row = data as Record<string, unknown>;
    if (row.error) {
      const message =
        typeof row.message === "string" ? row.message : "Não foi possível atualizar o nome.";
      throw new Error(message);
    }

    if (row.ok) {
      lastSyncedName = trimmed;
    }
  })();

  try {
    await syncInFlight;
    return trimmed;
  } finally {
    syncInFlight = null;
  }
}
