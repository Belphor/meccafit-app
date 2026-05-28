import { PORTAL_COPY } from "@/lib/portal-copy";

export const ONBOARDING_PASSWORD_MIN = 8;

export type PrimeiroAcessoInput = {
  email: string;
  password: string;
  fullName: string;
  birthDate: string;
};

export type PrimeiroAcessoResult =
  | { ok: true }
  | { ok: false; message: string };

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  const today = new Date();
  return parsed <= today;
}

export function validatePrimeiroAcesso(input: PrimeiroAcessoInput): PrimeiroAcessoResult {
  const email = input.email.trim();
  const password = input.password;
  const fullName = input.fullName.trim();
  const birthDate = input.birthDate.trim();

  if (!email) {
    return { ok: false, message: PORTAL_COPY.onboardingEmailRequired };
  }

  if (!isValidEmail(email)) {
    return { ok: false, message: PORTAL_COPY.onboardingEmailInvalid };
  }

  if (password.length < ONBOARDING_PASSWORD_MIN) {
    return { ok: false, message: PORTAL_COPY.onboardingPasswordMin };
  }

  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { ok: false, message: "Use senha com letras e números (mínimo 8 caracteres)." };
  }

  if (!fullName) {
    return { ok: false, message: PORTAL_COPY.onboardingFullNameRequired };
  }

  if (!isValidBirthDate(birthDate)) {
    return { ok: false, message: PORTAL_COPY.onboardingBirthInvalid };
  }

  return { ok: true };
}
