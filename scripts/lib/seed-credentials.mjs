/**
 * Senha dos usuários de seed/ARGOS — nunca hardcode em produção.
 * CI: defina ARGOS_SEED_PASSWORD nos secrets.
 */
const DEV_FALLBACK_PASSWORD = "senha123";

export function resolveSeedPassword() {
  const fromEnv = process.env.ARGOS_SEED_PASSWORD?.trim();
  if (fromEnv) return fromEnv;

  if (process.env.CI === "true") {
    console.warn(
      "seed-credentials: ARGOS_SEED_PASSWORD ausente no CI — usando fallback de teste.",
    );
  }

  return DEV_FALLBACK_PASSWORD;
}
