import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const SAFE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function loadEnvTest(cwd = process.cwd()) {
  const envPath = resolve(cwd, ".env.test");
  if (!existsSync(envPath)) {
    throw new Error(".env.test nao encontrado. Crie o arquivo antes de rodar testes de backend.");
  }

  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    process.env[key] = value;
  }
}

function requireSafeTestDatabaseUrl() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Recusado: NODE_ENV precisa ser exatamente 'test'.");
  }

  const rawUrl = process.env.TEST_DATABASE_URL?.trim();
  if (!rawUrl) {
    throw new Error("Recusado: TEST_DATABASE_URL ausente.");
  }

  const url = new URL(rawUrl);
  const databaseName = url.pathname.replace(/^\//, "");
  const host = url.hostname.toLowerCase();

  if (!SAFE_HOSTS.has(host)) {
    throw new Error(`Recusado: host de banco inseguro para testes (${url.hostname}).`);
  }

  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error(`Recusado: o database precisa conter 'test' no nome (${databaseName}).`);
  }

  if (rawUrl.includes("supabase.co") || rawUrl.includes("pooler.supabase.com")) {
    throw new Error("Recusado: testes nunca podem apontar para Supabase remoto.");
  }

  return rawUrl;
}

async function connectWithRetry(connectionString) {
  let lastError;

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const client = new pg.Client({ connectionString });
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => {});
      await new Promise((resolveRetry) => setTimeout(resolveRetry, 500));
    }
  }

  throw lastError;
}

async function resetDatabase(client) {
  await client.query(`
    DROP SCHEMA IF EXISTS public CASCADE;
    DROP SCHEMA IF EXISTS auth CASCADE;
    CREATE SCHEMA public;
    CREATE SCHEMA auth;
    GRANT USAGE ON SCHEMA public TO PUBLIC;
  `);

  await client.query(`
    DO $$
    BEGIN
      CREATE ROLE anon NOLOGIN;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END
    $$;

    DO $$
    BEGIN
      CREATE ROLE authenticated NOLOGIN;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END
    $$;
  `);
}

loadEnvTest();
const connectionString = requireSafeTestDatabaseUrl();
const client = await connectWithRetry(connectionString);

try {
  await resetDatabase(client);
  console.log("Banco de testes recriado com seguranca:", new URL(connectionString).pathname.slice(1));
} finally {
  await client.end();
}
