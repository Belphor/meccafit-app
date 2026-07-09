/**
 * Aguarda Postgres de testes e/ou app Next.js antes da bateria global.
 */
import pg from "pg";
import { pingAppServer } from "../lib/argos-app-server.mjs";
import { assertSafeTestDatabaseUrl } from "./safe-test-db.mjs";

const args = new Set(process.argv.slice(2));
const waitPostgres = !args.has("--skip-postgres");
const waitApp = !args.has("--skip-app");

async function waitForPostgres(connectionString, maxAttempts = 60) {
  assertSafeTestDatabaseUrl(connectionString);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const client = new pg.Client({ connectionString });
    try {
      await client.connect();
      await client.query("SELECT 1");
      console.log(`Postgres pronto (tentativa ${attempt}).`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      await client.end().catch(() => {});
    }
  }

  throw new Error(`Timeout aguardando Postgres: ${new URL(connectionString).hostname}`);
}

async function waitForApp(appUrl, maxWaitMs = 180_000) {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    if (await pingAppServer(appUrl, 5000)) {
      console.log(`App pronto em ${appUrl}`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  throw new Error(`Timeout aguardando app em ${appUrl}`);
}

async function main() {
  if (waitPostgres) {
    const connectionString = process.env.TEST_DATABASE_URL?.trim();
    if (!connectionString) {
      throw new Error("TEST_DATABASE_URL ausente para wait-for-services.");
    }
    process.env.NODE_ENV = "test";
    await waitForPostgres(connectionString);
  }

  if (waitApp) {
    const appUrl = process.env.ARGOS_APP_URL?.trim() || "http://127.0.0.1:3000";
    await waitForApp(appUrl);
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
