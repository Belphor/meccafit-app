/**
 * Build + start do Next.js para baterias ARGOS/E2E (espelha o fluxo do CI).
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEFAULT_APP_URL,
  pingAppServer,
  waitForAppServer,
} from "../lib/argos-app-server.mjs";

const appUrl = process.env.ARGOS_APP_URL?.trim() || DEFAULT_APP_URL;
const pidFile = resolve(process.cwd(), ".qa-app.pid");

function savePid(pid) {
  writeFileSync(pidFile, String(pid), "utf8");
}

function readPid() {
  if (!existsSync(pidFile)) return null;
  const raw = readFileSync(pidFile, "utf8").trim();
  return raw ? Number(raw) : null;
}

async function startProductionApp() {
  const build = spawnSync("npm run build", {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }

  const child = spawn("npm run start", {
    stdio: "ignore",
    shell: true,
    env: process.env,
    detached: true,
  });

  if (child.pid) {
    savePid(child.pid);
  }

  child.unref();

  const ready = await waitForAppServer(appUrl);
  if (!ready) {
    console.error(`Falha ao subir app de QA em ${appUrl}`);
    process.exit(1);
  }

  console.log(`App de QA disponível em ${appUrl}`);
}

async function main() {
  const mode = process.argv[2] ?? "start";

  if (mode === "stop") {
    const pid = readPid();
    if (!pid) {
      process.exit(0);
    }
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(pid, "SIGTERM");
    }
    process.exit(0);
  }

  if (await pingAppServer(appUrl)) {
    console.log(`App já disponível em ${appUrl}`);
    return;
  }

  await startProductionApp();

  if (mode === "foreground") {
    await new Promise(() => {});
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
