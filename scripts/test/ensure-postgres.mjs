/**
 * Sobe Postgres de teste: tenta Docker; se indisponivel, usa instancia local em TEST_DATABASE_URL.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { assertSafeTestDatabaseUrl } from "./safe-test-db.mjs";

const DOCKER_BIN = "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe";
const COMPOSE_FILE = "docker-compose.test.yml";

function loadEnvTest() {
  const envPath = resolve(process.cwd(), ".env.test");
  if (!existsSync(envPath)) {
    throw new Error(".env.test nao encontrado.");
  }

  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
}

function assertSafeTestUrl(rawUrl) {
  process.env.NODE_ENV = "test";
  return assertSafeTestDatabaseUrl(rawUrl);
}

async function canConnect(connectionString) {
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

function runDockerComposeUp() {
  const docker = existsSync(DOCKER_BIN) ? DOCKER_BIN : "docker";
  const result = spawnSync(
    docker,
    ["compose", "-f", COMPOSE_FILE, "up", "-d", "--wait"],
    { stdio: "inherit", shell: false, env: process.env },
  );
  return result.status === 0;
}

loadEnvTest();
const connectionString = assertSafeTestUrl(process.env.TEST_DATABASE_URL?.trim() ?? "");

if (await canConnect(connectionString)) {
  console.log("Postgres de teste ja disponivel:", new URL(connectionString).pathname.slice(1));
  process.exit(0);
}

console.log("Postgres de teste indisponivel — tentando Docker Compose...");
if (process.env.DOCKER_TEST === "1") {
  console.error("DOCKER_TEST=1: postgres-test deve estar saudavel no compose.");
  process.exit(1);
}
if (runDockerComposeUp()) {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    if (await canConnect(connectionString)) {
      console.log("Postgres de teste pronto via Docker.");
      process.exit(0);
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
}

console.error(`
Nao foi possivel subir o banco de testes isolado.

Opcoes:
  1. Inicie o Docker Desktop (requer WSL2) e rode: npm run test:backend
  2. Instale PostgreSQL local e crie o database meccafit_test na porta 55432
  3. Ajuste TEST_DATABASE_URL em .env.test para um Postgres local com 'test' no nome

URL esperada: ${connectionString}
`);
process.exit(1);
