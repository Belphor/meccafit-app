import { spawn } from "node:child_process";
import { resolve } from "node:path";

export const DEFAULT_APP_URL = process.env.ARGOS_APP_URL?.trim() || "http://127.0.0.1:3000";

/** @type {import("node:child_process").ChildProcess | null} */
let managedProcess = null;
let managedByUs = false;

function normalizeAppUrl(appUrl) {
  return appUrl.replace(/\/$/, "");
}

/**
 * @param {string} appUrl
 * @param {number} [timeoutMs]
 */
export async function pingAppServer(appUrl, timeoutMs = 4000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`${normalizeAppUrl(appUrl)}/`, {
      redirect: "manual",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response.status === 200 || response.status === 307 || response.status === 308;
  } catch {
    return false;
  }
}

/**
 * @param {string} appUrl
 * @param {{ maxWaitMs?: number, intervalMs?: number }} [options]
 */
export async function waitForAppServer(appUrl, options = {}) {
  const maxWaitMs = options.maxWaitMs ?? 180_000;
  const intervalMs = options.intervalMs ?? 1500;
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    if (await pingAppServer(appUrl)) {
      return true;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, intervalMs));
  }

  return false;
}

function killManagedProcess() {
  if (!managedProcess || managedProcess.killed) {
    managedProcess = null;
    managedByUs = false;
    return;
  }

  const pid = managedProcess.pid;
  if (process.platform === "win32" && pid) {
    spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    managedProcess.kill("SIGTERM");
  }

  managedProcess = null;
  managedByUs = false;
}

/**
 * Garante Next.js disponível para probes de rota/BFF.
 * Respeita ARGOS_SKIP_APP_BOOT=1 para falhar cedo sem spawn.
 *
 * @param {string} [appUrl]
 */
export async function ensureAppServer(appUrl = DEFAULT_APP_URL) {
  if (await pingAppServer(appUrl)) {
    return { appUrl: normalizeAppUrl(appUrl), started: false };
  }

  if (process.env.ARGOS_SKIP_APP_BOOT === "1") {
    throw new Error(`App indisponível em ${appUrl} (ARGOS_SKIP_APP_BOOT=1)`);
  }

  if (managedProcess && !managedProcess.killed) {
    const ready = await waitForAppServer(appUrl, { maxWaitMs: 60_000 });
    if (ready) {
      return { appUrl: normalizeAppUrl(appUrl), started: true };
    }
    killManagedProcess();
  }

  const nextBin = resolve(process.cwd(), "node_modules/next/dist/bin/next");
  managedProcess = spawn(process.execPath, [nextBin, "dev", "-p", "3000"], {
    cwd: process.cwd(),
    stdio: "ignore",
    env: { ...process.env, PORT: "3000" },
  });
  managedByUs = true;

  managedProcess.on("exit", () => {
    managedProcess = null;
    managedByUs = false;
  });

  const ready = await waitForAppServer(appUrl);
  if (!ready) {
    killManagedProcess();
    throw new Error(`Timeout aguardando Next.js em ${appUrl}`);
  }

  return { appUrl: normalizeAppUrl(appUrl), started: true };
}

export async function stopManagedAppServer() {
  if (managedByUs) {
    killManagedProcess();
  }
}

process.on("exit", () => {
  killManagedProcess();
});

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    killManagedProcess();
    process.exit(signal === "SIGINT" ? 130 : 143);
  });
});
