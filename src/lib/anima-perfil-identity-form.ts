import type { ProfileSexo } from "@/lib/profile-identity";

export const PERFIL_IDENTITY_TOUR_INPUT_EVENT = "meccafit:perfil-identity-tour-input";

export type PerfilIdentityTourInputDetail = {
  displayName: string;
  sexo: ProfileSexo | null;
};

export type PerfilIdentityTourFormState = {
  hasName: boolean;
  hasGenero: boolean;
  displayName: string;
  sexo: ProfileSexo | null;
};

const NOME_MIN = 2;

export function readPerfilIdentityTourFormState(): PerfilIdentityTourFormState {
  if (typeof document === "undefined") {
    return { hasName: false, hasGenero: false, displayName: "", sexo: null };
  }

  const nameRoot = document.querySelector('[data-tour-target="perfil-nome"]');
  const nameInput = nameRoot?.querySelector("input");
  const displayName = nameInput instanceof HTMLInputElement ? nameInput.value.trim() : "";

  const generoRoot = document.querySelector('[data-tour-target="perfil-genero"]');
  const selectedGenero = generoRoot?.querySelector('[aria-pressed="true"]');
  const sexoValue = selectedGenero?.getAttribute("data-sexo");
  const sexo =
    sexoValue === "masculino" || sexoValue === "feminino" ? sexoValue : null;

  return {
    displayName,
    sexo,
    hasName: displayName.length >= NOME_MIN,
    hasGenero: Boolean(sexo),
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
