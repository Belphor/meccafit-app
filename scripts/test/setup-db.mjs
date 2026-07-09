import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { assertSafeTestDatabaseUrl } from "./safe-test-db.mjs";

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
process.env.NODE_ENV = "test";
const connectionString = assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL);
const client = await connectWithRetry(connectionString);

try {
  await resetDatabase(client);
  console.log("Banco de testes recriado com seguranca:", new URL(connectionString).pathname.slice(1));
} finally {
  await client.end();
}
