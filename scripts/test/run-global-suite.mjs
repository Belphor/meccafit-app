/**
 * Bateria global Meccafit — lint, unit, backend, E2E, ARGOS e stress opcional.
 *
 * Uso:
 *   node scripts/test/run-global-suite.mjs
 *   node scripts/test/run-global-suite.mjs --fast
 *   node scripts/test/run-global-suite.mjs --include-stress
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pingAppServer } from "../lib/argos-app-server.mjs";

const args = new Set(process.argv.slice(2));
const includeStress = args.has("--include-stress");
const fastOnly = args.has("--fast");
const integrationOnly = args.has("--integration-only");
const skipArgos = fastOnly || args.has("--skip-argos");
const skipE2e = fastOnly || args.has("--skip-e2e");
const skipBackend = integrationOnly || args.has("--skip-backend");

const appUrl = process.env.ARGOS_APP_URL?.trim() || "http://127.0.0.1:3000";
const hasEnvLocal = existsSync(resolve(process.cwd(), ".env.local"));
const startedSteps = [];
let qaAppStartedBySuite = false;

function logStep(name) {
  console.log(`\n${"=".repeat(72)}\n▶ ${name}\n${"=".repeat(72)}`);
}

function runStep(name, command, options = {}) {
  logStep(name);
  startedSteps.push(name);

  const result = spawnSync(command, {
    shell: true,
    stdio: "inherit",
    env: { ...process.env, ...options.env },
  });

  if (result.status !== 0) {
    if (options.optional) {
      console.warn(`⚠ Etapa opcional falhou: ${name}`);
      return false;
    }
    console.error(`✗ Falhou: ${name}`);
    cleanup();
    process.exit(result.status ?? 1);
  }

  console.log(`✓ OK: ${name}`);
  return true;
}

async function ensureQaApp() {
  if (process.env.ARGOS_SKIP_APP_BOOT === "1") {
    runStep("Aguardar app de QA", "node scripts/test/wait-for-services.mjs --skip-postgres");
    return;
  }

  if (await pingAppServer(appUrl)) {
    console.log(`App já disponível em ${appUrl}`);
    return;
  }

  if (process.env.DOCKER_TEST === "1") {
    runStep("Aguardar app de QA", "node scripts/test/wait-for-services.mjs --skip-postgres");
    return;
  }

  runStep("Subir app de QA (build + start)", "node scripts/test/start-qa-app.mjs start");
  qaAppStartedBySuite = true;
}

function cleanup() {
  if (!qaAppStartedBySuite) {
    return;
  }

  spawnSync("node scripts/test/start-qa-app.mjs stop", {
    shell: true,
    stdio: "ignore",
  });
  qaAppStartedBySuite = false;
}

process.on("exit", cleanup);
["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    cleanup();
    process.exit(signal === "SIGINT" ? 130 : 143);
  });
});

async function main() {
  console.log("Meccafit — bateria global de qualidade");
  console.log(`Modo: ${integrationOnly ? "integration" : fastOnly ? "fast" : includeStress ? "full+stress" : "full"}`);

  if (!integrationOnly) {
    runStep("ESLint", "npm run lint");
    if (fastOnly || skipArgos) {
      runStep("ARGOS unit smoke", "npm run argos:unit");
    }
    runStep("Jest unitário", "npm run test:unit");
  }

  if (!skipBackend && !integrationOnly) {
    if (process.env.DOCKER_TEST !== "1") {
      runStep("Postgres de testes", "npm run db:test:up");
    } else {
      runStep(
        "Aguardar Postgres de testes",
        "node scripts/test/wait-for-services.mjs --skip-app",
        { env: { NODE_ENV: "test" } },
      );
    }

    runStep("Setup banco backend", "npm run test:backend:setup", { env: { NODE_ENV: "test" } });
    runStep(
      "Jest backend",
      'npx jest --runInBand --testMatch "**/tests/backend/**/*.spec.ts"',
      { env: { NODE_ENV: "test" } },
    );
  }

  const needsRemoteSupabase = !skipArgos || !skipE2e;
  if (needsRemoteSupabase && !hasEnvLocal) {
    console.warn("⚠ .env.local ausente — pulando E2E e ARGOS (requer Supabase).");
  } else if (needsRemoteSupabase) {
    runStep("Validar .env.local", "node scripts/ci/validate-env-local.mjs", {
      optional: process.env.CI !== "true",
    });
  }

  if (!skipE2e && hasEnvLocal) {
    await ensureQaApp();
    runStep("Playwright E2E", "npx playwright test", {
      env: {
        PLAYWRIGHT_SKIP_WEBSERVER: "1",
        PLAYWRIGHT_BASE_URL: appUrl,
      },
    });
  }

  if (!skipArgos && hasEnvLocal) {
    await ensureQaApp();
    runStep("Seed usuários de teste", "npm run seed:test-users", { optional: true });
    runStep("Seed planilhas ARGOS", "npm run argos:seed-planilhas", { optional: true });
    runStep("ARGOS security suite", "npm run argos:test", {
      env: {
        ARGOS_SKIP_APP_BOOT: "1",
        ARGOS_APP_URL: appUrl,
      },
    });
    runStep("ARGOS VIP forjador admin", "npm run argos:vip-admin", { optional: true });
    runStep("ARGOS latency probe", `node scripts/argos/latency-probe.mjs --app-url ${appUrl}`, {
      optional: true,
    });
    runStep("ARGOS PLUTUS monitor", "npm run argos:plutus", { optional: true });
  }

  if (includeStress && hasEnvLocal) {
    await ensureQaApp();
    runStep("ARGOS load 200 VUs", "npm run argos:load:200:local", {
      env: { ARGOS_APP_URL: appUrl },
      optional: true,
    });
    runStep("ARGOS app stress", "npm run argos:app:stress", {
      env: { ARGOS_APP_URL: appUrl },
      optional: true,
    });
  }

  cleanup();
  console.log(`\n✓ Bateria global concluída (${startedSteps.length} etapas).`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  cleanup();
  process.exit(1);
});
