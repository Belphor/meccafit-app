/**
 * Validação compartilhada de TEST_DATABASE_URL (host local ou rede Docker de QA).
 */

const DEFAULT_SAFE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function parseAllowedHosts() {
  const extra =
    process.env.TEST_DB_ALLOWED_HOSTS?.split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean) ?? [];

  const dockerHosts = process.env.DOCKER_TEST === "1" ? ["postgres-test"] : [];

  return new Set([...DEFAULT_SAFE_HOSTS, ...extra, ...dockerHosts]);
}

export function assertSafeTestDatabaseUrl(rawUrl) {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Recusado: NODE_ENV precisa ser exatamente 'test'.");
  }

  const trimmed = rawUrl?.trim();
  if (!trimmed) {
    throw new Error("Recusado: TEST_DATABASE_URL ausente.");
  }

  const url = new URL(trimmed);
  const databaseName = url.pathname.replace(/^\//, "");
  const host = url.hostname.toLowerCase();
  const safeHosts = parseAllowedHosts();

  if (!safeHosts.has(host)) {
    throw new Error(
      `Recusado: host de banco inseguro para testes (${url.hostname}). Permitidos: ${[...safeHosts].join(", ")}`,
    );
  }

  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error(`Recusado: o database precisa conter 'test' no nome (${databaseName}).`);
  }

  if (trimmed.includes("supabase.co") || trimmed.includes("pooler.supabase.com")) {
    throw new Error("Recusado: testes nunca podem apontar para Supabase remoto.");
  }

  return trimmed;
}
