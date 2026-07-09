/**
 * Carrega .env.local com suporte a aspas (formato Vercel).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function stripEnvValue(raw) {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function loadEnvLocal(cwd = process.cwd()) {
  const envPath = resolve(cwd, ".env.local");
  if (!existsSync(envPath)) {
    throw new Error(`load-env-local: .env.local não existe em ${cwd}`);
  }

  const raw = readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = stripEnvValue(trimmed.slice(idx + 1));
    if (key) env[key] = value;
  }
  return env;
}

export function requireSupabasePublicEnv(env = loadEnvLocal()) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw new Error("load-env-local: NEXT_PUBLIC_SUPABASE_URL/ANON_KEY ausentes");
  }
  return { url, anonKey };
}
