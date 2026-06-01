import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Carrega variáveis de .env.local (scripts Node — sem dependência extra).
 */
export function loadEnvLocal(cwd = process.cwd()) {
  const envPath = resolve(cwd, ".env.local");
  const raw = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

export function requireEnv(env, keys) {
  const missing = keys.filter((key) => !env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Variáveis ausentes em .env.local: ${missing.join(", ")}`);
  }
}
