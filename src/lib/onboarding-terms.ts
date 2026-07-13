/** Metadado de aceite único das diretrizes — gate pós-login antes do altar.
 *  Logo + manifesto repetem a cada login; as diretrizes só na 1ª vez. */
export const HAS_ACCEPTED_TERMS_KEY = "has_accepted_terms" as const;

export const ONBOARDING_ROUTE = "/dashboard/onboarding" as const;

export function hasAcceptedTerms(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  return metadata[HAS_ACCEPTED_TERMS_KEY] === true;
}

export function isOnboardingPath(pathname: string): boolean {
  return (
    pathname === ONBOARDING_ROUTE || pathname.startsWith(`${ONBOARDING_ROUTE}/`)
  );
}
