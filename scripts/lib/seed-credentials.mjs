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

/**
 * Impede seed acidental de contas de teste no Supabase de produção (CI/push).
 * Só libera com ALLOW_SEED_TEST_USERS=1.
 */
export function assertAllowSeedTestUsers(scriptName = "seed") {
  if (process.env.ALLOW_SEED_TEST_USERS === "1") return;
  console.error(
    `${scriptName} BLOQUEADO: defina ALLOW_SEED_TEST_USERS=1 para criar contas de teste.\n` +
      "Motivo: evitar recriar usuários ARGOS no Supabase de produção.",
  );
  process.exit(1);
}
