import { PORTAL_COPY } from "@/lib/portal-copy";

export const ONBOARDING_PASSWORD_MIN = 8;

export type PrimeiroAcessoInput = {
  email: string;
  password: string;
  fullName: string;
};

export type PrimeiroAcessoResult =
  | { ok: true }
  | { ok: false; message: string };

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validatePrimeiroAcesso(input: PrimeiroAcessoInput): PrimeiroAcessoResult {
  const email = input.email.trim();
  const password = input.password;
  const fullName = input.fullName.trim();

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

  return { ok: true };
}
