import type { ProfileSexo } from "@/lib/profile-identity";

export const PERFIL_IDENTITY_TOUR_INPUT_EVENT = "meccafit:perfil-identity-tour-input";
export const PERFIL_IDENTITY_FIELD_UNLOCK_EVENT = "meccafit:perfil-identity-field-unlock";
export const PERFIL_IDENTITY_CONFIRM_REQUEST_EVENT = "meccafit:perfil-identity-confirm-request";

export type PerfilIdentityFieldId = "nome" | "genero" | "foto" | "confirmar";

export type PerfilIdentityTourInputDetail = {
  displayName: string;
  sexo: ProfileSexo | null;
  hasPhoto?: boolean;
};

export type PerfilIdentityTourFormState = {
  hasName: boolean;
  hasGenero: boolean;
  hasPhoto: boolean;
  displayName: string;
  sexo: ProfileSexo | null;
};

export type PerfilIdentityFieldUnlockDetail = {
  field: PerfilIdentityFieldId;
};

const NOME_MIN = 2;
const UNLOCK_STORAGE_KEY = "meccafit:perfil-identity-unlocked-fields";

const FIELD_ORDER: readonly PerfilIdentityFieldId[] = [
  "nome",
  "genero",
  "foto",
  "confirmar",
];

function loadUnlockedFields(): Set<PerfilIdentityFieldId> {
  const fields = new Set<PerfilIdentityFieldId>();
  if (typeof window === "undefined") return fields;
  try {
    const raw = window.sessionStorage.getItem(UNLOCK_STORAGE_KEY);
    if (!raw) return fields;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fields;
    for (const item of parsed) {
      if (item === "nome" || item === "genero" || item === "foto" || item === "confirmar") {
        fields.add(item);
      }
    }
  } catch {
    // private mode / quota
  }
  return fields;
}

function persistUnlockedFields(fields: Set<PerfilIdentityFieldId>): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(UNLOCK_STORAGE_KEY, JSON.stringify([...fields]));
  } catch {
    // private mode / quota
  }
}

let unlockedFields = new Set<PerfilIdentityFieldId>();
let unlockHydrated = false;

function ensureUnlockHydrated(): void {
  if (unlockHydrated || typeof window === "undefined") return;
  unlockedFields = loadUnlockedFields();
  unlockHydrated = true;
}

export function readUnlockedPerfilIdentityFields(): ReadonlySet<PerfilIdentityFieldId> {
  ensureUnlockHydrated();
  return new Set(unlockedFields);
}

export function isPerfilIdentityFieldUnlocked(field: PerfilIdentityFieldId): boolean {
  ensureUnlockHydrated();
  return unlockedFields.has(field);
}

function dispatchUnlockEvent(field: PerfilIdentityFieldId): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PerfilIdentityFieldUnlockDetail>(PERFIL_IDENTITY_FIELD_UNLOCK_EVENT, {
      detail: { field },
    }),
  );
}

/** Desbloqueia somente o campo indicado (sem cascata). */
export function publishPerfilIdentityFieldUnlock(field: PerfilIdentityFieldId): void {
  if (typeof window === "undefined") return;
  ensureUnlockHydrated();

  if (!FIELD_ORDER.includes(field)) return;

  if (!unlockedFields.has(field)) {
    unlockedFields.add(field);
    persistUnlockedFields(unlockedFields);
  }

  dispatchUnlockEvent(field);
}

/**
 * Relocka o campo e todos os posteriores.
 * Usado ao entrar na explicação de um passo para garantir que só libera depois.
 */
export function revokePerfilIdentityFieldsFrom(field: PerfilIdentityFieldId): void {
  if (typeof window === "undefined") return;
  ensureUnlockHydrated();

  const index = FIELD_ORDER.indexOf(field);
  if (index < 0) return;

  let changed = false;
  for (let i = index; i < FIELD_ORDER.length; i += 1) {
    const next = FIELD_ORDER[i];
    if (unlockedFields.has(next)) {
      unlockedFields.delete(next);
      changed = true;
    }
  }

  if (!changed) return;
  persistUnlockedFields(unlockedFields);
  dispatchUnlockEvent(field);
}

/** Índice do primeiro passo ainda não liberado (retomada do guia). */
export function resolvePerfilIdentityGuideBeatIndex(): number {
  ensureUnlockHydrated();
  if (!unlockedFields.has("nome")) return 0;
  if (!unlockedFields.has("genero")) return 1;
  if (!unlockedFields.has("foto")) return 2;
  return 3;
}

export function clearPerfilIdentityFieldUnlocks(): void {
  ensureUnlockHydrated();
  unlockedFields = new Set();
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(UNLOCK_STORAGE_KEY);
    } catch {
      // private mode / quota
    }
    dispatchUnlockEvent("nome");
  }
}

export function unlockAllPerfilIdentityFields(): void {
  ensureUnlockHydrated();
  for (const field of FIELD_ORDER) {
    unlockedFields.add(field);
  }
  persistUnlockedFields(unlockedFields);
  dispatchUnlockEvent("confirmar");
}

export function readPerfilIdentityTourFormState(): PerfilIdentityTourFormState {
  if (typeof document === "undefined") {
    return { hasName: false, hasGenero: false, hasPhoto: false, displayName: "", sexo: null };
  }

  const nameRoot = document.querySelector('[data-tour-target="perfil-nome"]');
  const nameInput = nameRoot?.querySelector("input");
  const displayName = nameInput instanceof HTMLInputElement ? nameInput.value.trim() : "";

  const generoRoot = document.querySelector('[data-tour-target="perfil-genero"]');
  const selectedGenero = generoRoot?.querySelector('[aria-pressed="true"]');
  const sexoValue = selectedGenero?.getAttribute("data-sexo");
  const sexo =
    sexoValue === "masculino" || sexoValue === "feminino" ? sexoValue : null;

  const fotoRoot = document.querySelector('[data-tour-target="perfil-foto"]');
  const hasPhoto = fotoRoot?.getAttribute("data-foto-pronta") === "true";

  return {
    displayName,
    sexo,
    hasName: displayName.length >= NOME_MIN,
    hasGenero: Boolean(sexo),
    hasPhoto,
  };
}

export function publishPerfilIdentityTourInput(detail: PerfilIdentityTourInputDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PerfilIdentityTourInputDetail>(PERFIL_IDENTITY_TOUR_INPUT_EVENT, {
      detail,
    }),
  );
}

/** Pedido do card da ANYMA para selar identidade no botão real do Perfil. */
export function publishPerfilIdentityConfirmRequest(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PERFIL_IDENTITY_CONFIRM_REQUEST_EVENT));
}

export function resolveFieldIdFromBeatId(beatId: string): PerfilIdentityFieldId | null {
  if (beatId === "perfil-nome") return "nome";
  if (beatId === "perfil-genero") return "genero";
  if (beatId === "perfil-foto") return "foto";
  if (beatId === "perfil-confirmar") return "confirmar";
  return null;
}
